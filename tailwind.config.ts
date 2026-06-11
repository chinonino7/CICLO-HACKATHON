import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAFAFA",
        forest: "#0A4D3C",
        bronze: "#B8977E",
        ink: "#0B1F18",
        line: "#E7E4DD",
        muted: "#6B7B73",
        claret: "#8C2F2F",
      },
      keyframes: {
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "toast-in": "toast-in 200ms ease-out",
        "fade-up": "fade-up 250ms ease-out both",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "#E7E4DD",
      },
    },
  },
  plugins: [],
};
export default config;
