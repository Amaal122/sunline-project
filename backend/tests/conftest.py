"""Fixtures partagées par tous les tests.

Chaque test reçoit une garde de limitation (accès aux commandes) NEUVE, en
mémoire : les échecs d'un test ne bloquent jamais le suivant, et les tests ne
dépendent pas de Redis.
"""

import pytest

from app.main import app
from app.services.order_access_limit import OrderAccessGuard, get_order_access_guard
from sunline_agent.limits import AttemptLimiter


@pytest.fixture(autouse=True)
def fresh_order_access_guard():
    """Fixture pour obtenir une garde de limitation d'accès aux commandes fraîche."""
    guard = OrderAccessGuard(AttemptLimiter(5, 900), AttemptLimiter(25, 900))
    app.dependency_overrides[get_order_access_guard] = lambda: guard
    yield guard
    app.dependency_overrides.pop(get_order_access_guard, None)