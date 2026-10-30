"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Link2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { useI18n } from "@/components/i18n/locale-provider";
import { buildDeckLinks, resetDeckAccess } from "@/lib/session";
import { messageForError } from "@/lib/api-error";
import {
  readDeckAccessValues,
  storeDeckAccessValues,
  type DeckAccessValues,
} from "@/lib/deck-access-values";
import { storeUnlockSession } from "@/lib/unlock-session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MessageKey } from "@/lib/i18n/dictionaries";

type CopyTarget = "edit" | "view" | "joinCode" | "editPin" | "viewPin";

export function ShareDialog({
  open,
  onOpenChange,
  deckId,
  linkToken,
  sessionToken,
  accessProtected,
  onResetComplete = () => window.location.reload(),
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  linkToken: string | null;
  sessionToken: string;
  accessProtected: boolean;
  onResetComplete?: () => void;
}) {
  const { locale, t } = useI18n();
  const [links, setLinks] = useState<{ editUrl: string; viewUrl: string } | null>(null);
  const [access, setAccess] = useState<DeckAccessValues | null>(null);
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(null);
      setResetArmed(false);
      return;
    }
    let active = true;
    setError(null);
    setLinks(null);
    setAccess(readDeckAccessValues(deckId));

    if (linkToken) {
      buildDeckLinks(deckId, linkToken, locale)
        .then((nextLinks) => {
          if (active) setLinks(nextLinks);
        })
        .catch(() => {
          if (active) setError("share.error");
        });
    }

    return () => {
      active = false;
    };
  }, [deckId, linkToken, locale, open]);

  async function copyValue(kind: CopyTarget, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand?.("copy");
      textarea.remove();
    }
    setCopied(kind);
    toast.success(t("common.copied"));
    setTimeout(() => setCopied(null), 1800);
  }

  async function resetAccess() {
    setResetting(true);
    try {
      const result = await resetDeckAccess(deckId, sessionToken);
      const values: DeckAccessValues = {
        deckId,
        joinCode: result.joinCode,
        editPin: result.editPin,
        viewPin: result.viewPin,
      };
      storeDeckAccessValues(values);
      storeUnlockSession({
        deckId,
        role: result.role,
        token: result.unlockToken,
        expiresAt: result.expiresAt,
      });
      setAccess(values);
      setResetArmed(false);
      toast.success(t("access.reset.done"));
      onResetComplete();
    } catch (caught) {
      const message = messageForError(caught, "access.reset.error");
      toast.error(t(message.key, message.params));
    } finally {
      setResetting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto" data-testid="share-dialog">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-12">
            <div className="space-y-1.5">
              <DialogTitle>{t("share.title")}</DialogTitle>
              <DialogDescription>{t("share.description")}</DialogDescription>
            </div>
            <LocaleSwitcher testId="share-dialog-language-switcher" />
          </div>
        </DialogHeader>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t(error)}
          </p>
        ) : (
          <div className="space-y-4">
            {links ? (
              <>
                <LinkRow
                  label={t("share.editLink")}
                  description={t("share.editLinkDescription")}
                  urlLabel={t("share.editUrlLabel")}
                  value={links.editUrl}
                  copied={copied === "edit"}
                  onCopy={() => void copyValue("edit", links.editUrl)}
                  testId="edit-link"
                />
                <LinkRow
                  label={t("share.viewLink")}
                  description={t("share.viewLinkDescription")}
                  urlLabel={t("share.viewUrlLabel")}
                  value={links.viewUrl}
                  copied={copied === "view"}
                  onCopy={() => void copyValue("view", links.viewUrl)}
                  testId="view-link"
                />
              </>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                {t("share.linksUnavailable")}
              </p>
            )}

            {accessProtected ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-800">
                    {t("access.title")}
                  </p>
                </div>
                {access ? (
                  <div className="space-y-1.5">
                    <AccessRow
                      label={t("access.joinCode")}
                      value={access.joinCode}
                      copied={copied === "joinCode"}
                      onCopy={() => void copyValue("joinCode", access.joinCode)}
                      testId="share-join-code"
                    />
                    <AccessRow
                      label={t("access.editPin")}
                      value={access.editPin}
                      copied={copied === "editPin"}
                      onCopy={() => void copyValue("editPin", access.editPin)}
                      testId="share-edit-pin"
                    />
                    <AccessRow
                      label={t("access.viewPin")}
                      value={access.viewPin}
                      copied={copied === "viewPin"}
                      onCopy={() => void copyValue("viewPin", access.viewPin)}
                      testId="share-view-pin"
                    />
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-slate-600">
                    {t("access.unknown")}
                  </p>
                )}

                {resetArmed ? (
                  <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <p className="text-xs leading-5 text-rose-800">
                      {t("access.reset.warning")}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResetArmed(false)}
                        disabled={resetting}
                        data-testid="reset-access-cancel"
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void resetAccess()}
                        disabled={resetting}
                        data-testid="reset-access-confirm"
                      >
                        {resetting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                        {t("access.reset.confirm")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResetArmed(true)}
                    data-testid="reset-access"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("access.reset.action")}
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        )}

        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t(accessProtected ? "share.warningProtected" : "share.warning")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkRow({
  label,
  description,
  urlLabel,
  value,
  copied,
  onCopy,
  testId,
}: {
  label: string;
  description: string;
  urlLabel: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  testId: string;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 text-slate-600" />
        <p className="text-xs font-semibold text-slate-800">{label}</p>
        <span className="text-[11px] text-slate-600">{description}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={value}
          aria-label={urlLabel}
          data-testid={`${testId}-url`}
          className="h-9 font-mono text-[11px]"
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCopy}
          disabled={!value}
          data-testid={`${testId}-copy`}
          className="shrink-0"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
      </div>
    </div>
  );
}

function AccessRow({
  label,
  value,
  copied,
  onCopy,
  testId,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  testId: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-2.5 py-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="font-mono text-sm tracking-[0.16em] text-slate-950" data-testid={testId}>
          {value}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCopy}
        aria-label={t("access.copyValue", { label })}
        data-testid={`${testId}-copy`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
