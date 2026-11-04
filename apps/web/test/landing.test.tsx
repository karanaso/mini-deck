// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Landing } from "@/components/landing";
import { LocaleProvider } from "@/components/i18n/locale-provider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function createdResponse(open: boolean) {
  return Response.json({
    deckId: "deck-1",
    editToken: "edit-token",
    title: "Untitled deck",
    accessMode: open ? "open" : "protected",
    joinCode: "0042719",
    editPin: open ? null : "004271",
    viewPin: open ? null : "837204",
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Landing deck creation", () => {
  it("creates a protected deck without a request body by default", async () => {
    const fetchMock = vi.fn(async () => createdResponse(false));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="en">
        <Landing />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole("button", { name: "New deck" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/decks", { method: "POST" });
    expect(await screen.findByTestId("created-edit-pin")).toHaveTextContent(
      "004271",
    );
  });

  it("requests an open deck when the toggle is selected", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      createdResponse(true),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="en">
        <Landing />
      </LocaleProvider>,
    );

    await user.click(screen.getByTestId("create-open-deck"));
    await user.click(screen.getByRole("button", { name: "New deck" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ accessMode: "open" });

    expect(await screen.findByTestId("created-join-code")).toHaveTextContent(
      "0042719",
    );
    expect(screen.queryByTestId("created-edit-pin")).not.toBeInTheDocument();
    expect(screen.queryByTestId("created-view-pin")).not.toBeInTheDocument();
  });
});
