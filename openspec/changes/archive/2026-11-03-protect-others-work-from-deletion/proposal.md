# Proposal

## Why

In a shared deck, every editor currently has the same destructive power: selecting another participant's slide or element and pressing Delete removes their work with no warning. The only collaboration safeguard is the viewer role, so two editors can silently erase each other's contributions.

This change makes authorship visible at the moment of deletion and prevents an editor from deleting content created by someone else.

## What Changes

- Record the author of every newly created slide and element as part of the shared deck document.
- Before any delete action (keyboard, style panel, cut, or slide rail), check whether the selection contains work owned by another participant.
- When it does, block the deletion and show a prompt that names the owner, for example: "This object belongs to Blue Fox. You cannot delete another user's work."
- Block the whole delete action when a multi-selection mixes the current user's objects with another participant's objects; do not partially delete.
- Duplicating or pasting another participant's work creates new objects owned by the participant who duplicated or pasted them.
- Deletions of unowned content, including decks and objects created before ownership metadata existed, keep their current behavior so existing decks stay editable.
- Keep deck content compatible: no schema-version bump and no migration for existing decks.

Assumptions recorded for this change:

- "Another user's work" means slides and slide elements. Whole-deck deletion is out of scope because the app has no deck-delete operation.
- A "user" is the app's existing anonymous participant identity. Ownership is scoped to the browser that created the object, using a device-persistent owner identifier so the author can still manage their own work after reopening the deck.
- The rule is a collaborative UX safeguard, not an authorization boundary: every editor still holds the edit capability for the Yjs document, so a malicious client can bypass client-side checks.

## Capabilities

### New Capabilities

- `content-ownership`: Records who created each slide and element, exposes that ownership to the editor, and governs which deletions are allowed.

### Modified Capabilities

- `deck-authoring`: Deleting slides and elements is constrained by ownership. The existing delete and cut behaviors gain an ownership check and an owner prompt.

## Impact

- `packages/deck`: element and slide data, Yjs maps, creation/duplication helpers, clipboard handling, and a reusable deletion-ownership guard.
- `apps/web`: editor provider, participant/owner identity storage, canvas, style panel, slide rail, keyboard shortcuts, clipboard hook, image/emoji insertion, new ownership prompt, and English/Greek strings.
- Tests: unit tests for ownership metadata and guard behavior, integration coverage for shared documents, and Playwright coverage for two editors.
- No database, API, or collaboration-server change; ownership lives in the Yjs document and reaches participants through normal collaboration sync.
