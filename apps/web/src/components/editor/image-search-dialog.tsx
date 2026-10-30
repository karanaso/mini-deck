"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import type { StockProviderId, StockOrientation, StockPhotoSummary } from "@/lib/stock-images";
import { messageForError } from "@/lib/api-error";
import {
  importStockImage,
  searchStockImages,
  type ImportStockImageResult,
} from "@/lib/stock-image-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";

interface ImageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  token: string;
  providers: StockProviderId[];
  onSelect: (result: ImportStockImageResult) => void;
}

const ORIENTATIONS: StockOrientation[] = ["landscape", "portrait", "all"];

function providerKey(provider: StockProviderId): MessageKey {
  return provider === "unsplash"
    ? "editor.image.provider.unsplash"
    : "editor.image.provider.pexels";
}

function orientationKey(orientation: StockOrientation): MessageKey {
  return orientation === "landscape"
    ? "editor.image.orientation.landscape"
    : orientation === "portrait"
      ? "editor.image.orientation.portrait"
      : "editor.image.orientation.all";
}

export function ImageSearchDialog({
  open,
  onOpenChange,
  deckId,
  token,
  providers,
  onSelect,
}: ImageSearchDialogProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [provider, setProvider] = useState<StockProviderId>(
    providers[0] ?? "pexels",
  );
  const [orientation, setOrientation] = useState<StockOrientation>("landscape");
  const [results, setResults] = useState<StockPhotoSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (providers.length > 0 && !providers.includes(provider)) {
      setProvider(providers[0]);
    }
  }, [provider, providers]);

  useEffect(() => {
    if (!open) {
      requestId.current += 1;
      setError(null);
      setLoading(false);
      setLoadingMore(false);
    }
  }, [open]);

  async function runSearch(
    targetProvider: StockProviderId,
    targetQuery: string,
    targetPage: number,
    append: boolean,
  ): Promise<void> {
    const trimmed = targetQuery.trim();
    if (!trimmed) return;

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setError(null);
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const result = await searchStockImages(deckId, token, {
        provider: targetProvider,
        query: trimmed,
        page: targetPage,
        orientation,
      });
      if (requestId.current !== currentRequest) return;
      setResults((existing) =>
        append ? [...existing, ...result.results] : result.results,
      );
      setPage(result.page);
      setHasMore(result.hasMore);
      setSubmittedQuery(trimmed);
    } catch (caught) {
      if (requestId.current !== currentRequest) return;
      setError(caught);
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(provider, query, 1, false);
  }

  function chooseProvider(next: StockProviderId) {
    setProvider(next);
    if (query.trim()) {
      void runSearch(next, query, 1, false);
    }
  }

  function chooseOrientation(next: StockOrientation) {
    setOrientation(next);
    if (submittedQuery) {
      void runSearch(provider, submittedQuery, 1, false);
    }
  }

  async function importPhoto(photo: StockPhotoSummary) {
    if (importingId) return;
    setImportingId(photo.id);
    try {
      const imported = await importStockImage(deckId, token, {
        provider: photo.provider,
        photoId: photo.id,
      });
      onSelect(imported);
      toast.success(t("editor.image.imported"));
      onOpenChange(false);
    } catch (caught) {
      const message = messageForError(caught, "editor.image.importError");
      toast.error(t(message.key, message.params));
    } finally {
      setImportingId(null);
    }
  }

  const errorMessage = error ? messageForError(error, "editor.image.importError") : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] max-w-3xl overflow-y-auto"
        data-testid="image-search-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("editor.image.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("editor.image.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("editor.image.queryPlaceholder")}
            aria-label={t("editor.image.queryLabel")}
            data-testid="image-search-input"
            autoFocus
            maxLength={100}
          />
          <Button
            type="submit"
            disabled={!query.trim() || loading}
            data-testid="image-search-submit"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? t("editor.image.searching") : t("editor.image.searchAction")}
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-1 rounded-xl bg-slate-100 p-1"
            role="group"
            aria-label={t("editor.image.providerLabel")}
            data-testid="image-provider-tabs"
          >
            {providers.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => chooseProvider(entry)}
                aria-pressed={provider === entry}
                data-testid={`image-provider-${entry}`}
                className={
                  provider === entry
                    ? "rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                    : "rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                }
              >
                {t(providerKey(entry))}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            {t("editor.image.orientationLabel")}
            <select
              value={orientation}
              onChange={(event) =>
                chooseOrientation(event.target.value as StockOrientation)
              }
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              data-testid="image-orientation"
            >
              {ORIENTATIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {t(orientationKey(entry))}
                </option>
              ))}
            </select>
          </label>
        </div>

        {errorMessage ? (
          <div
            className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
            data-testid="image-search-error"
          >
            <span>{t(errorMessage.key, errorMessage.params)}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void runSearch(provider, query || submittedQuery, page, false)
              }
            >
              {t("common.tryAgain")}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div
            className="flex items-center justify-center gap-2 py-10 text-sm text-slate-600"
            role="status"
            data-testid="image-search-loading"
          >
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            {t("editor.image.searching")}
          </div>
        ) : null}

        {!loading && !errorMessage && submittedQuery && results.length === 0 ? (
          <div
            className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center"
            data-testid="image-search-empty"
          >
            <Search className="h-5 w-5 text-slate-500" />
            <p className="text-sm font-medium text-slate-800">
              {t("editor.image.empty", { query: submittedQuery })}
            </p>
            <p className="text-xs text-slate-600">{t("editor.image.emptyHint")}</p>
          </div>
        ) : null}

        {results.length > 0 ? (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            data-testid="image-search-results"
          >
            {results.map((photo) => (
              <div
                key={`${photo.provider}-${photo.id}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => void importPhoto(photo)}
                  disabled={importingId !== null}
                  aria-label={t("editor.image.alt", {
                    name: photo.photographerName,
                  })}
                  data-testid={`image-result-${photo.id}`}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 disabled:cursor-wait"
                >
                  {/* Provider thumbnails are public CDN URLs; imported bytes are stored locally. */}
                  <img
                    src={photo.thumbnailUrl}
                    alt={t("editor.image.alt", { name: photo.photographerName })}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  {importingId === photo.id ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span className="sr-only">{t("editor.image.importing")}</span>
                    </span>
                  ) : null}
                </button>
                <div
                  className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px] text-slate-600"
                  data-testid="image-credit"
                >
                  <span className="truncate">
                    {t("editor.image.credit", {
                      name: photo.photographerName,
                      provider: t(providerKey(photo.provider)),
                    })}
                  </span>
                  <a
                    href={photo.photographerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("editor.image.creditLink", {
                      name: photo.photographerName,
                      provider: t(providerKey(photo.provider)),
                    })}
                    className="shrink-0 rounded p-0.5 text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {hasMore && results.length > 0 ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void runSearch(provider, submittedQuery, page + 1, true)
              }
              disabled={loadingMore}
              data-testid="image-load-more"
            >
              {loadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {loadingMore
                ? t("editor.image.loadingMore")
                : t("editor.image.loadMore")}
            </Button>
          </div>
        ) : null}

        {!hasMore && results.length > 0 && !loading ? (
          <p
            className="text-center text-[11px] text-slate-500"
            data-testid="image-search-end"
          >
            {t("editor.image.endOfResults")}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
