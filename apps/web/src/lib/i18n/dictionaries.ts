import { DEFAULT_LOCALE, INTL_LOCALES, type Locale } from "./config";
import { el } from "./dictionaries/el";
import { en, type EnglishDictionary } from "./dictionaries/en";

export type Dictionary = EnglishDictionary;
export type MessageKey = keyof Dictionary;
export type MessageParams = Record<string, string | number>;

export const dictionaries: Record<Locale, Dictionary> = { en, el };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function hasMessageKey(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(en, key);
}

export function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : placeholder,
  );
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: MessageParams,
): string {
  return interpolate(getDictionary(locale)[key], params);
}

export function translateCount(
  locale: Locale,
  baseKey: string,
  count: number,
): string {
  const dictionary = getDictionary(locale);
  const category = new Intl.PluralRules(INTL_LOCALES[locale]).select(count);
  const categoryKey = `${baseKey}.${category}`;
  const fallbackKey = `${baseKey}.other`;
  const template =
    (hasMessageKey(categoryKey) ? dictionary[categoryKey] : undefined) ??
    (hasMessageKey(fallbackKey) ? dictionary[fallbackKey] : undefined);

  if (!template) return baseKey;
  return interpolate(template, { count });
}

export function placeholders(template: string): string[] {
  return Array.from(template.matchAll(/\{(\w+)\}/g), (match) => match[1]).sort();
}
