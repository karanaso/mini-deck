"use client";

import { FaceGrinning } from "lucide-react";
import { toast } from "sonner";

import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  createTextElement,
} from "@mini-deck/deck";

import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EMOJI_CATEGORIES,
  emojiForCategory,
  type EmojiEntry,
} from "@/lib/emoji";
import { useEditorStore } from "@/store/editor-store";

import { toolButtonClassName } from "./tool-button";

const EMOJI_SIZE = 240;
const EMOJI_HEIGHT = 160;

export function EmojiMenu({ slideId }: { slideId: string }) {
  const { t } = useI18n();
  const { doc, undoManager } = useDeckContext();
  const selectOnly = useEditorStore((state) => state.selectOnly);
  const setTool = useEditorStore((state) => state.setTool);

  function insert(entry: EmojiEntry) {
    try {
      const id = createTextElement(doc, slideId, {
        x: (SLIDE_WIDTH - EMOJI_SIZE) / 2,
        y: (SLIDE_HEIGHT - EMOJI_HEIGHT) / 2,
        width: EMOJI_SIZE,
        height: EMOJI_HEIGHT,
        text: entry.emoji,
        fontSize: 96,
        align: "center",
      });
      selectOnly(id);
      setTool("select");
      undoManager.stopCapturing();
      toast.success(t("editor.emoji.inserted"));
    } catch {
      toast.error(t("errors.deck.addElement"));
    }
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="tool-emoji"
          aria-label={t("editor.tools.emoji")}
          className={toolButtonClassName(false)}
        >
          <FaceGrinning className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <DropdownMenuLabel>{t("editor.emoji.heading")}</DropdownMenuLabel>
        {EMOJI_CATEGORIES.map((category) => (
          <div key={category.id} className="mb-2 last:mb-0">
            <p className="px-2.5 pb-1 pt-1 text-[11px] font-medium text-slate-500">
              {t(category.labelKey)}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {emojiForCategory(category.id).map((entry) => (
                <DropdownMenuItem
                  key={entry.id}
                  data-testid={`emoji-${entry.id}`}
                  aria-label={t("editor.emoji.insert", {
                    name: t(entry.nameKey),
                  })}
                  onSelect={() => insert(entry)}
                  className="h-8 w-8 justify-center p-0 text-lg"
                >
                  <span aria-hidden="true">{entry.emoji}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
