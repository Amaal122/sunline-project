type ArtTone = "lav" | "ivory" | "dark";

export function DenimArt({
  seed = 1,
  tone = "lav",
  className,
}: {
  seed?: number;
  tone?: ArtTone;
  className?: string;
}) {
  const backgrounds: Record<ArtTone, string> = {
    lav: "#e3dbe3",
    ivory: "#F2F0F1",
    dark: "#d8d2c9",
  };
  const angle = (seed * 19) % 70;

  return (
    <svg
      className={className}
      viewBox="0 0 300 400"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustrated SUNLINE denim"
    >
      <rect width="300" height="400" fill={backgrounds[tone]} />
      <path
        d="M95 40 L110 380 L145 380 L150 220 L155 380 L190 380 L205 40 Z"
        fill="none"
        stroke="#131212"
        strokeWidth="2"
        opacity="0.55"
      />
      <path
        d="M95 40 L110 380"
        fill="none"
        stroke="#B19BB2"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M205 40 L190 380"
        fill="none"
        stroke="#B19BB2"
        strokeWidth="1"
        opacity="0.5"
      />
      <rect
        x="120"
        y="55"
        width="60"
        height="40"
        rx="2"
        fill="none"
        stroke="#131212"
        strokeWidth="1"
        opacity="0.35"
      />
      <circle cx="150" cy="60" r="3" fill="#131212" opacity="0.3" />
      <line
        x1={angle}
        y1="0"
        x2={200 + angle}
        y2="400"
        stroke="#B19BB2"
        strokeWidth="60"
        opacity="0.06"
      />
    </svg>
  );
}

export function HeroArt() {
  return (
    <svg
      viewBox="0 0 600 700"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Premium denim hero illustration"
    >
      <rect width="600" height="700" fill="#dfd7df" />
      <path
        d="M220 90 L250 620 L300 620 L305 380 L310 620 L360 620 L390 90 Z"
        fill="none"
        stroke="#131212"
        strokeWidth="2.5"
        opacity="0.5"
      />
      <path d="M220 90 L250 620" stroke="#B19BB2" strokeWidth="2" opacity="0.6" />
      <path d="M390 90 L360 620" stroke="#B19BB2" strokeWidth="2" opacity="0.6" />
      <rect
        x="255"
        y="115"
        width="90"
        height="55"
        rx="3"
        fill="none"
        stroke="#131212"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <circle cx="300" cy="122" r="5" fill="#131212" opacity="0.35" />
      <line x1="0" y1="0" x2="600" y2="700" stroke="#F6F7EB" strokeWidth="140" opacity="0.15" />
      <line x1="600" y1="0" x2="0" y2="700" stroke="#B19BB2" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export function FitArt() {
  return (
    <svg
      viewBox="0 0 200 260"
      width="80%"
      height="90%"
      role="img"
      aria-label="Denim fit silhouette"
    >
      <path
        d="M70 20 L80 240 L100 240 L100 140 L100 240 L120 240 L130 20 Z"
        fill="none"
        stroke="#F6F7EB"
        strokeWidth="2"
        opacity="0.9"
      />
    </svg>
  );
}
