import { config } from "../config";
import { catalog } from "../content/catalog";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const relative = new Intl.RelativeTimeFormat(config.locale, { numeric: "auto" });
const numbers = new Intl.NumberFormat(config.locale);
const dayMonth = new Intl.DateTimeFormat(config.locale, { day: "2-digit", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat(config.locale, { day: "2-digit", month: "short", year: "numeric" });
const clock = new Intl.DateTimeFormat(config.locale, { hour: "2-digit", minute: "2-digit", hour12: false });
const weekday = new Intl.DateTimeFormat(config.locale, { weekday: "short" });

export function formatNumber(value: number): string {
  return numbers.format(value);
}

/** "1,055 ms" */
export function formatMs(value: number): string {
  return catalog.units.ms.replace("{n}", numbers.format(Math.round(value)));
}

/** "2 min ago", "1 hour ago" for the recent past, then days. */
export function formatAgo(at: number, now = Date.now()): string {
  const diff = at - now;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return catalog.time.justNow;
  if (abs < HOUR) return catalog.time.minutesAgo.replace("{n}", String(Math.round(abs / MINUTE)));
  if (abs < DAY) return relative.format(Math.round(diff / HOUR), "hour");
  return formatDay(at, now);
}

/** "Today", "Yesterday", "3 days ago", "1 week ago". */
export function formatDay(at: number, now = Date.now()): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const days = Math.floor((start.getTime() - at) / DAY) + 1;
  if (at >= start.getTime()) return capitalize(relative.format(0, "day"));
  if (days < 7) return capitalize(relative.format(-days, "day"));
  return capitalize(relative.format(-Math.floor(days / 7), "week"));
}

/** "in 23 minutes", "in 5 hours", "in 6 days". */
export function formatIn(at: number, now = Date.now()): string {
  const ahead = Math.max(0, at - now);
  if (ahead < HOUR) return relative.format(Math.max(1, Math.round(ahead / MINUTE)), "minute");
  if (ahead < DAY) return relative.format(Math.round(ahead / HOUR), "hour");
  return relative.format(Math.round(ahead / DAY), "day");
}

/** "09 Oct, 12:05" */
export function formatStamp(at: number): string {
  return `${dayMonth.format(at)}, ${clock.format(at)}`;
}

/** "09 Oct 2026, 12:04" */
export function formatStampLong(at: number): string {
  return `${dayMonthYear.format(at)}, ${clock.format(at)}`;
}

/** "08 Oct" */
export function formatDayMonth(at: number): string {
  return dayMonth.format(at);
}

/** "09 Oct 2026" */
export function formatDate(at: number): string {
  return dayMonthYear.format(at);
}

/** "Mon 08:00" for a weekday and a time of day. */
export function formatWeekly(weekdayIndex: number, hour: number, minute: number): string {
  const anchor = new Date(2024, 0, 7 + weekdayIndex, hour, minute);
  return `${weekday.format(anchor)} ${clock.format(anchor)}`;
}

/** "Engine, API and Identity" in the app's locale. */
export function formatList(items: string[]): string {
  return new Intl.ListFormat(config.locale, { type: "conjunction" }).format(items);
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase(config.locale) + text.slice(1);
}
