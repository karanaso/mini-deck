# Tasks

## 1. Ownership data model

- [x] 1.1 Add a `ContentOwner` type and optional `owner` field to the element base shape and `SlideData` in `packages/deck/src/types.ts`, with schema validation for the owner id and name; verify `packages/deck/test/document.test.ts` covers parsing an owner and rejecting an invalid owner.
- [x] 1.2 Persist owner as flat `ownerId`/`ownerName` fields in slide and element Yjs maps and reconstruct `owner` in `getElementData`, `getSlideData`, `createElementMap`, `createSlideMap`, and `createSlideDataMap`; verify a document round-trip test preserves ownership and that objects without the fields still read as unowned.
- [x] 1.3 Add unit coverage in `packages/deck/test/ownership.test.ts` for owned and unowned elements, owned and unowned slides, and author metadata surviving a document clone; run `pnpm vitest run packages/deck/test/ownership.test.ts packages/deck/test/document.test.ts`.

## 2. Creation, duplication, and clipboard ownership

- [x] 2.1 Extend `createSlide`, `duplicateSlide`, `addElement`, `createTextElement`, and `duplicateElements` to accept an optional owner; make duplicated slides and elements owned by the actor and leave source ownership unchanged. Verify with unit tests for slide duplication, element duplication, and an unowned source.
- [x] 2.2 Update `cloneElementData` and `preparePastedElements` so copies drop the source owner and accept the actor's owner; strip ownership from `createClipboardEnvelope` output so older clients can still parse the envelope. Verify unit tests assert the clipboard payload has no owner and pasted elements receive the actor's owner.
- [x] 2.3 Update `placeImageAsset` and the plain-text/image paste path to accept and apply the actor's owner; verify existing image and clipboard unit tests still pass and new assertions cover the owner.

## 3. Browser owner identity

- [x] 3.1 Add `apps/web/src/lib/owner-identity.ts` to read or create a stable id in `localStorage` under `mini-deck:owner-id`, with an SSR-safe guard and a null fallback when storage is unavailable; verify with a storage-mock unit test covering read, create, and unavailable-storage paths.
- [x] 3.2 Expose `owner: ContentOwner | null` from `DeckProvider`, combining the browser owner id with the current participant name, and keep the name current when the participant renames; verify `pnpm --filter @mini-deck/web typecheck` and the existing participant/presence tests.
- [x] 3.3 Pass the current owner through every creation path: canvas text/shape creation, emoji insertion, image upload/import, clipboard paste, style-panel duplicate, keyboard duplicate, and slide add/duplicate; verify by creating content in the editor and confirming the ownership unit/e2e assertions pass.

## 4. Deletion conflict logic

- [x] 4.1 Add `packages/deck/src/ownership.ts` with `getElementOwner`, `getSlideOwner`, `findElementDeletionConflicts`, `findSlideDeletionConflicts`, and deduplication by owner id; unowned objects and the actor's own objects MUST not conflict, and slide checks MUST include contained elements. Verify with unit tests for own, other-owned, mixed, multi-owner, legacy, and slide-with-other-element cases.
- [x] 4.2 Export the ownership helpers from `packages/deck/src/index.ts` and verify `pnpm test` passes for the deck package.

## 5. Deletion guard, prompt, and editor wiring

- [x] 5.1 Add `DeletionGuardProvider` and `useDeletionGuard()` in `apps/web/src/components/editor/deletion-guard.tsx`, rendering one dialog that names the owner or owners; add the blocked-owner state to the editor store and reset it on workspace reset. Verify the dialog is keyboard-dismissible and has a stable test id.
- [x] 5.2 Add English and Greek strings for the prompt title, singular owner message, multiple-owner message, and dismiss action in both dictionaries; verify `MessageKey` parity through `pnpm typecheck` and inspect both locales for the new keys.
- [x] 5.3 Wire the guard into keyboard Delete/Backspace, clipboard cut, style-panel delete, slide-rail delete, and the abandoned-empty-text cleanup in `canvas-stage.tsx`; blocked operations MUST not call `deleteElements`/`deleteSlide` and MUST not clear the selection. Verify no delete path bypasses the guard by searching for direct delete call sites.
- [x] 5.4 Add a Playwright collaboration test with two editor contexts: editor A creates an element, editor B attempts to delete it and sees the owner prompt with B's name and unchanged element count; editor B deletes their own element successfully. Add cases for mixed selection, another editor's slide, and cut. Run the focused Playwright collaboration spec.

## 6. Documentation and compatibility review

- [x] 6.1 Document ownership behavior and its limits (client-side safeguard, browser-scoped identity, legacy/unowned content, cross-device limitation) in `docs/security.md` and `docs/editor-architecture.md`; verify the docs match the implemented prompt text and deletion rules.
- [x] 6.2 Confirm no database migration or schema-version bump is needed by checking `git diff` for migration files and running an existing pre-ownership deck through the editor; verify it loads and its unowned elements remain deletable.

## 7. Integration verification

- [x] 7.1 Run `pnpm lint` and `pnpm typecheck`; verify both complete without errors.
- [x] 7.2 Run `pnpm test` and `pnpm test:integration`; verify ownership unit coverage and existing deck behavior pass.
- [x] 7.3 Run the editor, collaboration, clipboard, and localization Playwright specs; verify own-work deletion, blocked other-work deletion, cut blocking, and both locales pass.
