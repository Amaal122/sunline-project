"""Limitation des échecs d'accès à GET /api/orders/{order_number}.

Défense EN PLUS du jeton secret (128 bits, non devinable) : elle empêche un
script de marteler la route et coupe toute tentative d'énumération.

Deux compteurs d'échecs (404) sur 15 minutes, réutilisant les limiteurs de
l'agent (sunline_agent.limits) :
  - par couple (IP, numéro de commande) : 5 échecs
  - par IP, toutes commandes confondues : 25 échecs

Pourquoi PAS un compteur par numéro de commande seul : un tiers pourrait
« échouer » 5 fois sur le numéro d'une cliente et lui bloquer l'accès à sa
propre commande. Avec (IP, commande), un attaquant ne bloque que lui-même.

Seuls les ÉCHECS sont comptés : une cliente qui recharge sa page de
confirmation avec le bon jeton ne risque jamais d'être bloquée.

Si Redis est indisponible, on journalise l'erreur et on laisse passer : le
jeton reste la protection principale, et un incident Redis ne doit pas
empêcher toutes les clientes de voir leur commande.
"""

import logging
from functools import lru_cache

from fastapi import HTTPException, Request, status

from app.core.config import settings
from sunline_agent.limits import AttemptLimiter, RedisAttemptLimiter

logger = logging.getLogger(__name__)

TOO_MANY_ATTEMPTS = "Too many attempts. Please try again later."
MAX_FAILURES_PER_ORDER = 5
MAX_FAILURES_PER_IP = 25
WINDOW_SECONDS = 900  # 15 minutes


def client_ip(request: Request) -> str:
    # Derrière un proxy, request.client est le proxy : en production, lancer
    # uvicorn avec --proxy-headers et la liste des proxys de confiance.
    # On ne lit JAMAIS X-Forwarded-For soi-même (falsifiable par le client).
    return request.client.host if request.client else "unknown"


class OrderAccessGuard:
    def __init__(self, pair_limiter, ip_limiter):
        self.pair_limiter = pair_limiter
        self.ip_limiter = ip_limiter

    @staticmethod
    def _pair_key(ip: str, order_number: str) -> str:
        # Tronqué : un attaquant peut inventer des numéros à l'infini
        return f"{ip}:{order_number.strip().upper()[:32]}"

    def check(self, ip: str, order_number: str) -> None:
        """Lève 429 si cette IP est bloquée (avant toute requête en base)."""
        try:
            blocked = self.pair_limiter.blocked(
                self._pair_key(ip, order_number)
            ) or self.ip_limiter.blocked(ip)
        except Exception:  # noqa: BLE001
            logger.exception("Order access limiter unavailable (check) — allowing")
            return
        if blocked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=TOO_MANY_ATTEMPTS,
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )

    def record_failure(self, ip: str, order_number: str) -> None:
        try:
            self.pair_limiter.record_failure(self._pair_key(ip, order_number))
            self.ip_limiter.record_failure(ip)
        except Exception:  # noqa: BLE001
            logger.exception("Order access limiter unavailable (record) — ignoring")


def _build_default_guard() -> OrderAccessGuard:
    redis_url = getattr(settings, "REDIS_URL", None)
    if redis_url:
        import redis

        client = redis.Redis.from_url(redis_url, decode_responses=True)
        return OrderAccessGuard(
            RedisAttemptLimiter(
                client, MAX_FAILURES_PER_ORDER, WINDOW_SECONDS, "sunline:orders:fail:"
            ),
            RedisAttemptLimiter(
                client, MAX_FAILURES_PER_IP, WINDOW_SECONDS, "sunline:orders:ipfail:"
            ),
        )
    logger.warning(
        "REDIS_URL not set: order access limiter is in-memory "
        "(per process, lost on restart). Use Redis in production."
    )
    return OrderAccessGuard(
        AttemptLimiter(MAX_FAILURES_PER_ORDER, WINDOW_SECONDS),
        AttemptLimiter(MAX_FAILURES_PER_IP, WINDOW_SECONDS),
    )


@lru_cache(maxsize=1)
def get_order_access_guard() -> OrderAccessGuard:
    """Dépendance FastAPI (remplaçable dans les tests avec dependency_overrides)."""
    return _build_default_guard()