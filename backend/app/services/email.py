import logging
import smtplib
from email.message import EmailMessage
from html import escape

from app.core.config import settings
from app.models.order import Order
from app.models.user import User
import threading
logger = logging.getLogger(__name__)


def _send_email(to_email: str, to_name: str, subject: str, html_content: str) -> None:
    message = EmailMessage()
    message["From"] = f"{settings.SENDER_NAME} <{settings.SENDER_EMAIL}>"
    message["To"] = f"{to_name} <{to_email}>"
    message["Subject"] = subject
    message.set_content("SUNLINE notification")
    message.add_alternative(html_content, subtype="html")
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        logger.info("Sent '%s' to %s via SMTP", subject, to_email)
    except (OSError, smtplib.SMTPException) as exc:
        logger.error("Failed to send '%s' to %s: %s", subject, to_email, exc)


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


def send_escalation_email(reference: str, reason: str, summary: str,
                          language: str, order_number: str | None) -> None:
    """Notify the configured administrator after a human handoff is recorded."""
    recipient = settings.ADMIN_EMAIL or settings.SENDER_EMAIL
    if not recipient:
        logger.warning("Escalation %s recorded but no administrator email is configured", reference)
        return
    order_line = f"<p><strong>Order:</strong> {escape(order_number)}</p>" if order_number else ""
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>New SUNLINE customer escalation</h2>
      <p><strong>Reference:</strong> {escape(reference)}</p>
      <p><strong>Reason:</strong> {escape(reason)}</p>
      {order_line}
      <p><strong>Language:</strong> {escape(language)}</p>
      <p><strong>Summary:</strong></p>
      <p>{escape(summary)}</p>
    </div>
    """
    _send_email(
        to_email=recipient,
        to_name="SUNLINE administrator",
        subject=f"New customer escalation {reference}",
        html_content=html,
    )

def notify_escalation_async(reference: str, reason: str, summary: str,
                            language: str, order_number: str | None) -> None:
    """Called by the agent after a handoff is recorded. Never blocks and never raises: the ticket
    is already saved, so a mail problem must not affect the customer's conversation."""
    def _run() -> None:
        try:
            send_escalation_email(reference, reason, summary, language, order_number)
        except Exception:  # noqa: BLE001
            logger.exception("Escalation email for %s failed", reference)

    threading.Thread(target=_run, daemon=True).start()