"use client";

import { useState } from "react";
import { ImagePlus, Images, Loader2, Upload } from "lucide-react";

import { useI18n } from "@/components/i18n/locale-provider";
import { ImageSearchDialog } from "@/components/editor/image-search-dialog";
import { toolButtonClassName } from "@/components/editor/tool-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StockProviderId } from "@/lib/stock-images";
import {
  fetchStockProviders,
  type ImportStockImageResult,
} from "@/lib/stock-image-client";

interface ImageMenuProps {
  deckId: string;
  token: string;
  uploading: boolean;
  onUpload: () => void;
  onSelect: (result: ImportStockImageResult) => void;
}

export function ImageMenu({
  deckId,
  token,
  uploading,
  onUpload,
  onSelect,
}: ImageMenuProps) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<StockProviderId[] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  async function handleOpenChange(open: boolean) {
    if (!open || providers !== null) return;
    try {
      setProviders(await fetchStockProviders());
    } catch {
      setProviders([]);
    }
  }

  return (
    <>
      <DropdownMenu modal={false} onOpenChange={(open) => void handleOpenChange(open)}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="tool-image"
            aria-label={t("editor.image.menu")}
            disabled={uploading}
            className={toolButtonClassName(false)}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{t("editor.image.menu")}</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={onUpload}
            data-testid="image-upload"
          >
            <Upload className="h-4 w-4 text-slate-600" />
            {t("editor.image.upload")}
          </DropdownMenuItem>
          {providers && providers.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setSearchOpen(true)}
                data-testid="image-search"
              >
                <Images className="h-4 w-4 text-slate-600" />
                {t("editor.image.search")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ImageSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        deckId={deckId}
        token={token}
        providers={providers ?? []}
        onSelect={onSelect}
      />
    </>
  );
}
