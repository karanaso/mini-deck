"use client";

import { useEffect, useState } from "react";

import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEditorStore } from "@/store/editor-store";

export function ParticipantDialog() {
  const { t } = useI18n();
  const { participant, renameParticipant } = useDeckContext();
  const open = useEditorStore((state) => state.participantOpen);
  const setOpen = useEditorStore((state) => state.setParticipantOpen);
  const [name, setName] = useState(participant?.name ?? "");

  useEffect(() => {
    if (open) setName(participant?.name ?? "");
  }, [open, participant?.name]);

  function save() {
    if (!name.trim()) return;
    renameParticipant(name);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-testid="participant-dialog">
        <DialogHeader>
          <DialogTitle>{t("participant.title")}</DialogTitle>
          <DialogDescription>{t("participant.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: participant?.color ?? "#4f46e5" }}
          >
            {(name || "?").slice(0, 1).toUpperCase()}
          </span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            aria-label={t("participant.label")}
            data-testid="participant-name"
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} disabled={!name.trim()} data-testid="save-participant">
            {t("participant.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
