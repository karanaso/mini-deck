"use client";

import { Check, ChevronDown, Shapes } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n/locale-provider";
import {
  SHAPE_TOOL_OPTIONS,
  shapeToolLabelKey,
} from "@/lib/shape-tools";
import { cn } from "@/lib/utils";
import { isShapeTool, type EditorTool } from "@/store/editor-store";

import { ShapePreview } from "./shape-preview";
import { toolButtonClassName } from "./tool-button";

export function ShapeMenu({
  tool,
  onSelect,
}: {
  tool: EditorTool;
  onSelect: (tool: EditorTool) => void;
}) {
  const { t } = useI18n();
  const active = isShapeTool(tool);
  const activeLabel = active ? t(shapeToolLabelKey(tool)) : null;
  const label = activeLabel
    ? `${t("editor.tools.shapes")}: ${activeLabel}`
    : t("editor.tools.shapes");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="tool-shapes"
          aria-label={label}
          aria-pressed={active}
          className={cn(toolButtonClassName(active), "w-10 gap-0.5")}
        >
          <Shapes className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{t("editor.tools.shapes")}</DropdownMenuLabel>
        {SHAPE_TOOL_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            data-testid={`tool-shape-${option.value}`}
            data-active={tool === option.value}
            onSelect={() => onSelect(option.value)}
          >
            <ShapePreview shape={option.value} />
            <span>{t(option.labelKey)}</span>
            {tool === option.value ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
