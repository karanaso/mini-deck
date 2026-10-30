"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Clock3,
  FileStack,
  Link2,
  MonitorPlay,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DeckCreatedDialog } from "@/components/editor/deck-created-dialog";
import { JoinDeckDialog } from "@/components/landing/join-deck-dialog";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { messageForError, parseApiError } from "@/lib/api-error";
import {
  storeDeckAccessValues,
  type DeckAccessValues,
} from "@/lib/deck-access-values";
import {
  addRecent,
  formatLastOpened,
  readRecents,
  removeRecent,
  touchRecent,
  type RecentDeck,
} from "@/lib/recents";

export function Landing() {
  const { locale, t, tCount } = useI18n();
  const [recents, setRecents] = useState<RecentDeck[]>([]);
  const [mounted, setMounted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [created, setCreated] = useState<{
    values: DeckAccessValues;
    editToken: string;
  } | null>(null);

  useEffect(() => {
    setRecents(readRecents());
    setMounted(true);
  }, []);

  async function createDeck() {
    setCreating(true);
    try {
      const response = await fetch("/api/decks", { method: "POST" });
      if (!response.ok) {
        const error = await parseApiError(response);
        const message = messageForError(error, "landing.createError");
        toast.error(t(message.key, message.params));
        setCreating(false);
        return;
      }
      const data = (await response.json()) as {
        deckId: string;
        editToken: string;
        title: string;
        joinCode: string;
        editPin: string;
        viewPin: string;
      };
      addRecent({
        deckId: data.deckId,
        editToken: data.editToken,
        title: data.title,
        lastOpenedAt: Date.now(),
      });
      const values: DeckAccessValues = {
        deckId: data.deckId,
        joinCode: data.joinCode,
        editPin: data.editPin,
        viewPin: data.viewPin,
      };
      storeDeckAccessValues(values);
      setCreated({ values, editToken: data.editToken });
      setCreating(false);
    } catch (error) {
      const message = messageForError(error, "landing.createError");
      toast.error(t(message.key, message.params));
      setCreating(false);
    }
  }

  function openCreatedDeck() {
    if (!created) return;
    window.location.assign(`/d/${created.values.deckId}#${created.editToken}`);
  }

  function openRecent(deck: RecentDeck) {
    setRecents(touchRecent(deck.deckId));
    window.location.assign(`/d/${deck.deckId}#${deck.editToken}`);
  }

  function forgetRecent(deckId: string) {
    setRecents(removeRecent(deckId));
    toast.success(t("landing.recent.removed"));
  }

  const features = [
    {
      icon: Link2,
      title: t("landing.features.link.title"),
      text: t("landing.features.link.body"),
    },
    {
      icon: MonitorPlay,
      title: t("landing.features.export.title"),
      text: t("landing.features.export.body"),
    },
    {
      icon: Sparkles,
      title: t("landing.features.live.title"),
      text: t("landing.features.live.body"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <FileStack className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-950">Mini Deck</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
                {t("landing.tagline")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 text-xs font-medium text-slate-600 sm:flex">
              <Link2 className="h-3.5 w-3.5" />
              {t("landing.noAccount")}
            </div>
            <LocaleSwitcher />
          </div>
        </header>

        <section className="grid gap-10 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              {t("landing.badge")}
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-0.04em] text-slate-950 sm:text-6xl">
              {t("landing.hero.line1")}
              <br />
              {t("landing.hero.line2")}
              <br />
              <span className="text-indigo-600">{t("landing.hero.line3")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
              {t("landing.hero.body")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                variant="primary"
                onClick={() => void createDeck()}
                disabled={creating}
                className="shadow-lg shadow-indigo-600/20"
              >
                <Plus className="h-5 w-5" />
                {creating ? t("landing.creating") : t("landing.create")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setJoinOpen(true)}
                data-testid="join-deck-button"
              >
                <Link2 className="h-4 w-4" />
                {t("join.open")}
              </Button>
              <span className="text-xs text-slate-600">{t("landing.createHint")}</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-200/50 via-transparent to-amber-200/40 blur-2xl" />
            <div className="rotate-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/40">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-300" />
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {tCount("landing.mockup.editing", 3)}
                </span>
              </div>
              <div className="mt-4 aspect-video rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  {t("landing.mockup.eyebrow")}
                </p>
                <p className="mt-3 max-w-[15rem] text-2xl font-semibold leading-tight">
                  {t("landing.mockup.title")}
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-1 text-[9px] text-white/70">
                    {t("landing.mockup.oneLink")}
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-1 text-[9px] text-white/70">
                    {t("landing.mockup.liveCursors")}
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-1 text-[9px] text-white/70">
                    {t("landing.mockup.exports")}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
                <span>{t("landing.mockup.untitled")}</span>
                <span>{t("landing.mockup.slideMeta", { number: 1 })}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 pb-12 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white/80 p-5 backdrop-blur"
            >
              <feature.icon className="h-5 w-5 text-indigo-600" />
              <p className="mt-3 text-sm font-semibold text-slate-950">{feature.title}</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">{feature.text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {t("landing.recent.eyebrow")}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {t("landing.recent.title")}
              </h2>
            </div>
            <span className="hidden text-xs text-slate-600 sm:block">
              {t("landing.recent.stored")}
            </span>
          </div>

          {!mounted ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[0, 1].map((key) => (
                <div
                  key={key}
                  className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                />
              ))}
            </div>
          ) : recents.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
              <Clock3 className="h-6 w-6 text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                {t("landing.recent.empty.title")}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
                {t("landing.recent.empty.body")}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {recents.map((deck) => (
                <div
                  key={deck.deckId}
                  className="group relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
                  data-testid="recent-deck"
                >
                  <button
                    type="button"
                    onClick={() => openRecent(deck)}
                    className="absolute inset-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label={t("landing.recent.open", { title: deck.title })}
                  />
                  <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600">
                    <FileStack className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{deck.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatLastOpened(deck.lastOpenedAt, locale)}
                    </p>
                  </div>
                  <ArrowUpRight className="pointer-events-none h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-500" />
                  <button
                    type="button"
                    onClick={() => forgetRecent(deck.deckId)}
                    className="relative z-10 rounded-md p-1.5 text-slate-600 opacity-0 transition-opacity hover:bg-white hover:text-slate-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 group-hover:opacity-100"
                    aria-label={t("landing.recent.remove", { title: deck.title })}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-600">
          <span>{t("landing.footer.tagline")}</span>
          <span>{t("landing.footer.warning")}</span>
        </footer>
      </div>

      <DeckCreatedDialog
        open={created !== null}
        values={created?.values ?? null}
        onOpenChange={(open) => {
          if (!open) openCreatedDeck();
        }}
        onOpenEditor={openCreatedDeck}
      />
      <JoinDeckDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </main>
  );
}
