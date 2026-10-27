import { describe, expect, it } from "vitest";

import { dictionaries, hasMessageKey } from "@/lib/i18n/dictionaries";
import {
  EMOJI_CATALOG,
  EMOJI_CATEGORIES,
  emojiForCategory,
} from "@/lib/emoji";

describe("emoji catalog", () => {
  it("has unique ids and emoji characters", () => {
    expect(new Set(EMOJI_CATALOG.map((entry) => entry.id)).size).toBe(
      EMOJI_CATALOG.length,
    );
    expect(new Set(EMOJI_CATALOG.map((entry) => entry.emoji)).size).toBe(
      EMOJI_CATALOG.length,
    );
  });

  it("contains pictographic emoji with no whitespace", () => {
    for (const entry of EMOJI_CATALOG) {
      expect(entry.emoji).toMatch(/\p{Extended_Pictographic}/u);
      expect(entry.emoji).not.toMatch(/\s/u);
    }
  });

  it("assigns every emoji to exactly one populated category", () => {
    const categorized = EMOJI_CATEGORIES.flatMap((category) =>
      emojiForCategory(category.id).map((entry) => entry.id),
    );

    expect(new Set(categorized).size).toBe(EMOJI_CATALOG.length);
    expect(categorized).toHaveLength(EMOJI_CATALOG.length);
    for (const category of EMOJI_CATEGORIES) {
      expect(emojiForCategory(category.id)).toHaveLength(8);
    }
  });

  it("uses localized names present in both dictionaries", () => {
    for (const entry of EMOJI_CATALOG) {
      expect(hasMessageKey(entry.nameKey)).toBe(true);
      expect(dictionaries.en[entry.nameKey]).toBeTruthy();
      expect(dictionaries.el[entry.nameKey]).toBeTruthy();
    }
    for (const category of EMOJI_CATEGORIES) {
      expect(dictionaries.en[category.labelKey]).toBeTruthy();
      expect(dictionaries.el[category.labelKey]).toBeTruthy();
    }
  });
});
