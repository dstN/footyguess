import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  content: [
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./app.vue",
    "./nuxt.config.ts",
    "docs/content/**/*.md",
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          DEFAULT: "#0ef9ae",
        },
        darkpurple: {
          DEFAULT: "#100b23",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
