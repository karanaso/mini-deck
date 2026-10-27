"use client";

import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";

import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
          {t("deckShell.errorPage.eyebrow")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {t("deckShell.errorPage.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("deckShell.errorPage.body")}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>
            <RefreshCcw className="h-4 w-4" />
            {t("common.tryAgain")}
          </Button>
          <Button variant="outline" onClick={() => window.location.assign("/")}>
            {t("common.allDecks")}
          </Button>
        </div>
      </div>
    </main>
  );
}
