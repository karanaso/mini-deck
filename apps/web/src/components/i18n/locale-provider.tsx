"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  persistLocaleCookie,
  type Locale,
} from "@/lib/i18n/config";
import {
  dictionaries,
  translate,
  translateCount,
  type MessageKey,
  type MessageParams,
} from "@/lib/i18n/dictionaries";

interface I18nContextValue {
  locale: Locale;
  t: (key: MessageKey, params?: MessageParams) => string;
  tCount: (baseKey: string, count: number) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside LocaleProvider");
  return value;
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = dictionaries[locale]["metadata.title"];
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      persistLocaleCookie(next);
      document.documentElement.lang = next;
      document.title = dictionaries[next]["metadata.title"];
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
      tCount: (baseKey, count) => translateCount(locale, baseKey, count),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
