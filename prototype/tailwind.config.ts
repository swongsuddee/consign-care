import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 900: "#0a2147", 800: "#0f2d5c", 700: "#163b74", 600: "#1e4a8c" },
        brand: { 50: "#eff6ff", 100: "#dbeafe", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8" },
      },
      fontFamily: {
        sans: ["var(--font-thai)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,45,92,0.04), 0 4px 16px rgba(15,45,92,0.06)",
        phone: "0 30px 80px -20px rgba(15,45,92,0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
