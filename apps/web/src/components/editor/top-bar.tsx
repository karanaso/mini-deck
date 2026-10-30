"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Keyboard,
  MonitorPlay,
  Share2,
} from "lucide-react";

import { MAX_TITLE_LENGTH, setDeckTitle, setSlideTransition } from "@mini-deck/deck";

import { useDeckContext } from "@/components/editor/deck-provider";
import { ExportMenu } from "@/components/editor/export-menu";
import { ParticipantDialog } from "@/components/editor/participant-dialog";
import { ShareDialog } from "@/components/editor/share-dialog";
import { SlideTransitionMenu } from "@/components/editor/slide-transition-menu";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAwarenessStates, uniqueParticipants } from "@/hooks/use-awareness";
import { useDeckTitle, useSlideData } from "@/hooks/use-deck";
import { initials } from "@/lib/participant";
import { updateRecentTitle } from "@/lib/recents";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

export function TopBar() {
  const { t } = useI18n();
  const {
    deckId,
    token,
    role,
    doc,
    provider,
    status,
    synced,
    participant,
    undoManager,
  } = useDeckContext();
  const {
    setParticipantOpen,
    shareOpen,
    setShareOpen,
    setPresentationOpen,
    currentSlideId,
  } = useEditorStore();

  const title = useDeckTitle(doc);
  const slide = useSlideData(doc, currentSlideId);
  const awareness = useAwarenessStates(provider);
  const [draft, setDraft] = useState(title);
  const [focused, setFocused] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!focused) setDraft(title);
    if (role === "editor") updateRecentTitle(deckId, title);
  }, [deckId, focused, role, title]);

  const participants = useMemo(() => {
    const unique = uniqueParticipants(awareness);
    if (participant && !unique.some((entry) => entry.id === participant.id)) {
      return [...unique, participant];
    }
    return unique;
  }, [awareness, participant]);

  const shortcutRows = [
    { action: t("editor.shortcuts.selectMove"), keys: t("editor.shortcuts.selectMoveKeys") },
    { action: t("editor.shortcuts.text"), keys: t("editor.shortcuts.textKeys") },
    { action: t("editor.shortcuts.shapes"), keys: t("editor.shortcuts.shapesKeys") },
    { action: t("editor.shortcuts.duplicate"), keys: "⌘D / Ctrl+D" },
    { action: t("editor.shortcuts.clipboard"), keys: "⌘C / ⌘X / ⌘V" },
    { action: t("editor.shortcuts.undoRedo"), keys: "⌘Z / ⇧⌘Z" },
    { action: t("editor.shortcuts.nudge"), keys: t("editor.shortcuts.nudgeKeys") },
    { action: t("editor.shortcuts.slideNavigation"), keys: "PageUp / PageDown" },
    { action: t("editor.shortcuts.present"), keys: t("editor.shortcuts.presentKeys") },
  ];

  function commitTitle() {
    const value = draft.trim();
    if (!value) {
      setDraft(title);
      return;
    }
    setDeckTitle(doc, value);
    setDraft(value);
    undoManager.stopCapturing();
    if (role === "editor") updateRecentTitle(deckId, value);
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" aria-label={t("editor.backToAllDecks")}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("common.allDecks")}</TooltipContent>
      </Tooltip>

      <span className="hidden h-6 w-px bg-slate-200 sm:block" />

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {role === "editor" ? (
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commitTitle();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                setDraft(title);
                event.currentTarget.blur();
              }
            }}
            maxLength={MAX_TITLE_LENGTH}
            aria-label={t("editor.deckTitle")}
            data-testid="deck-title"
            className="h-8 max-w-[21rem] border-transparent bg-transparent px-2 text-sm font-semibold shadow-none hover:border-slate-200 focus:border-indigo-500"
          />
        ) : (
          <h1
            className="truncate px-2 text-sm font-semibold text-slate-950"
            data-testid="deck-title"
          >
            {title}
          </h1>
        )}
        {role === "viewer" ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {t("common.viewOnly")}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        <ConnectionBadge status={status} synced={synced} />

        <div className="hidden items-center gap-1 sm:flex" data-testid="presence">
          {participants.slice(0, 4).map((person) => (
            <Tooltip key={person.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (participant?.id === person.id) setParticipantOpen(true);
                  }}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                    participant?.id === person.id ? "cursor-pointer" : "cursor-default",
                  )}
                  style={{ backgroundColor: person.color }}
                  aria-label={
                    participant?.id === person.id
                      ? t("editor.presence.rename", { name: person.name })
                      : person.name
                  }
                >
                  {initials(person.name) || "?"}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {participant?.id === person.id
                  ? t("editor.presence.youTooltip", { name: person.name })
                  : person.name}
              </TooltipContent>
            </Tooltip>
          ))}
          {participants.length > 4 ? (
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">
              +{participants.length - 4}
            </span>
          ) : null}
        </div>

        <LocaleSwitcher />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setShortcutsOpen(true)}>
              <Keyboard className="h-4 w-4" />
              <span className="sr-only">{t("common.shortcuts")}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("common.shortcuts")}</TooltipContent>
        </Tooltip>

        {role === "editor" ? (
          <Button
            ref={shareButtonRef}
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
            data-testid="share-button"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("common.share")}</span>
          </Button>
        ) : null}

        {role === "editor" && currentSlideId ? (
          <SlideTransitionMenu
            value={slide?.transition ?? "none"}
            onValueChange={(transition) => {
              setSlideTransition(doc, currentSlideId, transition);
              undoManager.stopCapturing();
            }}
          />
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresentationOpen(true)}
          data-testid="present-button"
        >
          <MonitorPlay className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("common.present")}</span>
        </Button>

        <ExportMenu />

        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("editor.shortcuts.title")}</DialogTitle>
              <DialogDescription>
                {t("editor.shortcuts.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 text-sm">
              {shortcutRows.map((shortcut) => (
                <div key={shortcut.action} className="flex items-center justify-between gap-4">
                  <span className="text-slate-600">{shortcut.action}</span>
                  <kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) {
            requestAnimationFrame(() => shareButtonRef.current?.focus());
          }
        }}
        deckId={deckId}
        editToken={token}
      />
      <ParticipantDialog />
    </header>
  );
}

function ConnectionBadge({
  status,
  synced,
}: {
  status: "connecting" | "connected" | "disconnected";
  synced: boolean;
}) {
  const { t } = useI18n();
  const label =
    status === "connected"
      ? synced
        ? t("editor.connection.live")
        : t("editor.connection.syncing")
      : status === "connecting"
        ? t("editor.connection.connecting")
        : t("editor.connection.offline");
  const color =
    status === "connected"
      ? "bg-emerald-500"
      : status === "connecting"
        ? "bg-amber-400"
        : "bg-slate-400";
  return (
    <span
      className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 md:flex"
      data-testid="connection-badge"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      {label}
    </span>
  );
}
