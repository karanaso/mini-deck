"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";

import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messageForError } from "@/lib/api-error";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { unlockDeckWithPin, type UnlockResult } from "@/lib/session";

export function PinGate({
  deckId,
  linkToken,
  role,
  onUnlocked,
}: {
  deckId: string;
  linkToken: string;
  role: "editor" | "viewer";
  onUnlocked: (result: UnlockResult) => void;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ key: MessageKey; params?: Record<string, string | number> } | null>(
    null,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/u.test(pin)) {
      setError({ key: "deckShell.pin.invalidLength" });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await unlockDeckWithPin(deckId, linkToken, pin);
      onUnlocked(result);
    } catch (caught) {
      const message = messageForError(caught, "deckShell.pin.error");
      setError(message);
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        data-testid="pin-gate"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
          <LockKeyhole className="h-5 w-5 text-indigo-700" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight text-slate-950">
          {t("deckShell.pin.title")}
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-slate-600">
          {t(role === "editor" ? "deckShell.pin.editBody" : "deckShell.pin.viewBody")}
        </p>

        <form className="mt-6 space-y-3" onSubmit={submit}>
          <label className="block text-xs font-semibold text-slate-700">
            {t(role === "editor" ? "deckShell.pin.editLabel" : "deckShell.pin.viewLabel")}
            <Input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/gu, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              autoFocus
              data-testid="pin-input"
              className="mt-2 h-11 text-center font-mono text-lg tracking-[0.35em]"
            />
          </label>

          {error ? (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-center text-xs text-rose-700"
              role="alert"
              data-testid="pin-error"
            >
              {t(error.key, error.params)}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || pin.length !== 6}
            data-testid="pin-submit"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? t("deckShell.pin.unlocking") : t("deckShell.pin.unlock")}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("common.backToMiniDeck")}
          </Link>
        </div>
      </div>
    </main>
  );
}
