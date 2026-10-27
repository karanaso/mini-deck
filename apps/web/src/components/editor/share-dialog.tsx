"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { useI18n } from "@/components/i18n/locale-provider";
import { buildDeckLinks } from "@/lib/session";
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

export function ShareDialog({
  open,
  onOpenChange,
  deckId,
  editToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  editToken: string;
}) {
  const { locale, t } = useI18n();
  const [links, setLinks] = useState<{ editUrl: string; viewUrl: string } | null>(null);
  const [copied, setCopied] = useState<"edit" | "view" | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);

  useEffect(() => {
    if (!open) {
      setCopied(null);
      return;
    }
    let active = true;
    setError(null);
    setLinks(null);
    buildDeckLinks(deckId, editToken, locale)
      .then((nextLinks) => {
        if (active) setLinks(nextLinks);
      })
      .catch(() => {
        if (active) setError("share.error");
      });
    return () => {
      active = false;
    };
  }, [deckId, editToken, locale, open]);

  async function copyLink(kind: "edit" | "view", value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(kind);
    toast.success(
      t(kind === "edit" ? "share.editLinkCopied" : "share.viewLinkCopied"),
    );
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" data-testid="share-dialog">
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
            <LinkRow
              label={t("share.editLink")}
              description={t("share.editLinkDescription")}
              urlLabel={t("share.editUrlLabel")}
              value={links?.editUrl ?? ""}
              copied={copied === "edit"}
              onCopy={() => links && copyLink("edit", links.editUrl)}
              testId="edit-link"
            />
            <LinkRow
              label={t("share.viewLink")}
              description={t("share.viewLinkDescription")}
              urlLabel={t("share.viewUrlLabel")}
              value={links?.viewUrl ?? ""}
              copied={copied === "view"}
              onCopy={() => links && copyLink("view", links.viewUrl)}
              testId="view-link"
            />
          </div>
        )}

        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("share.warning")}</p>
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
