import type { Config } from "tailwindcss";

/**
 * Design tokens sampled directly from design.pdf (source of truth for
 * visual design, ТЗ §3). See DESIGN-SYSTEM notes in ARCHITECTURE.md for how
 * these were derived.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#FBF9F6",
        surface: "#FFFFFF",
        "surface-alt": "#F4EFEB",
        ink: {
          DEFAULT: "#2A1C16",
          muted: "#887B74",
        },
        primary: {
          DEFAULT: "#DF5936",
          hover: "#C94A2A",
          light: "#F1BAAC",
          subtle: "#FBE8E1",
        },
        border: {
          DEFAULT: "#E6E1DA",
        },
        success: {
          DEFAULT: "#2F7A3D",
          bg: "#E8F4E8",
        },
        danger: {
          DEFAULT: "#C7402F",
          bg: "#FBE8E4",
        },
        warning: {
          DEFAULT: "#B8860B",
          bg: "#FBF0D9",
        },
      },
      borderRadius: {
        card: "16px",
        control: "10px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(42, 28, 22, 0.06), 0 1px 8px 0 rgba(42, 28, 22, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
