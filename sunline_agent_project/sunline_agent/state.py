"""All server-side state in Redis (conversations, lockouts, rate limits) instead of process memory."""
from .conversations import RedisStore
from .limits import RedisAttemptLimiter, RedisRateLimiter


def redis_state(url: str, conversation_ttl: int = 7200) -> dict:
    """Keyword arguments for build_agent_router(...)."""
    import redis
    client = redis.Redis.from_url(url, decode_responses=True)
    return {
        "store": RedisStore(client, conversation_ttl),
        "limiter": RedisAttemptLimiter(client, 5, 900, "sunline:agent:fail:"),
        "ip_limiter": RedisAttemptLimiter(client, 25, 900, "sunline:agent:ipfail:"),
        "rate_limiter": RedisRateLimiter(client, 20, 60, "sunline:agent:rate:"),
        "ip_rate_limiter": RedisRateLimiter(client, 60, 600, "sunline:agent:iprate:"),
    }
