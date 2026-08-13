import Link from "next/link";
import { Scissors, Recycle, Users, MapPin } from "lucide-react";

export const metadata = { title: "About SUNLINE" };

export default function AboutPage() {
  return (
    <>
      <section className="hero about-hero">
        <div className="hero-copy">
          <span className="eyebrow">Our Story</span>
          <h1>
            WOVEN IN TUNISIA,
            <br />
            <em>WORN WITH CONFIDENCE.</em>
          </h1>
          <div className="sunline" />
          <p className="lead">
            SUNLINE began in a small Tunis atelier with one belief: denim should feel
            like it was made for you, not simply sold to you.
          </p>
        </div>
        <div className="hero-art about-art" />
      </section>

      <section className="block wrap">
        <div className="story-copy-block">
          <p className="lead">
            Every pair we make starts with a question: how should denim actually feel
            on a real body, moving through a real day? Not the body on a runway — yours.
            That question shaped everything that came after.
          </p>
          <p>
            We work with a small group of artisans across Tunisia&apos;s textile
            heritage — pattern cutters, washers, finishers — who&apos;ve spent years
            perfecting denim by hand. Every SUNLINE pair is cut, washed, and finished
            in our Tunis ateliers before it reaches you. No overseas mass production,
            no guesswork on fit.
          </p>
        </div>
      </section>

      <section className="block wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">What We Stand For</span>
            <h2>Our Values</h2>
          </div>
        </div>
        <div className="values-grid">
          <div className="benefit">
            <Scissors aria-hidden="true" />
            <h4>Handcrafted Fit</h4>
            <p>Every cut is refined by hand, built around real bodies, not sample sizes.</p>
          </div>
          <div className="benefit">
            <Recycle aria-hidden="true" />
            <h4>Sustainable Denim</h4>
            <p>Responsibly sourced fabric and low-impact washing processes, wherever we can.</p>
          </div>
          <div className="benefit">
            <Users aria-hidden="true" />
            <h4>Local Artisans</h4>
            <p>We work exclusively with Tunisian ateliers, supporting a textile tradition generations deep.</p>
          </div>
          <div className="benefit">
            <MapPin aria-hidden="true" />
            <h4>Made in Tunisia</h4>
            <p>From pattern to finish, every step happens here — nothing outsourced overseas.</p>
          </div>
        </div>
      </section>

      <section className="block editorial wrap">
        <div className="editorial-inner">
          <span className="eyebrow">Ready to Find Your Fit?</span>
          <h2>Explore the Collection.</h2>
          <p className="lead">
            Sculpted silhouettes, sustainable denim, finished by hand — see what
            SUNLINE has for you.
          </p>
          <Link href="/shop" className="btn btn-lav">Shop Now</Link>
        </div>
      </section>
    </>
  );
}