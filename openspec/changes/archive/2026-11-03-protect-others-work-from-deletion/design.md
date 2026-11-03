# Design

## Context

See `proposal.md` for motivation and the two delta specs for behavior. The relevant current state:

- Deck content is a Yjs document. Slides and elements live in `Y.Map`/`Y.Array` structures under `packages/deck`; the database stores only snapshots.
- Editors share a single anonymous participant identity created in `apps/web/src/components/editor/deck-provider.tsx`. It currently lives in `sessionStorage` and is used for presence, cursors, and selection.
- Delete paths are client-side and spread across the canvas, style panel, slide rail, keyboard shortcuts, and clipboard hook. There is no deck-delete operation.
- Editing operations are local Yjs transactions synchronized by the collaboration server. The server validates the role but not content semantics.

## Goals / Non-Goals

**Goals:**

- Persist author metadata for slides and elements without a schema-version bump.
- Make every destructive UI path consult one ownership check before deleting.
- Give the blocked editor a clear, localized prompt naming the owner.
- Keep ownership working after a reload and across tabs in the same browser.
- Keep old decks and old clients working.

**Non-Goals:**

- Server-side authorization against a malicious editor. Every editor still has document write access.
- Cross-device identity, accounts, or ownership transfer.
- Deck deletion, ownership of images/assets, and ownership-aware editing (non-delete changes stay allowed).
- Preventing an editor from moving or restyling another participant's content.

## Decisions

### Store owner as optional metadata on each slide and element

Add `ContentOwner { id: string; name: string }` and an optional `owner` field to the element base shape and `SlideData`. Persist it inside the Yjs maps as flat `ownerId` and `ownerName` fields and reconstruct the nested object in `getElementData`/`getSlideData`.

Why: the Yjs document is already the source of truth, so ownership syncs, persists, exports, and reloads with the content automatically. Optional fields let existing documents remain valid without migration.

Alternative rejected: a separate owners map keyed by object id. It adds a second source of truth that can drift when objects are deleted, duplicated, or pasted.

Alternative rejected: a database column. Ownership is per object, not per deck, and the database does not store object rows.

### Use a browser-scoped stable owner id, separate from the participant id

Add `apps/web/src/lib/owner-identity.ts` that reads or creates an id under `mini-deck:owner-id` in `localStorage`. `DeckProvider` exposes `owner: ContentOwner | null`, combining that id with the current participant's display name.

Why: participant ids are session-scoped, so using them directly would make an editor's own content undeletable after a reload. A separate browser-scoped id preserves the existing presence behavior (each tab can still be a distinct participant) while making ownership durable.

Fallbacks: if storage is unavailable, use the participant id for the session; content created before a reload then appears unowned or owned by the old session and stays protected. Clearing site storage has the same effect. Both are acceptable for an anonymous, link-first app.

Alternative rejected: moving the participant identity itself to `localStorage`. It would merge tabs into one presence entry and change existing collaboration behavior.

Alternative rejected: accounts. Out of scope for this no-account product.

### Centralize the check in the shared package, centralize the prompt in the editor

Add `packages/deck/src/ownership.ts` with pure helpers:

- `getElementOwner`, `getSlideOwner`
- `findElementDeletionConflicts(slide, elementIds, actorOwnerId)`
- `findSlideDeletionConflicts(slide, actorOwnerId)`
- `uniqueOwners` / deduplication by owner id

The slide check includes the slide's own owner plus every contained element's owner. Unowned objects are ignored, so legacy content stays deletable. A conflict is any owner whose id differs from the actor's id.

Add `apps/web/src/components/editor/deletion-guard.tsx` with `DeletionGuardProvider` and `useDeletionGuard()`. The provider owns the prompt state and exposes `guardElementDeletion(slideId, ids)` and `guardSlideDeletion(slideId)`. Both return `false` and show the prompt when conflicts exist; callers only run the real delete when they return `true`. One `OwnershipDialog` is rendered by the provider, using the existing Radix dialog and localized strings.

Why: package-level helpers are testable without a browser, and one UI guard prevents callers from drifting. Mixed selections are blocked as a whole because the guard evaluates the complete id list before any deletion.

Alternative rejected: enforcing inside `deleteElements`/`deleteSlide`. Those functions have no actor identity, are used by tests and utilities, and throwing would mix UI concerns into the document layer.

### Assign ownership at creation, and re-assign on copy

- `createSlide`, `duplicateSlide`, `addElement`, `createTextElement`, `duplicateElements`, and `placeImageAsset` accept an optional owner.
- `duplicateSlide` and `duplicateElements` set the actor as owner of the new objects and leave the source untouched.
- `cloneElementData` omits the source owner by default and accepts an override.
- Clipboard envelopes strip ownership before writing, and paste applies the current actor's owner.
- Image upload/import, emoji insertion, text creation, shape drawing, and plain-text/image paste all pass the current owner.

Stripping ownership from clipboard payloads keeps the envelope parseable by clients that predate this change.

### Prompt rather than toast

Use the existing dialog primitives, because the prompt must identify the owner and interrupt the action. The dialog shows the owner names and a single close action; the object is not deleted. For several owners, names are joined with the locale's list formatting.

### Deletion entry points to update

- `use-editor-shortcuts.ts`: Delete/Backspace
- `use-editor-clipboard.ts`: cut
- `style-panel.tsx`: delete button
- `slide-rail.tsx`: delete slide button
- `canvas-stage.tsx`: removing an abandoned empty text element

Viewer behavior is unchanged: the role check still runs before the ownership check.

## Risks / Trade-offs

- **Client-side only** → A crafted Yjs update can delete anything. Mitigation: state the limitation in the proposal and docs; this feature protects cooperative editors, not hostile ones. Full enforcement would require server-side semantic validation of Yjs updates.
- **Cross-device ownership** → An editor who opens the deck on another device cannot delete content they created elsewhere. Mitigation: inherent to the no-account model; document it.
- **Cleared storage** → The owner id is lost, so the browser can no longer prove ownership. Mitigation: legacy/unowned content remains deletable; owners can duplicate content and delete the copy.
- **Stale owner names** → The stored display name is a snapshot. Mitigation: acceptable for an anonymous prototype; names are only used in the prompt.
- **Old clients** → They ignore unknown ownership fields when rendering, but strict clipboard schemas would reject them. Mitigation: strip ownership from clipboard envelopes. An old client that edits and saves an object may drop its owner, which makes it unowned and deletable; that is the safe compatibility fallback.
- **Two people sharing one browser profile** → They share an owner id. Mitigation: document as a limitation of device-scoped identity.

## Migration Plan

No database or document migration:

1. Deploy the shared package and web app together.
2. Existing decks load with no owner fields; every existing object stays deletable.
3. New objects and copies receive owner fields through normal Yjs sync.
4. Rollback: disable the guard and ignore the fields. New content remains readable by older code because `getElementData`/`getSlideData` ignore unknown map keys; ownership is simply dropped on the next old-client write.

## Open Questions

None blocking the plan. Cross-device ownership and hostile-editor enforcement are explicit non-goals.
