"""Tests de la limitation des échecs d'accès aux commandes.

Sans Redis, sans base de données : limiteurs en mémoire avec horloge simulée.
"""

from fastapi import HTTPException

from app.services.order_access_limit import (
    TOO_MANY_ATTEMPTS,
    OrderAccessGuard,
)
from sunline_agent.limits import AttemptLimiter


class Clock:
    def __init__(self):
        self.t = 1_000_000.0

    def __call__(self):
        return self.t


def _guard(clock):
    return OrderAccessGuard(
        AttemptLimiter(5, 900, clock=clock),
        AttemptLimiter(25, 900, clock=clock),
    )


def _is_blocked(guard, ip, order):
    try:
        guard.check(ip, order)
        return False
    except HTTPException as exc:
        assert exc.status_code == 429
        assert exc.detail == TOO_MANY_ATTEMPTS
        return True


def test_not_blocked_before_the_limit():
    g = _guard(Clock())
    for _ in range(4):
        g.record_failure("1.1.1.1", "SL111111")
    assert not _is_blocked(g, "1.1.1.1", "SL111111")


def test_blocked_after_five_failures_on_the_same_order():
    g = _guard(Clock())
    for _ in range(5):
        g.record_failure("1.1.1.1", "SL111111")
    assert _is_blocked(g, "1.1.1.1", "SL111111")


def test_someone_else_cannot_lock_a_customer_out_of_her_order():
    # L'attaquant (2.2.2.2) échoue 5 fois sur la commande de la cliente :
    # la cliente (1.1.1.1) ne doit PAS être bloquée.
    g = _guard(Clock())
    for _ in range(5):
        g.record_failure("2.2.2.2", "SL111111")
    assert _is_blocked(g, "2.2.2.2", "SL111111")
    assert not _is_blocked(g, "1.1.1.1", "SL111111")


def test_enumeration_across_many_orders_is_cut_by_the_ip_limit():
    g = _guard(Clock())
    for i in range(25):
        g.record_failure("3.3.3.3", f"SL{100000 + i}")
    # Une commande jamais essayée est refusée aussi : c'est l'IP qui est bloquée
    assert _is_blocked(g, "3.3.3.3", "SL999999")
    assert not _is_blocked(g, "4.4.4.4", "SL999999")


def test_block_expires_after_the_window():
    clock = Clock()
    g = _guard(clock)
    for _ in range(5):
        g.record_failure("1.1.1.1", "SL111111")
    assert _is_blocked(g, "1.1.1.1", "SL111111")
    clock.t += 901  # plus de 15 minutes
    assert not _is_blocked(g, "1.1.1.1", "SL111111")


def test_order_number_case_and_spaces_do_not_dodge_the_limit():
    g = _guard(Clock())
    for variant in ["SL111111", "sl111111", " SL111111 ", "Sl111111", "SL111111"]:
        g.record_failure("1.1.1.1", variant)
    assert _is_blocked(g, "1.1.1.1", "SL111111")


def test_limiter_failure_does_not_break_order_access():
    class Broken:
        def blocked(self, key):
            raise RuntimeError("redis down")

        def record_failure(self, key):
            raise RuntimeError("redis down")

    g = OrderAccessGuard(Broken(), Broken())
    g.check("1.1.1.1", "SL111111")  # ne lève rien
    g.record_failure("1.1.1.1", "SL111111")  # ne lève rien