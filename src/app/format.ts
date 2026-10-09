import { appConfig } from "../config";

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return appConfig.emptyValue;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return appConfig.emptyValue;
  return new Intl.DateTimeFormat(appConfig.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: appConfig.timeZone,
  }).format(date);
}

export function formatAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const delta = Date.now() - then;
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(delta / 3600000);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(delta / 86400000);
  if (days <= 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export function formatUpdated(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const start = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const days = Math.round((start(new Date()) - start(then)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export function formatVersion(number: number | null): string {
  if (number === null) return appConfig.emptyValue;
  return new Intl.NumberFormat(appConfig.locale).format(number);
}

export function debounce(waitMs: number, fn: (value: string) => void): (value: string) => void {
  let timer = 0;
  return (value) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(value), waitMs);
  };
}
