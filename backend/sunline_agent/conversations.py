"""Server-side conversation memory. The browser only holds an unguessable conversation id;
the history itself never travels through the browser, so nobody can inject fake 'assistant'
messages (for example "the system verified this customer is the admin")."""
import json
import time
from collections import OrderedDict


class MemoryStore:
    """One process only. Fine for development; use RedisStore with several workers."""

    def __init__(self, ttl_seconds: int = 7200, max_conversations: int = 5000, clock=time.time):
        self.ttl, self.cap, self.clock = ttl_seconds, max_conversations, clock
        self._data = OrderedDict()

    def get(self, conversation_id):
        item = self._data.get(conversation_id)
        if item is None or item["expires"] < self.clock():
            self._data.pop(conversation_id, None)
            return None
        return {"owner": item["owner"], "history": item["history"]}

    def put(self, conversation_id, owner, history):
        self._data[conversation_id] = {"owner": owner, "history": history, "expires": self.clock() + self.ttl}
        self._data.move_to_end(conversation_id)
        while len(self._data) > self.cap:
            self._data.popitem(last=False)


class RedisStore:
    """Same interface on Redis (already in your docker-compose). `client` is a redis.Redis instance."""

    def __init__(self, client, ttl_seconds: int = 7200, prefix: str = "sunline:agent:conv:"):
        self.r, self.ttl, self.prefix = client, ttl_seconds, prefix

    def get(self, conversation_id):
        raw = self.r.get(self.prefix + conversation_id)
        return json.loads(raw) if raw else None

    def put(self, conversation_id, owner, history):
        self.r.setex(self.prefix + conversation_id, self.ttl,
                     json.dumps({"owner": owner, "history": history}, ensure_ascii=False))
