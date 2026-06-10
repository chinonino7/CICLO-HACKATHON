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
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
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
