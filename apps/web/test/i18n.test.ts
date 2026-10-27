import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  isLocale,
  preferredLocaleFromHeader,
  resolveLocale,
} from "@/lib/i18n/config";
import {
  en,
} from "@/lib/i18n/dictionaries/en";
import { el } from "@/lib/i18n/dictionaries/el";
import {
  interpolate,
  placeholders,
  translate,
  translateCount,
} from "@/lib/i18n/dictionaries";
import {
  formatDate,
  formatNumber,
  formatRelativeTime,
} from "@/lib/i18n/format";
import { formatLastOpened } from "@/lib/recents";

describe("locale selection", () => {
  it.each([
    ["el", "el"],
    ["el-GR", "el"],
    ["el-GR,el;q=0.9,en;q=0.8", "el"],
    ["en;q=0.8, el;q=0.9", "el"],
    ["fr-FR,fr;q=0.9", "en"],
    ["fr, el;q=0.5", "el"],
    ["*", "en"],
    ["", "en"],
    [";;;q=abc", "en"],
    ["el;q=0, en;q=0.5", "en"],
    ["el;q=0", "en"],
    ["en-US,en;q=0.9", "en"],
  ])("maps %s to %s", (header, expected) => {
    expect(preferredLocaleFromHeader(header)).toBe(expected);
  });

  it("uses the default locale when the header is absent", () => {
    expect(preferredLocaleFromHeader(null)).toBe(DEFAULT_LOCALE);
    expect(preferredLocaleFromHeader(undefined)).toBe(DEFAULT_LOCALE);
  });

  it("validates locale values", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("el")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("prefers a valid cookie over the browser header", () => {
    expect(resolveLocale("en", "el-GR")).toBe("en");
    expect(resolveLocale("el", "en-US")).toBe("el");
  });

  it("ignores an invalid cookie and falls back to the header", () => {
    expect(resolveLocale("fr", "el-GR")).toBe("el");
    expect(resolveLocale("", "el")).toBe("el");
    expect(resolveLocale(null, "el")).toBe("el");
    expect(resolveLocale(undefined, null)).toBe("en");
  });
});

describe("dictionaries", () => {
  it("has identical English and Greek key sets", () => {
    expect(Object.keys(el).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no empty values and matching placeholders", () => {
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(en[key].trim(), key).not.toBe("");
      expect(el[key].trim(), key).not.toBe("");
      expect(placeholders(el[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it("never returns a raw key for a known translation", () => {
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(translate("en", key), key).not.toBe(key);
      expect(translate("el", key), key).not.toBe(key);
    }
  });

  it("interpolates repeated placeholders and preserves missing ones", () => {
    expect(interpolate("Hello {name}, {name}", { name: "Ada" })).toBe(
      "Hello Ada, Ada",
    );
    expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
    expect(interpolate("No placeholders", { name: "Ada" })).toBe(
      "No placeholders",
    );
  });

  it("selects singular and plural forms in both locales", () => {
    expect(translateCount("en", "format.elements", 0)).toBe("0 elements");
    expect(translateCount("en", "format.elements", 1)).toBe("1 element");
    expect(translateCount("en", "format.elements", 2)).toBe("2 elements");
    expect(translateCount("el", "format.elements", 0)).toBe("0 στοιχεία");
    expect(translateCount("el", "format.elements", 1)).toBe("1 στοιχείο");
    expect(translateCount("el", "format.elements", 2)).toBe("2 στοιχεία");
  });
});

describe("locale-aware formatting", () => {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0);

  it("formats Greek relative times", () => {
    expect(formatRelativeTime(now - 20_000, "el", now)).toBe("τώρα");
    expect(formatRelativeTime(now - 5 * 60_000, "el", now)).toBe(
      "πριν από 5 λεπτά",
    );
    expect(formatRelativeTime(now - 2 * 60 * 60_000, "el", now)).toBe(
      "πριν από 2 ώρες",
    );
    expect(formatRelativeTime(now - 24 * 60 * 60_000, "el", now)).toBe("χθες");
    expect(formatRelativeTime(now - 3 * 24 * 60 * 60_000, "el", now)).toBe(
      "πριν από 3 ημέρες",
    );
  });

  it("does not use English relative suffixes in Greek", () => {
    const value = formatRelativeTime(now - 5 * 60_000, "el", now);
    expect(value).not.toContain("m ago");
    expect(value).not.toContain("minutes ago");
  });

  it("preserves the existing English relative-time copy", () => {
    expect(formatRelativeTime(now - 20_000, "en", now)).toBe("Just now");
    expect(formatRelativeTime(now - 5 * 60_000, "en", now)).toBe("5m ago");
    expect(formatRelativeTime(now - 2 * 60 * 60_000, "en", now)).toBe("2h ago");
    expect(formatRelativeTime(now - 3 * 24 * 60 * 60_000, "en", now)).toBe(
      "3d ago",
    );
  });

  it("formats absolute dates and numbers per locale", () => {
    expect(formatDate(now, "el")).toContain("2026");
    expect(formatDate(now, "el")).not.toBe(formatDate(now, "en"));
    expect(formatNumber(1234.5, "el")).not.toBe(formatNumber(1234.5, "en"));
  });

  it("uses the locale in the recent-deck timestamp helper", () => {
    expect(formatLastOpened(now - 5 * 60_000, "el", now)).toBe(
      "πριν από 5 λεπτά",
    );
    expect(formatLastOpened(now - 5 * 60_000, "en", now)).toBe("5m ago");
  });
});
