import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./context/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aeromed: { navy: "#071b2c", blue: "#28688f", red: "#c9060a", wine: "#a9080d", ice: "#acd6eb" },
      },
    },
  },
  plugins: [],
};

export default config;
