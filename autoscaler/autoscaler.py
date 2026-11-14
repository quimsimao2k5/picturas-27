"""PictuRAS autoscaler for the video services.

Every POLL_INTERVAL_S seconds it reads, in the RabbitMQ management API, how
many messages each video queue holds (waiting + being processed) and sets the
replicas of the service that consumes it:

    desired = clamp(ceil(messages / MESSAGES_PER_REPLICA), min, max)

It scales up as soon as desired > current, and scales down only after the
queue has stayed below the current replicas for SCALE_DOWN_AFTER_S seconds,
so it does not oscillate.

Replicas are created and removed through the Docker API (docker.sock). A new
replica is a clone of the service's Compose container, with the same Compose
labels, so it shows up as a replica of the service (Docker Desktop,
`docker compose ps`) and `docker compose down` removes it. Only clones made by
the autoscaler are removed, idle ones first; a replica is stopped with
SIGTERM and given STOP_TIMEOUT_S to finish its current job (messages are
acknowledged at the end, so an interrupted job goes back to the queue).

The autoscaler only touches containers of COMPOSE_PROJECT whose Compose
service is one of AUTOSCALE_SERVICES.
"""
import math
import os
import threading
import time

import docker
import requests

PROJECT_LABEL = "com.docker.compose.project"
SERVICE_LABEL = "com.docker.compose.service"
NUMBER_LABEL = "com.docker.compose.container-number"
CLONE_LABEL = "picturas.autoscaler.clone"

# replicas per service when the environment does not set them
DEFAULT_LIMITS = {"video_effects": (1, 3), "video_subtitles": (1, 2), "video_frames": (1, 2)}


def log(text):
    print(f"[autoscaler] {text}", flush=True)


def env_number(env, name, default, kind=int):
    try:
        return kind(env.get(name, default))
    except (TypeError, ValueError):
        return default


class Rule:
    """Replica limits and scaling state of one service."""

    def __init__(self, service, queue, minimum, maximum, per_replica, down_after_s):
        self.service = service
        self.queue = queue
        self.minimum = max(0, minimum)
        self.maximum = max(self.minimum, maximum)
        self.per_replica = max(1, per_replica)
        self.down_after_s = down_after_s
        self._low_since = None

    def target(self, messages):
        wanted = math.ceil(max(0, messages) / self.per_replica)
        return min(self.maximum, max(self.minimum, wanted))

    def decide(self, messages, current, now):
        """Replicas the service should have now."""
        target = self.target(messages)
        if target > current or current < self.minimum:
            self._low_since = None
            return max(target, self.minimum)
        if target < current:
            if self._low_since is None:
                self._low_since = now
            if now - self._low_since >= self.down_after_s:
                self._low_since = None
                return target
            return current
        self._low_since = None
        return current


def load_rules(env=os.environ):
    services = [s.strip() for s in env.get("AUTOSCALE_SERVICES",
                                           ",".join(DEFAULT_LIMITS)).split(",") if s.strip()]
    per_replica = env_number(env, "MESSAGES_PER_REPLICA", 1)
    down_after = env_number(env, "SCALE_DOWN_AFTER_S", 30, float)
    rules = []
    for service in services:
        prefix = service.upper()
        low, high = DEFAULT_LIMITS.get(service, (1, 1))
        rules.append(Rule(
            service,
            env.get(f"{prefix}_QUEUE", f"{service}_queue"),
            env_number(env, f"{prefix}_MIN_REPLICAS", low),
            env_number(env, f"{prefix}_MAX_REPLICAS", high),
            per_replica, down_after,
        ))
    return rules


class RabbitMQ:
    """Queue sizes and per-connection work in progress, from the management API."""

    def __init__(self, url, user, password):
        self.url = url.rstrip("/")
        self.auth = (user, password)

    def messages(self, queue):
        response = requests.get(f"{self.url}/api/queues/%2F/{queue}", auth=self.auth, timeout=5)
        response.raise_for_status()
        data = response.json()
        return int(data.get("messages_ready", 0)) + int(data.get("messages_unacknowledged", 0))

    def unacked_by_host(self):
        """Unacknowledged messages per client IP (a replica with 0 is idle)."""
        response = requests.get(f"{self.url}/api/channels", auth=self.auth, timeout=5)
        response.raise_for_status()
        busy = {}
        for channel in response.json():
            host = (channel.get("connection_details") or {}).get("peer_host")
            busy[host] = busy.get(host, 0) + int(channel.get("messages_unacknowledged", 0))
        return busy


def clone_settings(attrs, project, service, number):
    """Container settings of a new replica, copied from an existing one."""
    config, host = attrs["Config"], attrs["HostConfig"]
    labels = dict(config.get("Labels") or {})
    labels[NUMBER_LABEL] = str(number)
    labels[CLONE_LABEL] = "true"
    volumes = {}
    for mount in attrs.get("Mounts") or []:
        source = mount.get("Name") if mount.get("Type") == "volume" else mount.get("Source")
        if source:
            volumes[source] = {"bind": mount["Destination"], "mode": "rw" if mount.get("RW", True) else "ro"}
    networks = list((attrs.get("NetworkSettings") or {}).get("Networks") or {})
    return {
        "name": f"{project}-{service}-{number}",
        "image": config["Image"],
        "command": config.get("Cmd"),
        "entrypoint": config.get("Entrypoint"),
        "environment": config.get("Env"),
        "working_dir": config.get("WorkingDir") or None,
        "labels": labels,
        "volumes": volumes,
        "mem_limit": host.get("Memory") or None,
        "restart_policy": host.get("RestartPolicy") or None,
        "network": networks[0] if networks else None,
        "extra_networks": networks[1:],
    }


def pick_to_remove(clones, busy_by_host, count):
    """Clones to remove: idle ones first, then the most recent."""
    def key(container):
        ips = [n.get("IPAddress") for n in
               (container.attrs.get("NetworkSettings") or {}).get("Networks", {}).values()]
        busy = sum(busy_by_host.get(ip, 0) for ip in ips if ip)
        number = int(container.labels.get(NUMBER_LABEL, 0))
        return (busy > 0, -number)
    return sorted(clones, key=key)[:max(0, count)]


class Docker:
    def __init__(self, project, stop_timeout_s):
        self.client = docker.from_env()
        self.project = project
        self.stop_timeout_s = stop_timeout_s
        self._stopping = set()
        self._lock = threading.Lock()

    def _containers(self, service, all_states=False):
        return self.client.containers.list(all=all_states, filters={"label": [
            f"{PROJECT_LABEL}={self.project}", f"{SERVICE_LABEL}={service}"]})

    def replicas(self, service):
        with self._lock:
            return [c for c in self._containers(service) if c.id not in self._stopping]

    def scale_up(self, service, count):
        running = self.replicas(service)
        if not running:
            log(f"{service}: no running container to clone (is the Compose service up?)")
            return
        base = min(running, key=lambda c: int(c.labels.get(NUMBER_LABEL, 0)))
        base.reload()
        numbers = [int(c.labels.get(NUMBER_LABEL, 0)) for c in self._containers(service, True)]
        for i in range(count):
            settings = clone_settings(base.attrs, self.project, service, max(numbers) + 1 + i)
            extra = settings.pop("extra_networks")
            container = self.client.containers.create(**settings)
            for network in extra:
                self.client.networks.get(network).connect(container)
            container.start()
            log(f"{service}: started {settings['name']}")

    def scale_down(self, service, count, busy_by_host):
        clones = [c for c in self.replicas(service) if c.labels.get(CLONE_LABEL) == "true"]
        for container in pick_to_remove(clones, busy_by_host, count):
            with self._lock:
                self._stopping.add(container.id)
            threading.Thread(target=self._stop, args=(service, container), daemon=True).start()

    def _stop(self, service, container):
        try:
            container.stop(timeout=self.stop_timeout_s)  # SIGTERM, then SIGKILL at the timeout
            container.remove()
            log(f"{service}: removed {container.name}")
        except docker.errors.APIError as error:
            log(f"{service}: could not remove {container.name}: {error}")
        finally:
            with self._lock:
                self._stopping.discard(container.id)


def step(rules, rabbit, engine, now):
    """One reading of the queues and the resulting scaling actions."""
    busy = None
    for rule in rules:
        messages = rabbit.messages(rule.queue)
        current = len(engine.replicas(rule.service))
        desired = rule.decide(messages, current, now)
        if desired == current:
            continue
        log(f"{rule.service}: queue={rule.queue} messages={messages} replicas {current} -> {desired}")
        if desired > current:
            engine.scale_up(rule.service, desired - current)
        else:
            if busy is None:
                busy = rabbit.unacked_by_host()
            engine.scale_down(rule.service, current - desired, busy)


def main():
    env = os.environ
    rules = load_rules(env)
    rabbit = RabbitMQ(env.get("RABBITMQ_API", "http://rabbitmq:15672"),
                      env.get("RABBITMQ_USERNAME", "user"), env.get("RABBITMQ_PASSWORD", "password"))
    engine = Docker(env.get("COMPOSE_PROJECT", "picturas"), env_number(env, "STOP_TIMEOUT_S", 900))
    interval = env_number(env, "POLL_INTERVAL_S", 2, float)
    log("rules: " + "; ".join(f"{r.service} ({r.queue}) {r.minimum}-{r.maximum}" for r in rules)
        + f"; {rules[0].per_replica if rules else 1} message(s) per replica;"
        f" scale down after {rules[0].down_after_s if rules else 0:g} s")
    while True:
        try:
            step(rules, rabbit, engine, time.monotonic())
        except (requests.RequestException, docker.errors.DockerException, ValueError) as error:
            log(f"waiting: {error}")
        time.sleep(interval)


if __name__ == "__main__":
    main()
