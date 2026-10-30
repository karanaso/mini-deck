"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Hash, Loader2, LockKeyhole, Pencil, Eye } from "lucide-react";

import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { messageForError } from "@/lib/api-error";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { lookupJoinCode, unlockJoinCode } from "@/lib/session";
import { readUnlockSession, storeUnlockSession } from "@/lib/unlock-session";

type Stage = "code" | "role" | "pin";
type Role = "editor" | "viewer";

interface JoinError {
  key: MessageKey;
  params?: Record<string, string | number>;
}

export function JoinDeckDialog({
  open,
  onOpenChange,
  navigate = (path) => window.location.assign(path),
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigate?: (path: string) => void;
}) {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>("code");
  const [code, setCode] = useState("");
  const [deck, setDeck] = useState<{ deckId: string; title: string } | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<JoinError | null>(null);

  useEffect(() => {
    if (!open) return;
    setStage("code");
    setCode("");
    setDeck(null);
    setRole(null);
    setPin("");
    setError(null);
    setLoading(false);
  }, [open]);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const found = await lookupJoinCode(code);
      if (readUnlockSession(found.deckId)) {
        onOpenChange(false);
        navigate(`/d/${found.deckId}`);
        return;
      }
      setDeck(found);
      setStage("role");
    } catch (caught) {
      const message = messageForError(caught, "deckShell.invalid.title");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function chooseRole(next: Role) {
    setRole(next);
    setPin("");
    setError(null);
    setStage("pin");
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deck || !role) return;
    if (!/^\d{6}$/u.test(pin)) {
      setError({ key: "deckShell.pin.invalidLength" });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await unlockJoinCode(code, role, pin);
      storeUnlockSession({
        deckId: result.deckId,
        role: result.role,
        token: result.unlockToken,
        expiresAt: result.expiresAt,
      });
      onOpenChange(false);
      navigate(`/d/${result.deckId}`);
    } catch (caught) {
      const message = messageForError(caught, "deckShell.pin.error");
      setError(message);
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-testid="join-deck-dialog">
        <DialogHeader>
          <DialogTitle>{t("join.title")}</DialogTitle>
          <DialogDescription>{t("join.description")}</DialogDescription>
        </DialogHeader>

        {stage === "code" ? (
          <form className="space-y-3" onSubmit={lookup}>
            <label className="block text-xs font-semibold text-slate-700">
              {t("join.codeLabel")}
              <Input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/gu, "").slice(0, 7))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{7}"
                maxLength={7}
                autoFocus
                data-testid="join-code-input"
                className="mt-2 h-11 text-center font-mono text-lg tracking-[0.3em]"
              />
            </label>
            {error ? (
              <p className="text-xs text-rose-700" role="alert" data-testid="join-error">
                {t(error.key, error.params)}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.length !== 7}
              data-testid="join-code-submit"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
              {loading ? t("join.lookingUp") : t("join.findDeck")}
            </Button>
          </form>
        ) : null}

        {stage === "role" && deck ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-600">{t("join.found")}</p>
            <p
              className="text-center text-lg font-semibold text-slate-950"
              data-testid="join-deck-title"
            >
              {deck.title}
            </p>
            <div className="grid gap-2">
              <Button
                type="button"
                onClick={() => chooseRole("editor")}
                data-testid="join-role-edit"
              >
                <Pencil className="h-4 w-4" />
                {t("join.edit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => chooseRole("viewer")}
                data-testid="join-role-view"
              >
                <Eye className="h-4 w-4" />
                {t("join.view")}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStage("code");
                setDeck(null);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("join.otherCode")}
            </Button>
          </div>
        ) : null}

        {stage === "pin" && deck && role ? (
          <form className="space-y-3" onSubmit={unlock}>
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{deck.title}</p>
              <p className="text-xs text-slate-600">
                {t(role === "editor" ? "join.editPinHint" : "join.viewPinHint")}
              </p>
            </div>
            <Input
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/gu, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              autoFocus
              aria-label={t(role === "editor" ? "access.editPin" : "access.viewPin")}
              data-testid="join-pin-input"
              className="h-11 text-center font-mono text-lg tracking-[0.35em]"
            />
            {error ? (
              <p className="text-xs text-rose-700" role="alert" data-testid="join-error">
                {t(error.key, error.params)}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || pin.length !== 6}
              data-testid="join-pin-submit"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t("join.unlocking") : t("deckShell.pin.unlock")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setStage("role");
                setRole(null);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("join.backToRole")}
            </Button>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
