export const SUPPORTED_LOCALES = ["en", "el"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "mini-deck-locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  el: "Ελληνικά",
};

export const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  el: "el-GR",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

interface LanguagePreference {
  tag: string;
  quality: number;
  index: number;
}

function parseLanguagePreferences(header: string): LanguagePreference[] {
  return header
    .split(",")
    .map((part, index): LanguagePreference => {
      const [rawTag, ...parameters] = part.trim().split(";");
      const tag = (rawTag ?? "").trim().toLowerCase();
      let quality = 1;

      for (const parameter of parameters) {
        const [rawKey, rawValue] = parameter.trim().split("=");
        if (rawKey?.trim().toLowerCase() !== "q") continue;
        const parsed = Number(rawValue);
        quality = Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0;
      }

      return { tag, quality, index };
    })
    .filter((preference) => preference.tag.length > 0 && preference.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);
}

/**
 * Selects the best supported locale from an Accept-Language header.
 *
 * Unsupported languages are skipped, so `fr, el;q=0.5` selects Greek because
 * Greek is the highest-priority supported language. A wildcard selects the
 * default locale. Invalid quality values are treated as `q=0`.
 */
export function preferredLocaleFromHeader(
  header: string | null | undefined,
): Locale {
  if (!header) return DEFAULT_LOCALE;

  for (const preference of parseLanguagePreferences(header)) {
    if (preference.tag === "el" || preference.tag.startsWith("el-")) return "el";
    if (preference.tag === "en" || preference.tag.startsWith("en-")) return "en";
    if (preference.tag === "*") return DEFAULT_LOCALE;
  }

  return DEFAULT_LOCALE;
}

export function resolveLocale(
  cookieValue: string | null | undefined,
  headerValue: string | null | undefined,
): Locale {
  return isLocale(cookieValue)
    ? cookieValue
    : preferredLocaleFromHeader(headerValue);
}

export function persistLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}
