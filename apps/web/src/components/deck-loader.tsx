"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, LockKeyhole, RefreshCcw } from "lucide-react";

import { DeckProvider } from "@/components/editor/deck-provider";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { PinGate } from "@/components/editor/pin-gate";
import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { addRecent } from "@/lib/recents";
import {
  fetchDeckSession,
  readFragmentToken,
  type DeckSession,
  type UnlockResult,
} from "@/lib/session";
import {
  clearUnlockSession,
  readUnlockSession,
  storeUnlockSession,
} from "@/lib/unlock-session";

type LoadState =
  | { status: "loading" }
  | { status: "pin"; role: "editor" | "viewer"; linkToken: string }
  | { status: "not-found" }
  | { status: "error" }
  | {
      status: "ready";
      session: DeckSession;
      token: string;
      linkToken: string | null;
    };

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
    const linkToken = readFragmentToken(window.location.hash);
    const stored = readUnlockSession(deckId);

    if (!linkToken && !stored) {
      setState({ status: "not-found" });
      return;
    }

    setState({ status: "loading" });

    async function resolveSession(): Promise<void> {
      if (!linkToken) {
        if (!stored) {
          setState({ status: "not-found" });
          return;
        }
        const result = await fetchDeckSession(deckId, stored.token);
        if (!active) return;
        if (result.status === "ready") {
          setState({
            status: "ready",
            session: result.session,
            token: stored.token,
            linkToken: null,
          });
          return;
        }
        clearUnlockSession(deckId);
        setState({ status: "not-found" });
        return;
      }

      const linkResult = await fetchDeckSession(deckId, linkToken);
      if (!active) return;
      if (linkResult.status === "not_found") {
        clearUnlockSession(deckId);
        setState({ status: "not-found" });
        return;
      }

      if (linkResult.status === "ready") {
        if (linkResult.session.role === "editor") {
          addRecent({
            deckId,
            editToken: linkToken,
            title: linkResult.session.title,
            lastOpenedAt: Date.now(),
          });
        }
        setState({
          status: "ready",
          session: linkResult.session,
          token: linkToken,
          linkToken,
        });
        return;
      }

      if (stored && stored.role === linkResult.role) {
        const storedResult = await fetchDeckSession(deckId, stored.token);
        if (!active) return;
        if (storedResult.status === "ready") {
          if (storedResult.session.role === "editor") {
            addRecent({
              deckId,
              editToken: linkToken,
              title: storedResult.session.title,
              lastOpenedAt: Date.now(),
            });
          }
          setState({
            status: "ready",
            session: storedResult.session,
            token: stored.token,
            linkToken,
          });
          return;
        }
        clearUnlockSession(deckId);
      }

      setState({ status: "pin", role: linkResult.role, linkToken });
    }

    resolveSession().catch((error: unknown) => {
      if (!active) return;
      console.error("Could not open deck", error);
      setState({ status: "error" });
    });

    return () => {
      active = false;
    };
  }, [deckId, attempt]);

  function handleUnlocked(result: UnlockResult, linkToken: string): void {
    storeUnlockSession({
      deckId,
      role: result.role,
      token: result.unlockToken,
      expiresAt: result.expiresAt,
    });
    if (result.role === "editor") {
      addRecent({
        deckId,
        editToken: linkToken,
        title: result.title,
        lastOpenedAt: Date.now(),
      });
    }
    setState({
      status: "ready",
      session: {
        role: result.role,
        title: result.title,
        protected: result.protected,
      },
      token: result.unlockToken,
      linkToken,
    });
  }

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

  if (state.status === "pin") {
    return (
      <PinGate
        deckId={deckId}
        linkToken={state.linkToken}
        role={state.role}
        onUnlocked={(result) => handleUnlocked(result, state.linkToken)}
      />
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
    <DeckProvider
      deckId={deckId}
      token={state.token}
      linkToken={state.linkToken}
      accessProtected={state.session.protected}
      role={state.session.role}
    >
      <EditorWorkspace />
    </DeckProvider>
  );
}
