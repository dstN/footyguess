// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  ssr: false,
  modules: ["@nuxt/ui", "@nuxtjs/i18n"],
  css: ["~/assets/css/main.css"],
  i18n: {
    locales: [
      { code: "de", name: "Deutsch", file: "de.json" },
      { code: "en", name: "English", file: "en.json" },
    ],
    defaultLocale: "de",
    lazy: true,
    langDir: "../locales",
    strategy: "no_prefix",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      fallbackLocale: "de",
    },
  },
});
