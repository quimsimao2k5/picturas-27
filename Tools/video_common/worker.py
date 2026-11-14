"""RabbitMQ worker shared by the PictuRAS video services.

Each video service (effects, subtitles, frames) consumes its own queue and
processes one *stage* of a video pipeline per message. The projects
orchestrator splits the pipeline into stages and sends the next stage when the
previous one replies on project_queue, as it already does for image tools.
Progress is sent straight to the WebSocket gateway (ws_queue), as a percentage
of the whole pipeline.

Unlike the image tools, the message is only acknowledged after the job ends:
if the worker dies midway, RabbitMQ redelivers it. On SIGTERM (the autoscaler
removing a replica) the worker stops after the current job, or right away
when idle.
"""
import datetime
import json
import signal
import time
import uuid

import pika
import pytz
from pika.exchange_type import ExchangeType

import utils.env as env
from video_common.media import InvalidVideo, stage_progress

EXCHANGE = "picturas"
PROJECT_QUEUE = "project_queue"
WS_QUEUE = "ws_queue"

# Error codes kept from the single video worker
CODES = {
    "wrong_procedure": 2000,
    "error_processing": 2001,
    "unsupported_effect": 2002,
    "invalid_trim": 2003,
    "invalid_video": 2004,
    "invalid_speed": 2005,
}


def now():
    return datetime.datetime.now(pytz.utc)


class StageWorker:
    """Consumes `queue` and runs `run_stage(params, progress_cb)` for each message.

    `run_stage` returns the result dict (video characteristics, `frames`, and
    `output_type`/`output_path` when the output is not a plain video).
    `error_codes` maps service exceptions to the error codes above; anything
    else is reported as `error_processing`.
    """

    def __init__(self, queue, procedure, microservice, run_stage, error_codes=()):
        self.video_queue = queue
        self.procedure = procedure
        self.microservice = microservice
        self.run_stage = run_stage
        self.error_codes = list(error_codes) + [(InvalidVideo, CODES["invalid_video"])]
        self._busy = False
        self._stopping = False
        self._connection = None
        self._channel = None

    # ---- RabbitMQ -------------------------------------------------------

    def _connect(self):
        credentials = pika.PlainCredentials(env.RABBITMQ_USERNAME, env.RABBITMQ_PASSWORD)
        params = pika.ConnectionParameters(
            env.RABBITMQ_HOST, int(env.RABBITMQ_PORT), "/", credentials,
            # processing a video blocks this thread for minutes; without a
            # heartbeat the broker does not drop the connection midway
            heartbeat=0,
        )
        for _ in range(30):
            try:
                return pika.BlockingConnection(params)
            except pika.exceptions.AMQPConnectionError:
                time.sleep(2)
        raise RuntimeError("Could not connect to RabbitMQ")

    def _open(self):
        self._connection = self._connect()
        self._channel = self._connection.channel()
        self._channel.exchange_declare(exchange=EXCHANGE,
                                       exchange_type=ExchangeType.direct, durable=True)
        self._channel.queue_declare(queue=self.video_queue, durable=True)
        self._channel.queue_bind(queue=self.video_queue, exchange=EXCHANGE, routing_key=self.video_queue)
        # one stage at a time per replica; parallelism comes from replicas
        self._channel.basic_qos(prefetch_count=1)

    def _publish(self, queue, msg):
        self._channel.basic_publish(exchange=EXCHANGE, routing_key=queue,
                                    body=json.dumps(msg))

    # ---- replies (same format as the single video worker) -----------------

    def success_reply(self, msg_id, started, output_uri, video_info):
        output = {"type": video_info.get("output_type", "video"),
                  "imageURI": video_info.get("output_path", output_uri)}
        if output["type"] == "frames":
            output["frames"] = video_info["frames"]
        return {
            "messageId": f"video-{uuid.uuid4()}",
            "correlationId": msg_id,
            "timestamp": now().isoformat(),
            "status": "success",
            "output": output,
            "metadata": {
                "processingTime": (now() - started).total_seconds() * 1000,
                "microservice": self.microservice,
                "video": video_info,
            },
        }

    def error_reply(self, msg_id, started, code, message, input_uri):
        return {
            "messageId": f"video-{uuid.uuid4()}",
            "correlationId": msg_id,
            "timestamp": now().isoformat(),
            "status": "error",
            "error": {
                "code": code,
                "message": message,
                "msg": message,  # the orchestrator reads error.msg
                "details": {"inputFileURI": input_uri},
            },
            "metadata": {
                "processingTime": (now() - started).total_seconds() * 1000,
                "microservice": self.microservice,
            },
        }

    def progress_event(self, progress, preview, percent):
        return {
            "messageId": f"update-client-video-progress-{uuid.uuid4()}",
            "timestamp": now().isoformat(),
            "status": "success",
            "user": progress["user"],
            "projectId": progress.get("projectId"),
            "imgId": progress.get("imgId"),
            "preview": bool(preview),
            "percent": percent,
        }

    def _progress(self, progress, preview, percent):
        if not progress or not progress.get("user"):
            return
        self._publish(WS_QUEUE, self.progress_event(progress, preview, percent))

    def code_for(self, error):
        for kind, code in self.error_codes:
            if isinstance(error, kind):
                return code
        return CODES["error_processing"]

    # ---- one message ------------------------------------------------------

    def handle(self, body):
        """Processes one message; returns the reply for project_queue (or None)."""
        started = now()
        try:
            info = json.loads(body.decode())
            msg_id = info["messageId"]
            params = info["parameters"]
            input_uri = params["inputImageURI"]
            output_uri = params["outputImageURI"]
            tools = params.get("tools") or []
            preview = bool(params.get("preview"))
            progress = params.get("progress") or {}
            stage = int(params.get("stage", 0))
            stages = int(params.get("stages", 1))
        except (ValueError, KeyError, TypeError) as e:
            print(f"[video] invalid message discarded: {e}", flush=True)
            return None

        print(f"[video] msg={msg_id} preview={preview} tools={[t.get('procedure') for t in tools]}",
              flush=True)

        if info.get("procedure") != self.procedure:
            return self.error_reply(msg_id, started, CODES["wrong_procedure"],
                                    "The procedure received does not fit into this tool", input_uri)
        report = stage_progress(stage, stages, lambda pct: self._progress(progress, preview, pct))
        try:
            if stage > 0:
                report(0)
            result = self.run_stage(params, report)
        except Exception as e:  # noqa: BLE001 - every failure is reported
            return self.error_reply(msg_id, started, self.code_for(e), str(e), input_uri)
        print(f"[video] msg={msg_id} ok frames={result['frames']} "
              f"t={(now() - started).total_seconds():.1f}s", flush=True)
        return self.success_reply(msg_id, started, output_uri, result)

    def callback(self, ch, method, properties, body):
        self._busy = True
        try:
            reply = self.handle(body)
            if reply is not None:
                self._publish(PROJECT_QUEUE, reply)
            # manual ack only at the end
            ch.basic_ack(delivery_tag=method.delivery_tag)
        finally:
            self._busy = False
        if self._stopping:
            ch.stop_consuming()

    # ---- graceful stop (autoscaler scale-down) -----------------------------

    def _on_sigterm(self, *_):
        self._stopping = True
        if not self._busy and self._channel is not None:
            # idle: stop now; a message in progress is acked by callback first
            self._connection.add_callback_threadsafe(self._channel.stop_consuming)

    def run(self):
        signal.signal(signal.SIGTERM, self._on_sigterm)
        self._open()
        self._channel.basic_consume(queue=self.video_queue, on_message_callback=self.callback,
                                    auto_ack=False)
        print(f"[video] waiting for jobs on {self.video_queue}", flush=True)
        self._channel.start_consuming()
        try:
            self._connection.close()
        except Exception:  # noqa: BLE001 - already closing
            pass
        print("[video] stopped", flush=True)
