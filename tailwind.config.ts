import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B1130",
        navy: "#101C4D",
        accentA: "#3B7BF6",
        accentB: "#F0578A",
        hit: "#FFC53D",
      },
      fontFamily: {
        display: ["'Pretendard'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
