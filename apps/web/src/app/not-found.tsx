import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export default async function NotFound() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          {t["deckShell.notFound.eyebrow"]}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          {t["deckShell.notFound.title"]}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t["deckShell.notFound.body"]}
        </p>
        <Button asChild className="mt-6">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            {t["common.backToMiniDeck"]}
          </Link>
        </Button>
      </div>
    </main>
  );
}
