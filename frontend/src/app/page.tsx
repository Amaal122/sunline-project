import Link from "next/link";
import { getProducts } from "@/lib/api";
import ProductGrid from "@/components/shop/ProductGrid";
import NewsletterForm from "@/components/home/NewsletterForm";
import { Lock, RotateCcw, Truck, UserRound } from "lucide-react";

const FIT_BACKGROUNDS = ["#d8cdd9", "#e4ded0", "#cfd3c4", "#ded6de", "#c9c2cb"];
const FITS = ["Straight", "Wide Leg", "Skinny", "Mom Jeans", "Flare"] as const;

export default async function HomePage() {
  // Best Sellers, pulled from the real API — sorted featured, first 4.
  const bestSellers = (await getProducts({ sort: "featured" })).slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">SS26 Collection - Made in Tunisia</span>
          <h1>
            MADE TO
            <br />
            <em>SHINE.</em>
          </h1>
          <div className="sunline" />
          <p className="lead">
            Premium jeans designed for women who move with confidence. Sculpted fits,
            sustainable denim, finished by hand in our Tunis ateliers.
          </p>
          <div className="hero-cta-row">
            <Link href="/shop" className="btn btn-dark">Shop Now</Link>
            <Link href="/shop" className="btn btn-outline">Shop All</Link>
          </div>
        </div>
        <div className="hero-art" />
      </section>

      <section className="benefits wrap">
        <div className="benefit"><Truck aria-hidden="true" /><h4>Free Delivery</h4><p>On orders over 200 DT</p></div>
        <div className="benefit"><RotateCcw aria-hidden="true" /><h4>Easy Returns</h4><p>14 days, no questions</p></div>
        <div className="benefit"><Lock aria-hidden="true" /><h4>Secure Payment</h4><p>COD or online, always safe</p></div>
        <div className="benefit"><UserRound aria-hidden="true" /><h4>Made for You</h4><p>Cuts built for real bodies</p></div>
      </section>

      <section className="block wrap">
        <div className="section-head">
          <div><span className="eyebrow">Shop by Silhouette</span><h2>Find Your Fit</h2></div>
        </div>
        <div className="fits-grid">
          {FITS.map((fit, i) => (
            <Link href={`/shop?fit=${encodeURIComponent(fit)}`} className="fit-card" key={fit}>
              <span className="fit-visual" style={{ background: FIT_BACKGROUNDS[i] }} />
              <span className="fit-label">
                <span>{fit}</span>
                <small>Shop the fit</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="block editorial wrap">
        <div className="editorial-inner">
          <span className="eyebrow">New Collection - Lueur</span>
          <h2>Denim, Reimagined<br />for Golden Hour.</h2>
          <p className="lead">
            A capsule of wide-leg and flare silhouettes in warm indigo washes, built for
            movement and styled for confidence.
          </p>
          <Link href="/shop" className="btn btn-lav">Explore the Edit</Link>
        </div>
      </section>

      <section className="block wrap">
        <div className="section-head">
          <div><span className="eyebrow">Loved by our community</span><h2>Best Sellers</h2></div>
          <Link href="/shop" className="btn btn-outline btn-sm">View All</Link>
        </div>
        <ProductGrid products={bestSellers} />
      </section>

      <section className="block wrap story">
        <div className="story-visual" />
        <div>
          <span className="eyebrow">Our Story</span>
          <h2>Woven in Tunisia,<br />Worn with Confidence.</h2>
          <p className="lead story-copy">
            SUNLINE began in a small Tunis atelier with one belief: denim should feel
            like it was made for you, not simply sold to you. Every pair is cut, washed
            and finished by artisans across Tunisia&apos;s textile heritage.
          </p>
          <Link href="/about" className="btn btn-outline">Discover Our Story</Link>
        </div>
      </section>

      <NewsletterForm />
    </>
  );
}
