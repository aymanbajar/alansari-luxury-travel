import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tajawal", "Arial", "sans-serif"]
      },
      colors: {
        ink: "#18231f",
        paper: "#f7f5ef",
        olive: "#596f55",
        gold: "#b98945",
        sea: "#236477"
      }
    }
  },
  plugins: []
} satisfies Config;
