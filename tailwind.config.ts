import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FDF9E3",
        "fc-red": "#FF5757",
        navy: "#1A1929",
        muted: "#7A7890",
        "card-bg": "#FFF8D6",
      },
      fontFamily: {
        anton: ["Anton", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
