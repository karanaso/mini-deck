// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api-error";
import { storeDeckAccessValues } from "@/lib/deck-access-values";
import { readUnlockSession, storeUnlockSession } from "@/lib/unlock-session";

const {
  lookupMock,
  unlockJoinMock,
  unlockWithPinMock,
  resetMock,
  buildLinksMock,
} = vi.hoisted(() => ({
  lookupMock: vi.fn(),
  unlockJoinMock: vi.fn(),
  unlockWithPinMock: vi.fn(),
  resetMock: vi.fn(),
  buildLinksMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  lookupJoinCode: lookupMock,
  unlockJoinCode: unlockJoinMock,
  unlockDeckWithPin: unlockWithPinMock,
  resetDeckAccess: resetMock,
  buildDeckLinks: buildLinksMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { DeckCreatedDialog } from "@/components/editor/deck-created-dialog";
import { PinGate } from "@/components/editor/pin-gate";
import { ShareDialog } from "@/components/editor/share-dialog";
import { JoinDeckDialog } from "@/components/landing/join-deck-dialog";
import { LocaleProvider } from "@/components/i18n/locale-provider";

const access = {
  deckId: "deck-1",
  joinCode: "0042719",
  editPin: "004271",
  viewPin: "837204",
};

let writeTextMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  writeTextMock = vi.fn(async () => undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: writeTextMock },
  });
  buildLinksMock.mockResolvedValue({
    editUrl: "http://localhost/d/deck-1#edit",
    viewUrl: "http://localhost/d/deck-1#view",
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function withLocale(node: ReactNode, locale: "en" | "el" = "en") {
  return <LocaleProvider initialLocale={locale}>{node}</LocaleProvider>;
}

describe("DeckCreatedDialog", () => {
  it("shows all three values, copies them, and opens the editor", async () => {
    const onOpenEditor = vi.fn();
    render(
      withLocale(
        <DeckCreatedDialog
          open
          onOpenChange={vi.fn()}
          values={access}
          onOpenEditor={onOpenEditor}
        />,
      ),
    );

    expect(screen.getByTestId("created-join-code")).toHaveTextContent("0042719");
    expect(screen.getByTestId("created-edit-pin")).toHaveTextContent("004271");
    expect(screen.getByTestId("created-view-pin")).toHaveTextContent("837204");

    fireEvent.click(screen.getByTestId("created-join-code-copy"));
    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith("0042719"),
    );

    fireEvent.click(screen.getByTestId("created-open-editor"));
    expect(onOpenEditor).toHaveBeenCalledTimes(1);
  });

  it("still opens when clipboard copying fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) },
    });
    const onOpenEditor = vi.fn();
    const user = userEvent.setup();
    render(
      withLocale(
        <DeckCreatedDialog
          open
          onOpenChange={vi.fn()}
          values={access}
          onOpenEditor={onOpenEditor}
        />,
      ),
    );

    await user.click(screen.getByTestId("created-edit-pin-copy"));
    await user.click(screen.getByTestId("created-open-editor"));
    expect(onOpenEditor).toHaveBeenCalledTimes(1);
  });
});

describe("JoinDeckDialog", () => {
  it("looks up a code, shows the title, and unlocks the chosen role", async () => {
    lookupMock.mockResolvedValue({ deckId: "deck-1", title: "Launch plan" });
    unlockJoinMock.mockResolvedValue({
      deckId: "deck-1",
      role: "viewer",
      title: "Launch plan",
      protected: true,
      unlockToken: "v1.view",
      expiresAt: Date.now() + 60_000,
    });
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(withLocale(<JoinDeckDialog open onOpenChange={vi.fn()} navigate={navigate} />));

    await user.type(screen.getByTestId("join-code-input"), "0042719");
    await user.click(screen.getByTestId("join-code-submit"));

    expect(await screen.findByTestId("join-deck-title")).toHaveTextContent("Launch plan");
    await user.click(screen.getByTestId("join-role-view"));
    await user.type(screen.getByTestId("join-pin-input"), "837204");
    await user.click(screen.getByTestId("join-pin-submit"));

    expect(unlockJoinMock).toHaveBeenCalledWith("0042719", "viewer", "837204");
    expect(readUnlockSession("deck-1")?.token).toBe("v1.view");
    expect(navigate).toHaveBeenCalledWith("/d/deck-1");
  });

  it("shows a generic error for an unknown code", async () => {
    lookupMock.mockRejectedValue(
      new ApiError("not_found", 404, "Deck not found"),
    );
    const user = userEvent.setup();
    render(withLocale(<JoinDeckDialog open onOpenChange={vi.fn()} />));

    await user.type(screen.getByTestId("join-code-input"), "9999999");
    await user.click(screen.getByTestId("join-code-submit"));
    expect(await screen.findByTestId("join-error")).toHaveTextContent(
      "This deck could not be found.",
    );
  });

  it("skips the role step when this browser has a remembered session", async () => {
    lookupMock.mockResolvedValue({ deckId: "deck-1", title: "Launch plan" });
    storeUnlockSession({
      deckId: "deck-1",
      role: "editor",
      token: "v1.remembered",
      expiresAt: Date.now() + 60_000,
    });
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(withLocale(<JoinDeckDialog open onOpenChange={vi.fn()} navigate={navigate} />));

    await user.type(screen.getByTestId("join-code-input"), "0042719");
    await user.click(screen.getByTestId("join-code-submit"));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/d/deck-1"));
    expect(screen.queryByTestId("join-role-edit")).not.toBeInTheDocument();
  });
});

describe("PinGate", () => {
  it("shows invalid and rate-limit errors without a session", async () => {
    unlockWithPinMock
      .mockRejectedValueOnce(new ApiError("invalid_pin", 401, "That PIN is not valid"))
      .mockRejectedValueOnce(
        new ApiError("rate_limited", 429, "Too many PIN attempts"),
      );
    const user = userEvent.setup();
    render(
      withLocale(
        <PinGate deckId="deck-1" linkToken="edit" role="editor" onUnlocked={vi.fn()} />,
      ),
    );

    await user.type(screen.getByTestId("pin-input"), "000000");
    await user.click(screen.getByTestId("pin-submit"));
    expect(await screen.findByTestId("pin-error")).toHaveTextContent(
      "That PIN is not valid.",
    );

    await user.type(screen.getByTestId("pin-input"), "000000");
    await user.click(screen.getByTestId("pin-submit"));
    expect(await screen.findByTestId("pin-error")).toHaveTextContent(
      "Too many attempts. Try again shortly.",
    );
  });

  it("unlocks with the correct PIN", async () => {
    const onUnlocked = vi.fn();
    unlockWithPinMock.mockResolvedValue({
      deckId: "deck-1",
      role: "editor",
      title: "Deck",
      protected: true,
      unlockToken: "v1.edit",
      expiresAt: Date.now() + 60_000,
    });
    const user = userEvent.setup();
    render(
      withLocale(
        <PinGate
          deckId="deck-1"
          linkToken="edit"
          role="editor"
          onUnlocked={onUnlocked}
        />,
      ),
    );

    await user.type(screen.getByTestId("pin-input"), "004271");
    await user.click(screen.getByTestId("pin-submit"));
    await waitFor(() =>
      expect(onUnlocked).toHaveBeenCalledWith(
        expect.objectContaining({ unlockToken: "v1.edit" }),
      ),
    );
  });
});

describe("ShareDialog access values", () => {
  it("shows links and access values for a link-opened editor", async () => {
    storeDeckAccessValues(access);
    render(
      withLocale(
        <ShareDialog
          open
          onOpenChange={vi.fn()}
          deckId="deck-1"
          linkToken="edit-token"
          sessionToken="v1.session"
          accessProtected
        />,
      ),
    );

    expect(await screen.findByTestId("edit-link-url")).toHaveValue(
      "http://localhost/d/deck-1#edit",
    );
    expect(screen.getByTestId("share-join-code")).toHaveTextContent("0042719");
    expect(screen.getByTestId("share-edit-pin")).toHaveTextContent("004271");
    expect(screen.getByTestId("share-view-pin")).toHaveTextContent("837204");
  });

  it("resets access and stores the new values", async () => {
    storeDeckAccessValues(access);
    resetMock.mockResolvedValue({
      deckId: "deck-1",
      role: "editor",
      title: "Deck",
      protected: true,
      joinCode: "7723104",
      editPin: "551028",
      viewPin: "309442",
      unlockToken: "v1.new",
      expiresAt: Date.now() + 60_000,
    });
    const onResetComplete = vi.fn();
    const user = userEvent.setup();
    render(
      withLocale(
        <ShareDialog
          open
          onOpenChange={vi.fn()}
          deckId="deck-1"
          linkToken="edit-token"
          sessionToken="v1.session"
          accessProtected
          onResetComplete={onResetComplete}
        />,
      ),
    );

    await user.click(screen.getByTestId("reset-access"));
    await user.click(screen.getByTestId("reset-access-confirm"));

    await waitFor(() =>
      expect(resetMock).toHaveBeenCalledWith("deck-1", "v1.session"),
    );
    expect(screen.getByTestId("share-join-code")).toHaveTextContent("7723104");
    expect(readUnlockSession("deck-1")?.token).toBe("v1.new");
    expect(onResetComplete).toHaveBeenCalledTimes(1);
  });

  it("explains code-joined sessions and offers reset without local values", async () => {
    const user = userEvent.setup();
    render(
      withLocale(
        <ShareDialog
          open
          onOpenChange={vi.fn()}
          deckId="deck-1"
          linkToken={null}
          sessionToken="v1.session"
          accessProtected
        />,
      ),
    );

    expect(screen.getByText(/opened with a join code/)).toBeInTheDocument();
    expect(screen.queryByTestId("edit-link-url")).not.toBeInTheDocument();
    expect(screen.getByText(/stored only on the browser/)).toBeInTheDocument();
    expect(screen.getByTestId("reset-access")).toBeInTheDocument();
    await user.click(screen.getByTestId("reset-access"));
    expect(screen.getByTestId("reset-access-confirm")).toBeInTheDocument();
  });
});

describe("Greek access copy", () => {
  it("renders the join dialog and PIN gate in Greek", async () => {
    render(withLocale(<JoinDeckDialog open onOpenChange={vi.fn()} />, "el"));
    expect(screen.getByTestId("join-deck-dialog")).toHaveTextContent(
      "Σύνδεση σε deck",
    );
    expect(screen.getByTestId("join-code-input")).toHaveAccessibleName(
      "Κωδικός σύνδεσης",
    );
  });
});
