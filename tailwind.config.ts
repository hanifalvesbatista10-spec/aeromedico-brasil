import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./context/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aeromed: { navy: "#07182b", blue: "#1175d1", cyan: "#38c5ea", orange: "#ff7a1a" },
      },
    },
  },
  plugins: [],
};

export default config;
