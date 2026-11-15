"""Attempt limiter: blocks brute-force guessing of order numbers and phone numbers.

In-memory version (one server process). In production use Redis, which you already run in
docker-compose: same interface, keys with an expiry."""
import time
from collections import defaultdict


class AttemptLimiter:
    def __init__(self, max_failures: int = 5, window_seconds: int = 900, clock=time.time):
        self.max_failures, self.window, self.clock = max_failures, window_seconds, clock
        self._fails = defaultdict(list)

    def _prune(self, key):
        cutoff = self.clock() - self.window
        self._fails[key] = [t for t in self._fails[key] if t > cutoff]

    def blocked(self, key: str) -> bool:
        self._prune(key)
        return len(self._fails[key]) >= self.max_failures

    def record_failure(self, key: str):
        self._prune(key)
        self._fails[key].append(self.clock())


class RateLimiter:
    """Sliding-window request limiter: allow(key) records one event and returns False when over the limit."""

    def __init__(self, max_events: int, window_seconds: int, clock=time.time):
        self.max_events, self.window, self.clock = max_events, window_seconds, clock
        self._events = defaultdict(list)

    def allow(self, key: str) -> bool:
        now = self.clock()
        recent = [t for t in self._events[key] if t > now - self.window]
        if len(recent) >= self.max_events:
            self._events[key] = recent
            return False
        recent.append(now)
        self._events[key] = recent
        return True


class RedisAttemptLimiter:
    """Same interface as AttemptLimiter, stored in Redis: shared by all server processes and
    it survives restarts. If Redis is down, the exception propagates and the tool returns an
    error (fail closed: no order data is ever returned without the check)."""

    def __init__(self, client, max_failures=5, window_seconds=900, prefix="sunline:agent:fail:", clock=time.time):
        self.r, self.max_failures, self.window, self.prefix, self.clock = client, max_failures, window_seconds, prefix, clock

    def _clean(self, key):
        k = self.prefix + key
        self.r.zremrangebyscore(k, 0, self.clock() - self.window)
        return k

    def blocked(self, key: str) -> bool:
        return self.r.zcard(self._clean(key)) >= self.max_failures

    def record_failure(self, key: str):
        import uuid
        k, now = self._clean(key), self.clock()
        self.r.zadd(k, {f"{now}:{uuid.uuid4().hex[:8]}": now})
        self.r.expire(k, self.window)


class RedisRateLimiter:
    def __init__(self, client, max_events, window_seconds, prefix="sunline:agent:rate:", clock=time.time):
        self.r, self.max_events, self.window, self.prefix, self.clock = client, max_events, window_seconds, prefix, clock

    def allow(self, key: str) -> bool:
        import uuid
        k, now = self.prefix + key, self.clock()
        self.r.zremrangebyscore(k, 0, now - self.window)
        if self.r.zcard(k) >= self.max_events:
            return False
        self.r.zadd(k, {f"{now}:{uuid.uuid4().hex[:8]}": now})
        self.r.expire(k, self.window)
        return True
