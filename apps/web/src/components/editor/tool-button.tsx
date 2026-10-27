"use client";

import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function toolButtonClassName(active?: boolean): string {
  return cn(
    "flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-indigo-500",
    active && "bg-indigo-600 text-white hover:bg-indigo-500 hover:text-white",
  );
}

export function ToolButton({
  label,
  active,
  disabled,
  onClick,
  testId,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          data-testid={testId}
          aria-label={label}
          aria-pressed={active}
          className={toolButtonClassName(active)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
