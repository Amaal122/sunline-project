import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site footer-site">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="foot-logo">SUNLINE</div>
            <p>
              Premium denim designed and finished in Tunisia, for women who move with
              confidence.
            </p>
            <div className="sunline" />
          </div>
          <FooterColumn
            title="Shop"
            links={[
              ["Shop All", "/shop"],
              ["Best Sellers", "/shop"],
              ["All Jeans", "/shop"],
              ["Wishlist", "/wishlist"],
            ]}
          />
          <FooterColumn
            title="Support"
            links={[
              ["FAQ", "/faq"],
              ["Shipping", "/faq?t=shipping"],
              ["Returns", "/faq?t=returns"],
              ["Contact Us", "/contact"],
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              ["About SUNLINE", "/about"],
              ["Our Stores", "/contact"],
              ["Sustainability", "/about"],
            ]}
          />
        </div>
        <div className="foot-bottom">
          <span>Copyright 2026 SUNLINE Tunisia. All rights reserved.</span>
          <span className="pay-icons">
            <span>COD</span>
            <span>/</span>
            <span>CARTE BANCAIRE</span>
            <span>/</span>
            <span>TND</span>
          </span>
          <span>FR / AR</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h5>{title}</h5>
      <ul>
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
