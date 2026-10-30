"use client";

import { ExternalLink } from "lucide-react";

import type { ImageCredit } from "@mini-deck/deck";

import { useI18n } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export function ImageCreditLine({ credit }: { credit?: ImageCredit }) {
  const { t } = useI18n();
  if (!credit) return null;

  const providerKey: MessageKey =
    credit.provider === "unsplash"
      ? "editor.image.provider.unsplash"
      : "editor.image.provider.pexels";

  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600"
      data-testid="style-image-credit"
    >
      <p>
        {t("editor.image.credit", {
          name: credit.photographerName,
          provider: t(providerKey),
        })}
      </p>
      <a
        href={credit.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 font-medium text-indigo-700 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {t("editor.image.creditLink", {
          name: credit.photographerName,
          provider: t(providerKey),
        })}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
