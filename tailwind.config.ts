import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { ink: "#292426", cream: "#fbf7f1", rose: "#e9c9c8", blush: "#f5e4e3", gold: "#c8a96b" }, boxShadow: { soft: "0 18px 55px rgba(92,63,63,.09)" } } },
  plugins: []
};
export default config;
