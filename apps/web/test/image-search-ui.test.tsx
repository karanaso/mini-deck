// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

import { ApiError } from "@/lib/api-error";
import type { ImportStockImageResult } from "@/lib/stock-image-client";

const { searchMock, importMock, providersMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  importMock: vi.fn(),
  providersMock: vi.fn(),
}));

vi.mock("@/lib/stock-image-client", () => ({
  searchStockImages: searchMock,
  importStockImage: importMock,
  fetchStockProviders: providersMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { ImageSearchDialog } from "@/components/editor/image-search-dialog";
import { ImageMenu } from "@/components/editor/image-menu";
import { ImageCreditLine } from "@/components/editor/image-credit";
import { LocaleProvider } from "@/components/i18n/locale-provider";

const photo = {
  id: "photo-1",
  provider: "unsplash" as const,
  thumbnailUrl: "https://images.unsplash.com/photo-1-small",
  previewUrl: "https://images.unsplash.com/photo-1-regular",
  width: 4000,
  height: 3000,
  photographerName: "Ada Lovelace",
  photographerUrl: "https://unsplash.com/@ada",
  sourceUrl: "https://unsplash.com/photos/photo-1",
  alt: "A mountain",
};

const imported: ImportStockImageResult = {
  asset: {
    id: "asset-1",
    url: "/api/assets/asset-1",
    mimeType: "image/jpeg",
    width: 4000,
    height: 3000,
  },
  credit: {
    provider: "unsplash",
    photographerName: "Ada Lovelace",
    photographerUrl: "https://unsplash.com/@ada",
    sourceUrl: "https://unsplash.com/photos/photo-1",
  },
};

function renderDialog(
  overrides: Partial<ComponentProps<typeof ImageSearchDialog>> = {},
) {
  const onOpenChange = vi.fn();
  const onSelect = vi.fn();
  render(
    <LocaleProvider initialLocale="en">
      <ImageSearchDialog
        open
        onOpenChange={onOpenChange}
        deckId="deck-1"
        token="token"
        providers={["unsplash"]}
        onSelect={onSelect}
        {...overrides}
      />
    </LocaleProvider>,
  );
  return { onOpenChange, onSelect };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ImageSearchDialog", () => {
  it("focuses the query, searches, and appends more results", async () => {
    searchMock
      .mockResolvedValueOnce({ results: [photo], page: 1, hasMore: true })
      .mockResolvedValueOnce({
        results: [{ ...photo, id: "photo-2" }],
        page: 2,
        hasMore: false,
      });
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByTestId("image-search-input")).toHaveFocus();
    await user.type(screen.getByTestId("image-search-input"), "mountain");
    await user.click(screen.getByTestId("image-search-submit"));

    expect(await screen.findByTestId("image-result-photo-1")).toBeInTheDocument();
    expect(screen.getByTestId("image-credit")).toHaveTextContent(
      "Photo by Ada Lovelace on Unsplash",
    );
    expect(screen.getByRole("link", { name: /Ada Lovelace/ })).toHaveAttribute(
      "href",
      "https://unsplash.com/@ada",
    );

    await user.click(screen.getByTestId("image-load-more"));
    await waitFor(() =>
      expect(screen.getByTestId("image-result-photo-2")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("image-search-end")).toBeInTheDocument();
    expect(searchMock).toHaveBeenLastCalledWith("deck-1", "token", {
      provider: "unsplash",
      query: "mountain",
      page: 2,
      orientation: "landscape",
    });
  });

  it("shows an empty state with the query", async () => {
    searchMock.mockResolvedValueOnce({ results: [], page: 1, hasMore: false });
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByTestId("image-search-input"), "unicorn");
    await user.click(screen.getByTestId("image-search-submit"));

    const empty = await screen.findByTestId("image-search-empty");
    expect(empty).toHaveTextContent("No photos match “unicorn”.");
    expect(screen.queryByTestId("image-search-error")).not.toBeInTheDocument();
  });

  it("shows a localized error and retries with the query", async () => {
    searchMock
      .mockRejectedValueOnce(
        new ApiError("provider_unavailable", 502, "The image provider is unavailable"),
      )
      .mockResolvedValueOnce({ results: [photo], page: 1, hasMore: false });
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByTestId("image-search-input"), "ocean");
    await user.click(screen.getByTestId("image-search-submit"));

    const error = await screen.findByTestId("image-search-error");
    expect(error).toHaveTextContent("The image provider is unavailable.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByTestId("image-result-photo-1")).toBeInTheDocument();
    expect(searchMock).toHaveBeenLastCalledWith("deck-1", "token", {
      provider: "unsplash",
      query: "ocean",
      page: 1,
      orientation: "landscape",
    });
  });

  it("imports a chosen photo and closes", async () => {
    searchMock.mockResolvedValueOnce({ results: [photo], page: 1, hasMore: false });
    importMock.mockResolvedValueOnce(imported);
    const { onOpenChange, onSelect } = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByTestId("image-search-input"), "mountain");
    await user.click(screen.getByTestId("image-search-submit"));
    await user.click(await screen.findByTestId("image-result-photo-1"));

    await waitFor(() =>
      expect(importMock).toHaveBeenCalledWith("deck-1", "token", {
        provider: "unsplash",
        photoId: "photo-1",
      }),
    );
    expect(onSelect).toHaveBeenCalledWith(imported);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("reruns the query when the provider changes", async () => {
    searchMock.mockResolvedValue({ results: [photo], page: 1, hasMore: false });
    const user = userEvent.setup();
    renderDialog({ providers: ["unsplash", "pexels"] });

    await user.type(screen.getByTestId("image-search-input"), "mountain");
    await user.click(screen.getByTestId("image-search-submit"));
    await screen.findByTestId("image-result-photo-1");

    await user.click(screen.getByTestId("image-provider-pexels"));
    await waitFor(() =>
      expect(searchMock).toHaveBeenLastCalledWith("deck-1", "token", {
        provider: "pexels",
        query: "mountain",
        page: 1,
        orientation: "landscape",
      }),
    );
    expect(screen.getByTestId("image-provider-pexels")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("ImageMenu", () => {
  function renderMenu(providers: string[]) {
    const onUpload = vi.fn();
    providersMock.mockResolvedValue(providers);
    render(
      <LocaleProvider initialLocale="en">
        <ImageMenu
          deckId="deck-1"
          token="token"
          uploading={false}
          onUpload={onUpload}
          onSelect={vi.fn()}
        />
      </LocaleProvider>,
    );
    return { onUpload };
  }

  it("offers upload but no search when no provider is configured", async () => {
    const user = userEvent.setup();
    const { onUpload } = renderMenu([]);

    await user.click(screen.getByTestId("tool-image"));
    await screen.findByTestId("image-upload");
    expect(screen.queryByTestId("image-search")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("image-upload"));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it("offers search with the configured provider", async () => {
    const user = userEvent.setup();
    renderMenu(["unsplash"]);

    await user.click(screen.getByTestId("tool-image"));
    await user.click(await screen.findByTestId("image-search"));

    expect(await screen.findByTestId("image-search-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("image-provider-unsplash")).toBeInTheDocument();
    expect(screen.queryByTestId("image-provider-pexels")).not.toBeInTheDocument();
  });
});

describe("ImageCreditLine", () => {
  it("renders a safe attribution link", () => {
    render(
      <LocaleProvider initialLocale="en">
        <ImageCreditLine credit={imported.credit} />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("style-image-credit")).toHaveTextContent(
      "Photo by Ada Lovelace on Unsplash",
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", imported.credit.sourceUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("renders nothing for an uploaded image without credit", () => {
    render(
      <LocaleProvider initialLocale="en">
        <ImageCreditLine credit={undefined} />
      </LocaleProvider>,
    );
    expect(screen.queryByTestId("style-image-credit")).not.toBeInTheDocument();
  });
});
