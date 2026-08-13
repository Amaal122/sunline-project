import httpx

from app.core.config import settings
from app.models.order import Order
from app.models.user import User

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def _send_email(to_email: str, to_name: str, subject: str, html_content: str) -> None:
    print(f"[email] _send_email called — sending '{subject}' to {to_email}")

    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json",
    }
    payload = {
        "sender": {"name": settings.SENDER_NAME, "email": settings.SENDER_EMAIL},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_content,
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(BREVO_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            print(
                f"[email] Sent '{subject}' to {to_email} — status {response.status_code}"
            )
    except httpx.HTTPError as exc:
        print(f"[email] Failed to send '{subject}' to {to_email}: {exc}")


def send_welcome_email(user: User) -> None:
    html = f"""
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h1 style="font-size: 22px; letter-spacing: 1px;">Welcome to SUNLINE</h1>
      <p style="color: #444; line-height: 1.6;">
        Hi {user.full_name}, thanks for creating an account. You're all set —
        explore the new arrivals and enjoy free delivery across Tunisia on
        orders over 200 DT.
      </p>
    </div>
    """
    _send_email(
        to_email=user.email,
        to_name=user.full_name,
        subject="Welcome to SUNLINE",
        html_content=html,
    )


def send_order_confirmation_email(order: Order, recipient_email: str) -> None:
    items_rows = "".join(
        f"""
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0;">{item.product_name} — {item.color} / {item.size}</td>
          <td style="padding: 10px 0; text-align: center;">{item.quantity}</td>
          <td style="padding: 10px 0; text-align: right;">{item.unit_price} DT</td>
        </tr>
        """
        for item in order.items
    )

    html = f"""
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h1 style="font-size: 22px; letter-spacing: 1px;">Order Confirmed</h1>
      <p style="color: #444;">Order <strong>{order.order_number}</strong> — thank you, {order.full_name}.</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="border-bottom: 2px solid #111; text-align: left;">
            <th style="padding-bottom: 8px;">Item</th>
            <th style="padding-bottom: 8px; text-align: center;">Qty</th>
            <th style="padding-bottom: 8px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>{items_rows}</tbody>
      </table>

      <div style="margin-top: 16px; text-align: right; color: #444;">
        <div>Subtotal: {order.subtotal} DT</div>
        <div>Delivery: {order.delivery_fee} DT</div>
        <div style="font-weight: bold; font-size: 16px; margin-top: 6px;">
          Total: {order.total} DT
        </div>
      </div>

      <h3 style="margin-top: 28px; font-size: 14px; text-transform: uppercase;">Shipping to</h3>
      <p style="color: #444; line-height: 1.6;">
        {order.full_name}<br>
        {order.address_line}<br>
        {order.city}, {order.governorate} {order.postal_code}<br>
        {order.phone}
      </p>

      <p style="color: #888; font-size: 13px; margin-top: 24px;">
        Payment method: {order.payment_method.value if hasattr(order.payment_method, "value") else order.payment_method}
      </p>
    </div>
    """
    _send_email(
        to_email=recipient_email,
        to_name=order.full_name,
        subject=f"Your SUNLINE order {order.order_number} is confirmed",
        html_content=html,
    )
