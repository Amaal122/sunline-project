export const COLOR_SWATCHES = {
  indigo: "#4b5566",
  black: "#131212",
  ecru: "#e7ddc9",
  sage: "#9aa484",
  "lavender-wash": "#B19BB2",
  white: "#f4f2ee",
} as const;

export type ProductColor = keyof typeof COLOR_SWATCHES;

export type Product = {
  id: number;
  name: string;
  fit: Fit;
  price: number;
  oldPrice?: number;
  colors: ProductColor[];
  sizes: number[];
  rating: number;
  reviews: number;
  badge?: "Best Seller" | "New" | "Sale";
  desc: string;
};

export const FITS = [
  "Straight",
  "Wide Leg",
  "Skinny",
  "Mom Jeans",
  "Flare",
] as const;

export type Fit = (typeof FITS)[number];

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Etoile High-Rise Straight",
    fit: "Straight",
    price: 189,
    oldPrice: 239,
    colors: ["indigo", "black"],
    sizes: [36, 38, 40, 42],
    rating: 4.8,
    reviews: 126,
    badge: "Best Seller",
    desc: "Our signature straight-leg jean, cut from responsibly sourced stretch denim for a fit that moves with you from morning to night.",
  },
  {
    id: 2,
    name: "Lueur Wide-Leg",
    fit: "Wide Leg",
    price: 215,
    colors: ["ecru", "indigo"],
    sizes: [34, 36, 38, 40],
    rating: 4.9,
    reviews: 88,
    badge: "New",
    desc: "A fluid wide-leg silhouette with a sculpted waistband, designed to elongate and flatter every frame.",
  },
  {
    id: 3,
    name: "Rive Skinny Sculpt",
    fit: "Skinny",
    price: 169,
    colors: ["black", "indigo", "lavender-wash"],
    sizes: [34, 36, 38, 40, 42],
    rating: 4.6,
    reviews: 203,
    desc: "Second-skin skinny jean with 360-degree sculpting technology for a smooth, confident line.",
  },
  {
    id: 4,
    name: "Mere Relaxed Mom",
    fit: "Mom Jeans",
    price: 179,
    oldPrice: 219,
    colors: ["ecru", "sage"],
    sizes: [36, 38, 40],
    rating: 4.7,
    reviews: 64,
    badge: "Sale",
    desc: "High-waisted, tapered and effortlessly cool, our mom jean is finished with a hand-distressed hem.",
  },
  {
    id: 5,
    name: "Aube Soft Flare",
    fit: "Flare",
    price: 225,
    colors: ["indigo", "black"],
    sizes: [34, 36, 38, 40],
    rating: 4.8,
    reviews: 41,
    badge: "New",
    desc: "A modern take on the 70s flare, with a fitted thigh that releases gracefully at the knee.",
  },
  {
    id: 6,
    name: "Ciel Straight Crop",
    fit: "Straight",
    price: 195,
    colors: ["lavender-wash", "black"],
    sizes: [36, 38, 40, 42],
    rating: 4.5,
    reviews: 57,
    desc: "A cropped straight leg finished with a raw hem, styled to sit perfectly at the ankle.",
  },
  {
    id: 7,
    name: "Douceur Wide Trouser",
    fit: "Wide Leg",
    price: 239,
    oldPrice: 279,
    colors: ["black", "ecru"],
    sizes: [34, 36, 38, 40, 42],
    rating: 4.9,
    reviews: 112,
    badge: "Best Seller",
    desc: "Tailored wide-leg trouser jean in a fluid denim twill, elevated enough for the office and easy enough for everything else.",
  },
  {
    id: 8,
    name: "Velours Mid Skinny",
    fit: "Skinny",
    price: 159,
    colors: ["indigo", "black"],
    sizes: [36, 38, 40],
    rating: 4.4,
    reviews: 39,
    desc: "Mid-rise skinny in a soft-touch stretch denim with all-day comfort.",
  },
];

export function money(value: number) {
  return `${value.toFixed(0)} DT`;
}
