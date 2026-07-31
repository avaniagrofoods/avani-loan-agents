import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary-color)",
          foreground: "var(--white)",
        },
        sidebar: {
          DEFAULT: "var(--primary-color)",
          foreground: "var(--white)",
        },
        zinc: {
          400: "#94a3b8",
          500: "#64748b",
          800: "rgba(255, 255, 255, 0.08)",
          50: "var(--white)",
        }
      }
    },
  },
  plugins: [],
};
export default config;
