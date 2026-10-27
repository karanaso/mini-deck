"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, LockKeyhole, RefreshCcw } from "lucide-react";

import { DeckProvider } from "@/components/editor/deck-provider";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { addRecent } from "@/lib/recents";
import { fetchDeckSession, readFragmentToken, type DeckSession } from "@/lib/session";

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; session: DeckSession; token: string };

export function DeckLoader({ deckId }: { deckId: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const handleHashChange = () => setAttempt((value) => value + 1);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    let active = true;
    const token = readFragmentToken(window.location.hash);
    if (!token) {
      setState({ status: "not-found" });
      return;
    }

    setState({ status: "loading" });
    fetchDeckSession(deckId, token)
      .then((session) => {
        if (!active) return;
        if (!session) {
          setState({ status: "not-found" });
          return;
        }
        if (session.role === "editor") {
          addRecent({
            deckId,
            editToken: token,
            title: session.title,
            lastOpenedAt: Date.now(),
          });
        }
        setState({ status: "ready", session, token });
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Could not open deck", error);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [deckId, attempt]);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">{t("deckShell.opening")}</p>
        </div>
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <LockKeyhole className="h-5 w-5 text-slate-600" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
            {t("deckShell.invalid.title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("deckShell.invalid.body")}
          </p>
          <Button asChild className="mt-6">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              {t("common.backToMiniDeck")}
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {t("deckShell.error.title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("deckShell.error.body")}
          </p>
          <Button className="mt-6" onClick={() => setAttempt((value) => value + 1)}>
            <RefreshCcw className="h-4 w-4" />
            {t("common.tryAgain")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <DeckProvider deckId={deckId} token={state.token} role={state.session.role}>
      <EditorWorkspace />
    </DeckProvider>
  );
}
