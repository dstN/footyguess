// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  ssr: false,

  routeRules: {
    // Cache static assets for 1 year
    "/_nuxt/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    "/assets/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    "/public/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
  },

  // SEO & Meta Tags
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      title: "FootyGuess - Guess the Player from Their Transfer Trail",
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, interactive-widget=resizes-content",
        },
        {
          name: "description",
          content:
            "A football guessing game. Study the transfer timeline, unlock clues, and name the mystery player. Build streaks and compete on the leaderboard!",
        },
        // Open Graph
        {
          property: "og:title",
          content: "FootyGuess - Guess the Player from Their Transfer Trail",
        },
        {
          property: "og:description",
          content:
            "A football guessing game. Study the transfer timeline, unlock clues, and name the mystery player.",
        },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "FootyGuess" },
        { property: "og:locale", content: "en_US" },
        { property: "og:url", content: "https://footyguess.yinside.de/" },
        // Twitter Card
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: "FootyGuess - Guess the Player from Their Transfer Trail",
        },
        {
          name: "twitter:description",
          content:
            "A football guessing game. Study the transfer timeline, unlock clues, and name the mystery player.",
        },
        // Theme & App
        { name: "theme-color", content: "#0ef9ae" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "FootyGuess" },
        // OG Image
        {
          property: "og:image",
          content: "https://footyguess.yinside.de/twittercard.png",
        },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "FootyGuess - Guess the Player" },
        // Twitter Image
        {
          name: "twitter:image",
          content: "https://footyguess.yinside.de/twittercard.png",
        },
        {
          name: "twitter:image:alt",
          content: "FootyGuess - Guess the Player from Their Transfer Trail",
        },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32x32.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/favicon-16x16.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "canonical", href: "https://footyguess.yinside.de/" },
      ],
    },
  },

  modules: ["@nuxt/ui"],
  ui: {
    theme: {
      colors: [
        "primary",
        "secondary",
        "success",
        "info",
        "warning",
        "error",
        "neutral",
      ],
    },
  },
  css: ["~/assets/css/main.css"],

  // Production optimizations
  vite: {
    build: {
      // Enable minification in production
      minify: "esbuild",
      // Chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["vue", "vue-router"],
          },
        },
      },
    },
  },

  // Build-time optimizations
  experimental: {
    payloadExtraction: false,
  },

  // TypeScript strict mode
  typescript: {
    strict: true,
  },
});
