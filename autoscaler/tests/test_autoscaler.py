"""Scaling rules and replica bookkeeping, with fake RabbitMQ and Docker."""
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import autoscaler  # noqa: E402
from autoscaler import Rule, clone_settings, load_rules, pick_to_remove, step  # noqa: E402


def rule(minimum=1, maximum=3):
    return Rule("video_effects", "video_effects_queue", minimum, maximum, 1, 30)


def test_one_replica_per_message_within_limits():
    r = rule()
    assert [r.target(m) for m in (0, 1, 2, 3, 9)] == [1, 1, 2, 3, 3]


def test_scales_up_at_once_and_down_only_after_the_quiet_period():
    r = rule()
    assert r.decide(5, 1, now=0) == 3
    assert r.decide(0, 3, now=10) == 3      # below, but only just
    assert r.decide(0, 3, now=39) == 3
    assert r.decide(0, 3, now=40) == 1      # 30 s below the current replicas
    r = rule()
    assert r.decide(0, 3, now=0) == 3
    assert r.decide(3, 3, now=20) == 3      # load came back: the wait restarts
    assert r.decide(0, 3, now=40) == 3
    assert r.decide(0, 3, now=70) == 1


def test_minimum_is_restored():
    assert rule(minimum=1).decide(0, 0, now=0) == 1


def test_limits_come_from_the_environment():
    rules = load_rules({"VIDEO_SUBTITLES_MAX_REPLICAS": "4", "SCALE_DOWN_AFTER_S": "60",
                        "AUTOSCALE_SERVICES": "video_effects,video_subtitles"})
    assert [(r.service, r.queue, r.minimum, r.maximum, r.down_after_s) for r in rules] == [
        ("video_effects", "video_effects_queue", 1, 3, 60),
        ("video_subtitles", "video_subtitles_queue", 1, 4, 60),
    ]
    assert [r.maximum for r in load_rules({})] == [3, 2, 2]


def test_clone_keeps_compose_labels_volumes_and_limits():
    attrs = {
        "Config": {"Image": "picturas-video_subtitles", "Cmd": ["python", "-u", "subtitles_service.py"],
                   "Entrypoint": None, "Env": ["WHISPER_MODEL=small"], "WorkingDir": "/app",
                   "Labels": {"com.docker.compose.project": "picturas",
                              "com.docker.compose.service": "video_subtitles",
                              "com.docker.compose.container-number": "1"}},
        "HostConfig": {"Memory": 3221225472, "RestartPolicy": {"Name": "on-failure"}},
        "Mounts": [{"Type": "volume", "Name": "picturas_image_data", "Destination": "/app/images", "RW": True},
                   {"Type": "volume", "Name": "picturas_whisper_models", "Destination": "/models/whisper", "RW": True}],
        "NetworkSettings": {"Networks": {"picturas_elk": {}}},
    }
    s = clone_settings(attrs, "picturas", "video_subtitles", 2)
    assert s["name"] == "picturas-video_subtitles-2"
    assert s["labels"]["com.docker.compose.service"] == "video_subtitles"
    assert s["labels"]["com.docker.compose.container-number"] == "2"
    assert s["labels"]["picturas.autoscaler.clone"] == "true"
    assert s["volumes"]["picturas_whisper_models"] == {"bind": "/models/whisper", "mode": "rw"}
    assert s["mem_limit"] == 3221225472 and s["network"] == "picturas_elk"
    assert attrs["Config"]["Labels"]["com.docker.compose.container-number"] == "1"


def container(number, ip):
    return SimpleNamespace(labels={"com.docker.compose.container-number": str(number)},
                           attrs={"NetworkSettings": {"Networks": {"elk": {"IPAddress": ip}}}})


def test_idle_clones_are_removed_first():
    clones = [container(2, "10.0.0.2"), container(3, "10.0.0.3"), container(4, "10.0.0.4")]
    chosen = pick_to_remove(clones, {"10.0.0.4": 1, "10.0.0.2": 0}, 2)
    assert [c.labels["com.docker.compose.container-number"] for c in chosen] == ["3", "2"]


class FakeRabbit:
    def __init__(self, sizes):
        self.sizes = sizes

    def messages(self, queue):
        return self.sizes[queue]

    def unacked_by_host(self):
        return {}


class FakeEngine:
    def __init__(self, replicas):
        self.counts = dict(replicas)
        self.actions = []

    def replicas(self, service):
        return [None] * self.counts[service]

    def scale_up(self, service, count):
        self.actions.append(("up", service, count))
        self.counts[service] += count

    def scale_down(self, service, count, busy):
        self.actions.append(("down", service, count))
        self.counts[service] -= count


def test_step_scales_each_service_from_its_own_queue(capsys):
    rules = load_rules({})
    rabbit = FakeRabbit({"video_effects_queue": 8, "video_subtitles_queue": 1, "video_frames_queue": 0})
    engine = FakeEngine({"video_effects": 1, "video_subtitles": 1, "video_frames": 1})
    step(rules, rabbit, engine, now=0)
    assert engine.actions == [("up", "video_effects", 2)]
    assert "video_effects: queue=video_effects_queue messages=8 replicas 1 -> 3" in capsys.readouterr().out
    rabbit.sizes["video_effects_queue"] = 0
    step(rules, rabbit, engine, now=10)
    step(rules, rabbit, engine, now=41)
    assert engine.actions[-1] == ("down", "video_effects", 2)
