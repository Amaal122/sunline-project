"""Tests de la règle d'accès aux commandes (jeton secret pour les invités).

Ces tests n'ont besoin ni de base de données ni de fixtures : ils vérifient
la règle d'accès (_can_view_order) et la forme des schémas de réponse.
"""

import uuid
from types import SimpleNamespace

from app.schemas.order import OrderCreatedOut, OrderOut
from app.services.order import _can_view_order, _generate_access_token

TOKEN = "tok_correct_value_1234567890"


def _guest_order(token=TOKEN):
    return SimpleNamespace(user_id=None, access_token=token)


def _account_order(owner_id):
    return SimpleNamespace(user_id=owner_id, access_token="whatever")


# --- commandes d'invité --------------------------------------------------


def test_guest_order_without_token_is_denied():
    assert _can_view_order(_guest_order(), None, None) is False


def test_guest_order_with_empty_token_is_denied():
    assert _can_view_order(_guest_order(), None, "") is False


def test_guest_order_with_wrong_token_is_denied():
    assert _can_view_order(_guest_order(), None, "mauvais-jeton") is False


def test_guest_order_with_correct_token_is_allowed():
    assert _can_view_order(_guest_order(), None, TOKEN) is True


def test_non_ascii_token_is_denied_without_crashing():
    # compare_digest sans encode() lèverait TypeError (-> erreur 500)
    assert _can_view_order(_guest_order(), None, "jéton-é-à-ç") is False


def test_legacy_guest_order_without_stored_token_is_denied():
    # anciennes commandes (access_token NULL) : échec fermé, même si on
    # envoie une valeur quelconque
    assert _can_view_order(_guest_order(token=None), None, "x") is False
    assert _can_view_order(_guest_order(token=None), None, None) is False


def test_logged_in_user_cannot_read_guest_order_without_token():
    user = SimpleNamespace(id=uuid.uuid4())
    assert _can_view_order(_guest_order(), user, None) is False


# --- commandes liées à un compte ----------------------------------------


def test_account_order_owner_is_allowed():
    owner = SimpleNamespace(id=uuid.uuid4())
    assert _can_view_order(_account_order(owner.id), owner, None) is True


def test_account_order_other_user_is_denied():
    owner_id = uuid.uuid4()
    other = SimpleNamespace(id=uuid.uuid4())
    assert _can_view_order(_account_order(owner_id), other, None) is False


def test_account_order_anonymous_is_denied():
    assert _can_view_order(_account_order(uuid.uuid4()), None, None) is False


def test_account_order_is_not_opened_by_a_token():
    # un jeton ne doit jamais ouvrir une commande de compte
    assert _can_view_order(_account_order(uuid.uuid4()), None, "whatever") is False


# --- jeton et schémas ---------------------------------------------------


def test_generated_tokens_are_long_and_unique():
    tokens = {_generate_access_token() for _ in range(200)}
    assert len(tokens) == 200
    assert all(len(t) >= 20 for t in tokens)


def test_read_schema_never_exposes_access_token():
    assert "access_token" not in OrderOut.model_fields


def test_checkout_schema_exposes_access_token():
    assert "access_token" in OrderCreatedOut.model_fields