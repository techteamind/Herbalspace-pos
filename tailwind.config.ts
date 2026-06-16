import type { Config } from "tailwindcss";

/**
 * Design tokens diambil dari output Stitch (design/stitch/DESIGN-TOKENS.md).
 * Sumber kebenaran warna & tipografi UI Herbaspace POS.
 */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f6faf5",
        surface: "#f6faf5",
        "surface-dim": "#d7dbd6",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f1f5ef",
        "surface-container": "#ebefe9",
        "surface-container-high": "#e5e9e4",
        "surface-container-highest": "#dfe4de",
        "on-surface": "#181d19",
        "on-surface-variant": "#3f4942",
        "on-background": "#181d19",
        outline: "#6f7a72",
        "outline-variant": "#bec9c0",
        primary: "#00603e",
        "primary-container": "#1f7a53",
        "on-primary": "#ffffff",
        "on-primary-container": "#aeffd1",
        "primary-fixed": "#9ef5c4",
        "primary-fixed-dim": "#82d8aa",
        secondary: "#835400",
        "secondary-container": "#fdb244",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#6e4600",
        "secondary-fixed": "#ffddb5",
        "on-secondary-fixed-variant": "#633f00",
        tertiary: "#883b3f",
        "tertiary-container": "#a65256",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      borderRadius: { lg: "1rem", md: "0.75rem", sm: "0.5rem" },
      spacing: { "touch": "44px", "container": "16px", "gutter": "12px", "section": "24px" },
      boxShadow: { card: "0px 4px 12px rgba(24,29,25,0.05)" },
    },
  },
  plugins: [],
} satisfies Config;
