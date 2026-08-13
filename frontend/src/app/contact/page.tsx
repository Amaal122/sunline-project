import { Mail, Phone, MapPin, Clock } from "lucide-react";

export const metadata = { title: "Contact — SUNLINE" };

export default function ContactPage() {
  return (
    <>
      <section className="page-hero wrap">
        <span className="eyebrow">Get In Touch</span>
        <h1>Contact Us</h1>
        <div className="sunline" />
        <p className="lead">
          Have a question about an order, sizing, or anything else? We&apos;re happy to help.
        </p>
      </section>

      <section className="block wrap">
        <div className="contact-grid">
          <div className="contact-card">
            <Mail aria-hidden="true" />
            <h4>Email</h4>
            <p><a href="mailto:hello@sunline.tn">hello@sunline.tn</a></p>
            <span className="contact-note">We reply within 24-48 hours</span>
          </div>

          <div className="contact-card">
            <Phone aria-hidden="true" />
            <h4>Phone</h4>
            <p><a href="tel:+21600000000">+216 00 000 000</a></p>
            <span className="contact-note">Sunday - Thursday</span>
          </div>

          <div className="contact-card">
            <MapPin aria-hidden="true" />
            <h4>Atelier</h4>
            <p>Tunis, Tunisia</p>
            <span className="contact-note">Visits by appointment only</span>
          </div>

          <div className="contact-card">
            <Clock aria-hidden="true" />
            <h4>Hours</h4>
            <p>9:00 AM - 6:00 PM</p>
            <span className="contact-note">Sunday - Thursday</span>
          </div>
        </div>
      </section>
    </>
  );
}