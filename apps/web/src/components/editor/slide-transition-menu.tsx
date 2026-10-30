"use client";

import { Check, Wand2 } from "lucide-react";

import {
  SLIDE_TRANSITIONS,
  type SlideTransition,
} from "@mini-deck/deck";

import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MessageKey } from "@/lib/i18n/dictionaries";

const TRANSITION_KEYS: Record<SlideTransition, MessageKey> = {
  none: "editor.transition.none",
  fade: "editor.transition.fade",
  push: "editor.transition.push",
  zoom: "editor.transition.zoom",
};

export function transitionLabelKey(transition: SlideTransition): MessageKey {
  return TRANSITION_KEYS[transition];
}

export function SlideTransitionMenu({
  value,
  onValueChange,
  canEdit = true,
}: {
  value: SlideTransition;
  onValueChange: (transition: SlideTransition) => void;
  canEdit?: boolean;
}) {
  const { t } = useI18n();
  if (!canEdit) return null;

  const currentLabel = t(TRANSITION_KEYS[value]);

  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              data-testid="transition-menu"
              aria-label={t("editor.transition.current", {
                transition: currentLabel,
              })}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{currentLabel}</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("editor.transition.tooltip")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("editor.transition.label")}</DropdownMenuLabel>
        {SLIDE_TRANSITIONS.map((transition) => (
          <DropdownMenuItem
            key={transition}
            role="menuitemradio"
            aria-checked={value === transition}
            onSelect={() => onValueChange(transition)}
            data-testid={`transition-option-${transition}`}
          >
            <span className="flex h-4 w-4 items-center justify-center">
              {value === transition ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            {t(TRANSITION_KEYS[transition])}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
