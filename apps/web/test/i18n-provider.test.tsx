// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { LocaleProvider, useI18n } from "@/components/i18n/locale-provider";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";

function Probe() {
  const { locale, t, setLocale } = useI18n();
  const [count, setCount] = useState(0);
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t("common.language")}</span>
      <span data-testid="count">{count}</span>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        increment
      </button>
      <button type="button" onClick={() => setLocale("el")}>
        switch
      </button>
    </div>
  );
}

beforeEach(() => {
  refreshMock.mockClear();
  document.cookie = "mini-deck-locale=; Max-Age=0; Path=/";
  document.documentElement.lang = "en";
});

afterEach(cleanup);

describe("LocaleProvider", () => {
  it("starts in the supplied locale", () => {
    render(
      <LocaleProvider initialLocale="en">
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByTestId("translated")).toHaveTextContent("Language");
  });

  it("switches copy without remounting children or losing local state", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="en">
        <Probe />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole("button", { name: "increment" }));
    expect(screen.getByTestId("count")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "switch" }));

    expect(screen.getByTestId("locale")).toHaveTextContent("el");
    expect(screen.getByTestId("translated")).toHaveTextContent("Γλώσσα");
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(document.documentElement.lang).toBe("el");
    expect(document.title).toBe("Mini Deck — Μικρά deck, ζωντανά μαζί");
    expect(document.cookie).toContain("mini-deck-locale=el");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});

describe("LocaleSwitcher", () => {
  it("exposes the current selection and switches language", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="en">
        <LocaleSwitcher />
        <Probe />
      </LocaleProvider>,
    );

    const trigger = screen.getByTestId("language-switcher");
    expect(trigger).toHaveAccessibleName("Language");
    await user.click(trigger);

    expect(screen.getByTestId("language-option-en")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByTestId("language-option-el")).toHaveAttribute(
      "aria-checked",
      "false",
    );

    await user.click(screen.getByTestId("language-option-el"));

    expect(screen.getByTestId("locale")).toHaveTextContent("el");
    expect(screen.getByTestId("language-switcher")).toHaveAccessibleName(
      "Γλώσσα",
    );
  });
});
