// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { storeUnlockSession } from "@/lib/unlock-session";

const { fetchSessionMock, readTokenMock, addRecentMock } = vi.hoisted(() => ({
  fetchSessionMock: vi.fn(),
  readTokenMock: vi.fn(),
  addRecentMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  fetchDeckSession: fetchSessionMock,
  readFragmentToken: readTokenMock,
}));

vi.mock("@/lib/recents", () => ({
  addRecent: addRecentMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/editor/deck-provider", () => ({
  DeckProvider: ({
    token,
    linkToken,
    accessProtected,
    role,
    children,
  }: {
    token: string;
    linkToken: string | null;
    accessProtected: boolean;
    role: string;
    children: ReactNode;
  }) => (
    <div
      data-testid="deck-provider"
      data-token={token}
      data-link-token={linkToken ?? ""}
      data-protected={String(accessProtected)}
      data-role={role}
    >
      {children}
    </div>
  ),
}));

vi.mock("@/components/editor/editor-workspace", () => ({
  EditorWorkspace: () => <div data-testid="editor-workspace" />,
}));

vi.mock("@/components/editor/pin-gate", () => ({
  PinGate: ({
    role,
    onUnlocked,
  }: {
    role: "editor" | "viewer";
    onUnlocked: (result: {
      deckId: string;
      role: "editor" | "viewer";
      title: string;
      protected: boolean;
      unlockToken: string;
      expiresAt: number;
    }) => void;
  }) => (
    <button
      type="button"
      data-testid="mock-pin-gate"
      data-role={role}
      onClick={() =>
        onUnlocked({
          deckId: "deck-1",
          role,
          title: "Deck",
          protected: true,
          unlockToken: "v1.unlocked",
          expiresAt: Date.now() + 60_000,
        })
      }
    >
      {role}
    </button>
  ),
}));

import { DeckLoader } from "@/components/deck-loader";
import { LocaleProvider } from "@/components/i18n/locale-provider";

function renderLoader() {
  render(
    <LocaleProvider initialLocale="en">
      <DeckLoader deckId="deck-1" />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  readTokenMock.mockReturnValue("link-token");
  addRecentMock.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DeckLoader access flow", () => {
  it("shows the PIN gate when the deck requires one, then opens the editor", async () => {
    fetchSessionMock.mockResolvedValue({ status: "pin_required", role: "editor" });
    renderLoader();

    const gate = await screen.findByTestId("mock-pin-gate");
    expect(gate).toHaveAttribute("data-role", "editor");
    expect(addRecentMock).not.toHaveBeenCalled();

    fireEvent.click(gate);
    const provider = await screen.findByTestId("deck-provider");
    expect(provider).toHaveAttribute("data-token", "v1.unlocked");
    expect(provider).toHaveAttribute("data-link-token", "link-token");
    expect(provider).toHaveAttribute("data-role", "editor");
    expect(addRecentMock).toHaveBeenCalledTimes(1);
  });

  it("reuses a remembered session without prompting, including for code-joined sessions", async () => {
    storeUnlockSession({
      deckId: "deck-1",
      role: "viewer",
      token: "v1.remembered",
      expiresAt: Date.now() + 60_000,
    });
    readTokenMock.mockReturnValue(null);
    fetchSessionMock.mockResolvedValue({
      status: "ready",
      session: { role: "viewer", title: "Deck", protected: true },
    });
    renderLoader();

    const provider = await screen.findByTestId("deck-provider");
    expect(fetchSessionMock).toHaveBeenCalledWith("deck-1", "v1.remembered");
    expect(provider).toHaveAttribute("data-token", "v1.remembered");
    expect(provider).toHaveAttribute("data-link-token", "");
    expect(provider).toHaveAttribute("data-role", "viewer");
    expect(screen.queryByTestId("mock-pin-gate")).not.toBeInTheDocument();
  });

  it("ignores an expired stored session and requests the PIN again", async () => {
    storeUnlockSession({
      deckId: "deck-1",
      role: "editor",
      token: "v1.expired",
      expiresAt: Date.now() - 1,
    });
    fetchSessionMock.mockResolvedValue({ status: "pin_required", role: "editor" });
    renderLoader();

    expect(await screen.findByTestId("mock-pin-gate")).toBeInTheDocument();
    expect(fetchSessionMock).toHaveBeenCalledWith("deck-1", "link-token");
  });

  it("requests the PIN when a remembered session was revoked", async () => {
    storeUnlockSession({
      deckId: "deck-1",
      role: "editor",
      token: "v1.revoked",
      expiresAt: Date.now() + 60_000,
    });
    fetchSessionMock
      .mockResolvedValueOnce({ status: "pin_required", role: "editor" })
      .mockResolvedValueOnce({ status: "not_found" });
    renderLoader();

    expect(await screen.findByTestId("mock-pin-gate")).toBeInTheDocument();
    expect(fetchSessionMock).toHaveBeenNthCalledWith(1, "deck-1", "link-token");
    expect(fetchSessionMock).toHaveBeenNthCalledWith(2, "deck-1", "v1.revoked");
  });

  it("rejects a tampered link even when a valid session is stored", async () => {
    storeUnlockSession({
      deckId: "deck-1",
      role: "editor",
      token: "v1.valid",
      expiresAt: Date.now() + 60_000,
    });
    fetchSessionMock.mockResolvedValue({ status: "not_found" });
    renderLoader();

    expect(
      await screen.findByText("This link can't open the deck"),
    ).toBeInTheDocument();
    expect(fetchSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchSessionMock).toHaveBeenCalledWith("deck-1", "link-token");
  });

  it("shows the error state when the session request fails", async () => {
    fetchSessionMock.mockRejectedValue(new Error("offline"));
    renderLoader();

    await waitFor(() =>
      expect(screen.getByText("We couldn't open the deck")).toBeInTheDocument(),
    );
  });

  it("shows the generic not-found state without a credential", async () => {
    readTokenMock.mockReturnValue(null);
    renderLoader();

    expect(
      await screen.findByText("This link can't open the deck"),
    ).toBeInTheDocument();
    expect(fetchSessionMock).not.toHaveBeenCalled();
  });
});
