import { INTL_LOCALES, type Locale } from "./config";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(
  timestamp: number,
  locale: Locale,
  now = Date.now(),
): string {
  const difference = Math.max(0, now - timestamp);

  if (locale === "en") {
    // Keep the original English copy stable while Greek uses Intl rules.
    if (difference < MINUTE) return "Just now";
    const minutes = Math.floor(difference / MINUTE);
    if (difference < HOUR) return `${minutes}m ago`;
    const hours = Math.floor(difference / HOUR);
    if (difference < DAY) return `${hours}h ago`;
    const days = Math.floor(difference / DAY);
    if (difference < 7 * DAY) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-US");
  }

  if (difference < MINUTE) {
    return new Intl.RelativeTimeFormat(INTL_LOCALES[locale], {
      numeric: "auto",
    }).format(0, "second");
  }

  if (difference < HOUR) {
    return new Intl.RelativeTimeFormat(INTL_LOCALES[locale], {
      numeric: "auto",
    }).format(-Math.floor(difference / MINUTE), "minute");
  }

  if (difference < DAY) {
    return new Intl.RelativeTimeFormat(INTL_LOCALES[locale], {
      numeric: "auto",
    }).format(-Math.floor(difference / HOUR), "hour");
  }

  if (difference < 7 * DAY) {
    return new Intl.RelativeTimeFormat(INTL_LOCALES[locale], {
      numeric: "auto",
    }).format(-Math.floor(difference / DAY), "day");
  }

  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    dateStyle: "medium",
  }).format(timestamp);
}

export function formatDate(timestamp: number, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    dateStyle: "medium",
  }).format(timestamp);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale]).format(value);
}
