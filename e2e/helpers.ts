import {
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { PDFDocument } from "pdf-lib";

export type InterfaceLocale = "en" | "el";

const testOrigin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const testHost = new URL(testOrigin).hostname;

export async function setStoredLocale(
  context: BrowserContext,
  locale: InterfaceLocale,
): Promise<void> {
  await context.addCookies([
    {
      name: "mini-deck-locale",
      value: locale,
      domain: testHost,
      path: "/",
      sameSite: "Lax",
    },
  ]);
}

export async function switchLanguage(
  page: Page,
  locale: InterfaceLocale,
): Promise<void> {
  await page.getByTestId("language-switcher").click();
  await page.getByTestId(`language-option-${locale}`).click();
}

export interface DeckLink {
  url: string;
  deckId: string;
  editToken: string;
}

export async function createDeck(page: Page): Promise<DeckLink> {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New deck" }).click();
  await page.waitForURL(/\/d\/[^#]+#/, { timeout: 15_000 });
  await waitForDeckReady(page, "editor");
  const url = page.url();
  const match = url.match(/\/d\/([^#]+)#(.+)$/);
  if (!match) throw new Error(`Unexpected deck URL: ${url}`);
  return { url, deckId: match[1], editToken: match[2] };
}

export async function waitForDeckReady(
  page: Page,
  role: "editor" | "viewer" = "editor",
  locale: InterfaceLocale = "en",
) {
  await expect(page.getByTestId("editor-workspace")).toHaveAttribute("data-role", role);
  await expect(page.getByTestId("canvas-stage")).toBeVisible();
  await expect(page.getByTestId("connection-badge")).toContainText(
    locale === "el" ? "Ζωντανά" : "Live",
    { timeout: 15_000 },
  );
}

export async function openDeck(
  page: Page,
  url: string,
  role: "editor" | "viewer" = "editor",
  locale: InterfaceLocale = "en",
) {
  await page.goto(url, { waitUntil: "networkidle" });
  await waitForDeckReady(page, role, locale);
}

export async function getCanvasBox(page: Page) {
  const box = await page.getByTestId("canvas-stage").boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  return box;
}

export type DrawableTool =
  | "rect"
  | "ellipse"
  | "arrow"
  | "triangle"
  | "diamond"
  | "parallelogram"
  | "trapezoid"
  | "pentagon"
  | "hexagon"
  | "star"
  | "line";

const DIRECT_DRAW_TOOLS = new Set<DrawableTool>(["rect", "ellipse", "arrow"]);

export async function drawElement(
  page: Page,
  tool: DrawableTool,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const box = await getCanvasBox(page);
  if (DIRECT_DRAW_TOOLS.has(tool)) {
    await page.getByTestId(`tool-${tool}`).click();
  } else {
    await page.getByTestId("tool-shapes").click();
    await page.getByTestId(`tool-shape-${tool}`).click();
  }
  await page.mouse.move(box.x + start.x, box.y + start.y);
  await page.mouse.down();
  await page.mouse.move(box.x + end.x, box.y + end.y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId("tool-select")).toHaveAttribute("aria-pressed", "true");
}

export async function insertEmoji(page: Page, emojiId: string) {
  await page.getByTestId("tool-emoji").click();
  await page.getByTestId(`emoji-${emojiId}`).click();
}

export async function addText(page: Page, start: { x: number; y: number }, text: string) {
  const box = await getCanvasBox(page);
  await page.getByTestId("tool-text").click();
  await page.mouse.click(box.x + start.x, box.y + start.y);
  const editor = page.getByTestId("text-editor");
  await expect(editor).toBeVisible();
  await editor.fill(text);
  // Clicking empty canvas blurs the overlay.
  await page.mouse.click(box.x + box.width - 80, box.y + box.height - 80);
  await expect(editor).toHaveCount(0);
}

export async function elementCount(page: Page): Promise<number> {
  return page.locator('[data-testid="element-list"] button').count();
}

export async function setNativeValue(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const prototype =
      input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

export async function selectElement(page: Page, index = 0) {
  const button = page.locator('[data-testid="element-list"] button').nth(index);
  await button.focus();
  await page.keyboard.press("Enter");
}

export async function editTextElement(page: Page, index: number, text: string) {
  const element = page.locator('[data-testid="element-list"] button').nth(index);
  const x = Number(await element.getAttribute("data-element-x"));
  const y = Number(await element.getAttribute("data-element-y"));
  const width = Number(await element.getAttribute("data-element-width"));
  const height = Number(await element.getAttribute("data-element-height"));
  const transform = await page.getByTestId("canvas-stage").evaluate((stage) => ({
    scale: Number((stage as HTMLElement).dataset.scale),
    contentX: Number((stage as HTMLElement).dataset.contentX),
    contentY: Number((stage as HTMLElement).dataset.contentY),
  }));
  const box = await getCanvasBox(page);
  await page.mouse.dblclick(
    box.x + transform.contentX + (x + width / 2) * transform.scale,
    box.y + transform.contentY + (y + height / 2) * transform.scale,
  );
  const editor = page.getByTestId("text-editor");
  await expect(editor).toBeVisible();
  await editor.fill(text);
  await page.mouse.click(box.x + box.width - 80, box.y + box.height - 80);
  await expect(editor).toHaveCount(0);
}

export async function getViewUrl(page: Page): Promise<string> {
  await page.getByTestId("share-button").click();
  const dialog = page.getByTestId("share-dialog");
  await expect(dialog).toBeVisible();
  const url = await page.getByTestId("view-link-url").inputValue();
  expect(url).toContain("/d/");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  return url;
}

export async function getEditUrlFromShare(page: Page): Promise<string> {
  await page.getByTestId("share-button").click();
  const url = await page.getByTestId("edit-link-url").inputValue();
  await page.keyboard.press("Escape");
  return url;
}

export async function getShareUrl(
  page: Page,
  kind: "edit" | "view",
  locale: InterfaceLocale = "en",
): Promise<string> {
  const currentLocale = await page.locator("html").getAttribute("lang");
  if (currentLocale !== locale) {
    await switchLanguage(page, locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  }

  await page.getByTestId("share-button").click();
  const dialog = page.getByTestId("share-dialog");
  await expect(dialog).toBeVisible();
  const input = page.getByTestId(kind === "edit" ? "edit-link-url" : "view-link-url");
  await expect.poll(() => input.inputValue()).toContain("/d/");
  const url = await input.inputValue();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  return url;
}

export async function addSlide(page: Page) {
  await page.getByRole("button", { name: "Add slide" }).click();
}

export async function pastePlainText(page: Page, text: string) {
  await page.evaluate((value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, text);
}

export async function pasteImage(page: Page) {
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No 2D context");
    context.fillStyle = "#16a34a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not create test image");
    const file = new File([blob], "paste.png", { type: "image/png" });
    const data = new DataTransfer();
    data.items.add(file);
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

export async function pasteEnvelope(page: Page, elements: unknown[]) {
  await page.evaluate((value) => {
    const data = new DataTransfer();
    data.setData(
      "application/x-mini-deck+json",
      JSON.stringify({ format: "mini-deck/clipboard", version: 1, elements: value }),
    );
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, elements);
}

export async function pdfPageCount(buffer: Buffer): Promise<number> {
  const pdf = await PDFDocument.load(buffer);
  return pdf.getPageCount();
}

export async function expectNoDownload(page: Page, timeout = 1500): Promise<boolean> {
  return page
    .waitForEvent("download", { timeout })
    .then(() => false)
    .catch(() => true);
}

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}
