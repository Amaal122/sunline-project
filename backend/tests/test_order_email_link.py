"""Tests du lien dans l'e-mail de confirmation (sans SMTP ni base de données)."""

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from app.core.config import settings
from app.services import email as email_service
from app.services.email import build_order_link

BASE = settings.FRONTEND_ORIGIN.rstrip("/")


def _order(user_id=None, token="tok_abc-123_XYZ", **overrides):
    data = {
        "order_number": "SL481203",
        "user_id": user_id,
        "access_token": token,
        "full_name": "Amal Test",
        "address_line": "12 rue de la Liberté",
        "city": "Tunis",
        "governorate": "Tunis",
        "postal_code": "1000",
        "phone": "+21698123456",
        "payment_method": "COD",
        "subtotal": Decimal("189.00"),
        "delivery_fee": Decimal("8.00"),
        "total": Decimal("197.00"),
        "items": [
            SimpleNamespace(
                product_name="Étoile High-Rise Straight",
                color="Indigo",
                size="36",
                quantity=1,
                unit_price=Decimal("189.00"),
            )
        ],
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _captured_email(order):
    """Appelle send_order_confirmation_email en interceptant _send_email."""
    with patch.object(email_service, "_send_email") as fake:
        email_service.send_order_confirmation_email(order, "client@example.com")
    return fake.call_args.kwargs


# --- lien -----------------------------------------------------------------


def test_guest_order_link_contains_token():
    assert build_order_link(_order()) == f"{BASE}/order/SL481203?token=tok_abc-123_XYZ"


def test_account_order_link_has_no_token():
    link = build_order_link(_order(user_id="some-user-id"))
    assert link == f"{BASE}/order/SL481203"
    assert "token" not in link


def test_legacy_guest_order_without_token_has_plain_link():
    assert build_order_link(_order(token=None)) == f"{BASE}/order/SL481203"


def test_token_is_url_encoded():
    link = build_order_link(_order(token="a b&c=d"))
    assert "token=a%20b%26c%3Dd" in link


# --- contenu de l'e-mail ----------------------------------------------------


def test_email_contains_the_link_in_html_and_text():
    sent = _captured_email(_order())
    link = f"{BASE}/order/SL481203?token=tok_abc-123_XYZ"
    assert link in sent["html_content"]
    assert link in sent["text_content"]


def test_customer_input_is_html_escaped():
    order = _order(full_name="<script>alert(1)</script>", address_line="<b>x</b>")
    html = _captured_email(order)["html_content"]
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "<b>x</b>" not in html