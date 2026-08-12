"use client";

export default function NewsletterForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.currentTarget.reset();
    // TODO: wire to a real newsletter endpoint once one exists on the backend
    alert("Welcome to SUNLINE - check your inbox.");
  }

  return (
    <section className="newsletter">
      <div className="wrap">
        <span className="eyebrow">Stay in the Loop</span>
        <h2>Join the SUNLINE List</h2>
        <p>
          Be first to know about new drops, private sales and styling notes, plus 10%
          off your first order.
        </p>
        <form className="news-form" onSubmit={handleSubmit}>
          <input type="email" required placeholder="Enter your email address" />
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </section>
  );
}
