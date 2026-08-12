import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // SUNLINE mandatory palette - do not add colors outside this set
        ink: "#131212",
        lavender: "#B19BB2",
        gray: "#F2F0F1",
        ivory: "#F6F7EB",

        // shadcn/ui compatibility layer - maps radix/shadcn tokens
        // onto the brand palette so imported components stay on-brand
        border: "rgba(19,18,18,0.12)",
        input: "#F2F0F1",
        ring: "#B19BB2",
        background: "#F6F7EB",
        foreground: "#131212",
        primary: {
          DEFAULT: "#131212",
          foreground: "#F6F7EB",
        },
        secondary: {
          DEFAULT: "#F2F0F1",
          foreground: "#131212",
        },
        accent: {
          DEFAULT: "#B19BB2",
          foreground: "#131212",
        },
        muted: {
          DEFAULT: "#F2F0F1",
          foreground: "#131212",
        },
        destructive: {
          DEFAULT: "#A13D3D",
          foreground: "#F6F7EB",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Playfair Display", "serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "1px",
        md: "2px",
        lg: "3px",
      },
      letterSpacing: {
        widest2: ".22em",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
