# Tasks

## 1. Shared document model and geometry

- [x] 1.1 Add `ShapeKind`, `ShapeElementData`, and `LineElementData` to `packages/deck/src/types.ts`, plus strict `shapeElementSchema` and `lineElementSchema` members in `elementDataSchema`. Verify `pnpm --filter @mini-deck/deck typecheck` succeeds and unit tests in 1.4 accept valid data and reject unknown shape kinds, missing fields, and extra fields.
- [x] 1.2 Implement `packages/deck/src/shapes.ts` with `getShapePoints(shape, width, height)` for triangle, diamond, parallelogram, trapezoid, pentagon, hexagon, and star, plus `getLineEndpoints(width, height, flipX, flipY)`; export both from `packages/deck/src/index.ts`. Verify the geometry tests in 1.4 cover every kind, point counts, in-bounds coordinates, alternating star radii, and line direction.
- [x] 1.3 Extend `getElementData` in `packages/deck/src/document.ts` and `createElementMap` in `packages/deck/src/operations.ts` to decode and create the `shape` and `line` variants with the same defaults used elsewhere. Verify document and clipboard round-trip tests preserve the shape kind, fill, stroke, stroke width, and line direction.
- [x] 1.4 Add `packages/deck/test/shapes.test.ts` and extend `document.test.ts`, `clipboard.test.ts`, and `limits.test.ts` for the new element variants. Verify `pnpm --filter @mini-deck/deck test` passes, including malformed-envelope rejection and element-cap accounting for shapes.
- [x] 1.5 Update `docs/documents.md` with the new element types, shape-kind field, line direction fields, and the shared geometry note. Verify every documented field exists in `packages/deck` and the referenced tests pass.

## 2. Shape creation and rendering

- [x] 2.1 Extend `EditorTool` in `apps/web/src/store/editor-store.ts` with the seven polygon kinds and `line`, and add unit coverage in `editor-store.test.ts` for setting and resetting the new tools. Verify `pnpm --filter @mini-deck/web test` passes.
- [x] 2.2 Add the `Shapes` dropdown to `apps/web/src/components/editor/toolbar.tsx` using the existing dropdown primitive, with localized labels, SVG shape previews, `tool-shapes` and `tool-shape-<kind>` test IDs, and an active state when a picker shape is selected. Verify Playwright opens the picker with the keyboard, chooses a shape, and observes the active tool.
- [x] 2.3 Extend `commitDraft` and the draft preview in `apps/web/src/components/editor/canvas-stage.tsx` to create shapes and lines from shared geometry, apply the existing fill/stroke defaults, select the new element, reset to the select tool, and stop undo capture. Verify Playwright draws a triangle, star, and line and sees the expected `data-element-type` and geometry in the accessible element list.
- [x] 2.4 Render `shape` and `line` in both `apps/web/src/components/editor/element-node.tsx` and `apps/web/src/lib/render-slide.ts` using `getShapePoints` and `getLineEndpoints`, with a minimum line hit stroke width. Verify the same styled shape and line appear on the canvas, slide thumbnail, presentation overlay, PNG export, and PDF export.
- [x] 2.5 Extend `e2e/editor.spec.ts` and `e2e/export.spec.ts` with triangle, star, and line creation, second-context visibility, thumbnail rendering, and PNG/PDF output checks. Verify the targeted Playwright specs pass and a line has no arrowhead while an arrow does.
- [x] 2.6 Update `docs/editor-architecture.md` to describe the shared shape geometry and the two render paths. Verify the documented helpers and element variants match the implementation and the rendering tests pass.

## 3. Shape styling, lifecycle, and localization

- [x] 3.1 Refactor `apps/web/src/components/editor/style-panel.tsx` to use `hasFill`, `hasStroke`, `hasStrokeWidth`, and `hasCornerRadius` capability helpers; show fill/stroke/width for closed shapes, stroke/width for lines, and the specific localized shape name in the panel heading. Verify Playwright changes a pentagon's fill, stroke, and stroke width and a line's stroke width, and sees the values in a second context.
- [x] 3.2 Extend the accessible element list and `elementTypeKey` in `canvas-stage.tsx` with `data-element-shape` and shape-specific names so assistive technology announces “Pentagon”, “Star”, or “Line” instead of a generic label. Verify the accessible names and data attributes through Playwright and a targeted axe check.
- [x] 3.3 Update `apps/web/src/hooks/use-editor-shortcuts.ts` and the shortcuts help so `L` selects the line tool and the shape-picker tools remain keyboard reachable; keep `R`, `O`, and `A` unchanged. Verify shortcuts work outside text inputs and are suppressed while typing.
- [x] 3.4 Add English and Greek dictionary entries for the shape picker, every shape name, line, insertion feedback, and updated shortcut help. Verify the existing dictionary parity test passes and Playwright shows Greek shape labels and accessible names.
- [x] 3.5 Extend `e2e/clipboard.spec.ts`, `e2e/collaboration.spec.ts`, and `e2e/editor.spec.ts` for shape and line selection, transform, duplicate, copy/paste across slides, undo, viewer absence, and simultaneous editing. Verify the targeted specs pass and pasted shapes keep their kind and styling.

## 4. Emoji picker

- [x] 4.1 Add `apps/web/src/lib/emoji.ts` with four categories and a curated catalog carrying Unicode characters and dictionary name keys, plus `apps/web/test/emoji.test.ts` covering unique keys, valid characters, category coverage, and that every name key exists in both dictionaries. Verify `pnpm --filter @mini-deck/web test` passes.
- [x] 4.2 Add the emoji picker to `toolbar.tsx` with localized category labels, a grid of accessible emoji buttons, and `tool-emoji` / `emoji-<id>` test IDs. Choosing an emoji must create a centered text element with `createTextElement`, select it, reset to the select tool, stop undo capture, and show a localized toast. Verify Playwright opens the picker, inserts an emoji, edits the resulting text, reloads, and sees it in a second context.
- [x] 4.3 Add the emoji picker heading, category names, emoji accessible names, and insertion toast to both dictionaries, following the existing Greek glossary. Verify the parity test passes and Playwright asserts Greek labels while the emoji characters remain unchanged.
- [x] 4.4 Extend `e2e/clipboard.spec.ts` and `e2e/export.spec.ts` to copy/paste and export an emoji text element, asserting text content rather than pixels. Verify the emoji survives clipboard round-trip, reload, PNG, and PDF, and is absent for viewers.
- [x] 4.5 Document emoji insertion as ordinary text in `docs/documents.md` or `docs/editor-architecture.md`. Verify the documented behavior matches the inserted element and the emoji tests pass.

## 5. Integration and hardening

- [x] 5.1 Extend the accessibility suite to open the shape and emoji pickers, exercise keyboard-only selection, check active-state announcements, and run axe on English and Greek editor surfaces. Verify no serious or critical violations are reported.
- [x] 5.2 Extend the 30-slide/500-element performance fixture with representative new shapes, lines, and emoji text, then run the performance spec and confirm the existing load, thumbnail, slide-switch, and PDF budgets still pass; update `docs/performance.md` from the run.
- [x] 5.3 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`; verify all pass.
- [x] 5.4 Run the complete Playwright suite with `pnpm test:e2e`; verify the shape, line, emoji, localization, clipboard, collaboration, export, thumbnail, presentation, accessibility, and existing editor tests all pass.

## Workflow follow-up

- Review the completed change and archive it once all verification tasks pass.
- Prefer archiving the already-complete `add-collaborative-decks` change first, so the base `deck-authoring` requirements exist before this delta merges; then archive this change.
- Verify the archived `deck-authoring` spec contains the shape library, line, emoji insertion, and backward-compatibility requirements, and that the new dictionary keys and docs remain in the repository.
