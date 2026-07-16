import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        nest: {
          50: "#eef7f7",
          100: "#d7ecec",
          200: "#b0d9da",
          300: "#7fbfc2",
          400: "#4b9fa4",
          500: "#2f7f87", // teal shield
          600: "#256670",
          700: "#1e525a",
          800: "#173e44",
          900: "#102a2e",
        },
        skyfeather: {
          400: "#6db4e0",
          500: "#4a97c9",
          600: "#3a7cab",
        },
        nestwarm: {
          400: "#f0a45c",
          500: "#e78a35",
          600: "#c96f22",
        },
        ink: "#0f2027",
      },
      fontFamily: {
        display: ["Poppins", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(15,32,39,0.08)",
        cardHover: "0 12px 32px -8px rgba(15,32,39,0.16)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
