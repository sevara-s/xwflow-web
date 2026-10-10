/** Runtime settings. Visible words live in src/content, data in src/api. */
export const config = {
  /** Dates read "09 Oct 2026, 12:04", the format the prototype uses. */
  locale: "en-GB",
  /** How often live screens (runs, run receipt) ask the API again. */
  pollMs: 3000,
  /** Delay before a typed search filter is applied. */
  searchDebounceMs: 200,
  /** Toasts stay this long. */
  toastMs: 3500,
} as const;
