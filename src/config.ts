/** Runtime settings. Pages read these instead of embedding literals. */
export const appConfig = {
  locale: "en-GB",
  timeZone: "UTC",
  emptyValue: "—",
  pollIntervalMs: 1000,
  searchDebounceMs: 300,
  theme: {
    theme: "light",
    accent: "blue",
    style: "modern",
    roundness: "rounded",
    font: "inter",
  },
  xwui: {
    system: {
      locale: "en-GB",
      timezone: "UTC",
      direction: "ltr",
    },
    user: {
      brand: "default",
      style: "modern",
      color: "blue",
    },
  },
} as const;
