import logging
import smtplib
import threading
from email.message import EmailMessage
from html import escape
from urllib.parse import quote

from app.core.config import settings
from app.models.order import Order
from app.models.user import User

logger = logging.getLogger(__name__)


def _send_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    text_content: str | None = None,
) -> None:
    message = EmailMessage()
    message["From"] = f"{settings.SENDER_NAME} <{settings.SENDER_EMAIL}>"
    message["To"] = f"{to_name} <{to_email}>"
    message["Subject"] = subject
    message.set_content(text_content or "SUNLINE notification")
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
        Hi {escape(user.full_name)}, thanks for creating an account. You're all set —
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


def build_order_link(order: Order) -> str:
    """Link to the order page on the storefront.

    - Guest order (no account): the link carries the order's secret token
      (?token=...). The confirmation page reads it, then removes it from the
      address bar. The token is the only thing that lets a guest read the
      order, so the link must only ever go to the e-mail given at checkout.
    - Order tied to an account: a plain link; the customer logs in to see it.
    - Legacy guest order without a token: a plain link (it cannot be opened
      by an unauthenticated visitor, which is the safe default).
    """
    base = settings.FRONTEND_ORIGIN.rstrip("/")
    link = f"{base}/order/{quote(order.order_number, safe='')}"
    if order.user_id is None and order.access_token:
        link += f"?token={quote(order.access_token, safe='')}"
    return link


def send_order_confirmation_email(order: Order, recipient_email: str) -> None:
    # Everything typed by the customer is escaped: an e-mail is HTML, so a
    # name or address containing "<" would otherwise be injected as markup.
    items_rows = "".join(
        f"""
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0;">{escape(item.product_name)} — {escape(item.color)} / {escape(item.size)}</td>
          <td style="padding: 10px 0; text-align: center;">{item.quantity}</td>
          <td style="padding: 10px 0; text-align: right;">{item.unit_price} DT</td>
        </tr>
        """
        for item in order.items
    )

    payment_method = (
        order.payment_method.value
        if hasattr(order.payment_method, "value")
        else order.payment_method
    )
    order_link = build_order_link(order)

    html = f"""
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h1 style="font-size: 22px; letter-spacing: 1px;">Order Confirmed</h1>
      <p style="color: #444;">Order <strong>{escape(order.order_number)}</strong> — thank you, {escape(order.full_name)}.</p>

      <p style="margin: 24px 0;">
        <a href="{escape(order_link, quote=True)}"
           style="background: #111; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 13px; letter-spacing: 1px;">
          VIEW YOUR ORDER
        </a>
      </p>

      <table style="width: 100%; border-collapse: collapse;margin-top: 20px;">
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
        {escape(order.full_name)}<br>
        {escape(order.address_line)}<br>
        {escape(order.city)}, {escape(order.governorate)} {escape(order.postal_code)}<br>
        {escape(order.phone)}
      </p>

      <p style="color: #888; font-size: 13px; margin-top: 24px;">
        Payment method: {escape(str(payment_method))}
      </p>

      <p style="color: #888; font-size: 12px; margin-top: 24px; line-height: 1.5;">
        Keep this email: the button above is your private link to your order.
        Please don't forward it to anyone you don't trust.
      </p>
    </div>
    """

    text = (
        f"Order {order.order_number} is confirmed — thank you, {order.full_name}.\n\n"
        f"View your order: {order_link}\n\n"
        f"Total: {order.total} DT ({payment_method}).\n"
        "Keep this email: the link is your private access to your order."
    )

    _send_email(
        to_email=recipient_email,
        to_name=order.full_name,
        subject=f"Your SUNLINE order {order.order_number} is confirmed",
        html_content=html,
        text_content=text,
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
    is already saved, so a mail problem must not affect thecustomer's conversation."""
    def _run() -> None:
        try:
            send_escalation_email(reference, reason, summary, language, order_number)
        except Exception:
            logger.exception("Escalation email for %s failed", reference)

    threading.Thread(target=_run, daemon=True).start()