// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { SlideTransitionMenu } from "@/components/editor/slide-transition-menu";
import { TooltipProvider } from "@/components/ui/tooltip";

afterEach(cleanup);

function renderMenu(
  value: "none" | "fade" | "push" | "zoom",
  onValueChange = vi.fn(),
  canEdit = true,
) {
  render(
    <LocaleProvider initialLocale="en">
      <TooltipProvider>
        <SlideTransitionMenu
          value={value}
          onValueChange={onValueChange}
          canEdit={canEdit}
        />
      </TooltipProvider>
    </LocaleProvider>,
  );
  return onValueChange;
}

describe("SlideTransitionMenu", () => {
  it("shows the active transition and writes a new choice", async () => {
    const onChange = renderMenu("fade");
    const user = userEvent.setup();

    const trigger = screen.getByTestId("transition-menu");
    expect(trigger).toHaveAccessibleName("Slide transition: Fade");

    await user.click(trigger);
    expect(await screen.findByTestId("transition-option-fade")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(screen.getByTestId("transition-option-push"));
    expect(onChange).toHaveBeenCalledWith("push");
  });

  it("is not rendered for view-only participants", () => {
    renderMenu("none", vi.fn(), false);
    expect(screen.queryByTestId("transition-menu")).not.toBeInTheDocument();
  });

  it("renders Greek transition names", async () => {
    render(
      <LocaleProvider initialLocale="el">
        <TooltipProvider>
          <SlideTransitionMenu value="push" onValueChange={vi.fn()} />
        </TooltipProvider>
      </LocaleProvider>,
    );
    const user = userEvent.setup();

    expect(screen.getByTestId("transition-menu")).toHaveAccessibleName(
      "Μετάβαση διαφάνειας: Ώθηση",
    );
    await user.click(screen.getByTestId("transition-menu"));
    expect(await screen.findByTestId("transition-option-zoom")).toHaveTextContent(
      "Ζουμ",
    );
  });
});
