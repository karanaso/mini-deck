"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";

import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeckAccessValues } from "@/lib/deck-access-values";

type CopyTarget = "joinCode" | "editPin" | "viewPin";

export function DeckCreatedDialog({
  open,
  onOpenChange,
  values,
  onOpenEditor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: DeckAccessValues | null;
  onOpenEditor: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<CopyTarget | null>(null);

  async function copy(target: CopyTarget, value: string) {
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
    setCopied(target);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="deck-created-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <KeyRound className="h-4 w-4" />
            </span>
            <DialogTitle>{t("access.created.title")}</DialogTitle>
          </div>
          <DialogDescription>{t("access.created.description")}</DialogDescription>
        </DialogHeader>

        {values ? (
          <div className="space-y-2">
            <AccessRow
              label={t("access.joinCode")}
              value={values.joinCode}
              copied={copied === "joinCode"}
              onCopy={() => void copy("joinCode", values.joinCode)}
              testId="created-join-code"
            />
            <AccessRow
              label={t("access.editPin")}
              value={values.editPin}
              copied={copied === "editPin"}
              onCopy={() => void copy("editPin", values.editPin)}
              testId="created-edit-pin"
            />
            <AccessRow
              label={t("access.viewPin")}
              value={values.viewPin}
              copied={copied === "viewPin"}
              onCopy={() => void copy("viewPin", values.viewPin)}
              testId="created-view-pin"
            />
          </div>
        ) : null}

        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("access.created.warning")}</p>
        </div>

        <Button type="button" onClick={onOpenEditor} data-testid="created-open-editor">
          {t("access.created.openEditor")}
        </Button>
      </DialogContent>
    </Dialog>
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="font-mono text-lg tracking-[0.18em] text-slate-950" data-testid={testId}>
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopy}
        aria-label={t("access.copyValue", { label })}
        data-testid={`${testId}-copy`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t("common.copied") : t("common.copy")}
      </Button>
    </div>
  );
}
