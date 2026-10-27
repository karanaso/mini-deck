"use client";

import { Check, ChevronDown, Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n/locale-provider";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n/config";

export function LocaleSwitcher({
  testId = "language-switcher",
}: {
  testId?: string;
} = {}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("a11y.language")}
          data-testid={testId}
          className="gap-1.5 px-2"
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wide">
            {locale}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60]">
        <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
        {SUPPORTED_LOCALES.map((code) => {
          const active = code === locale;
          return (
            <DropdownMenuItem
              key={code}
              role="menuitemradio"
              aria-checked={active}
              aria-label={t("a11y.languageOption", {
                language: LOCALE_LABELS[code],
              })}
              data-testid={`language-option-${code}`}
              onSelect={() => setLocale(code)}
              className="justify-between"
            >
              <span>{LOCALE_LABELS[code]}</span>
              {active ? <Check className="h-4 w-4 text-indigo-600" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
