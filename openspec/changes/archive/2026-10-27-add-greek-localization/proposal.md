# Proposal

## Why

The product is currently English-only: every label, dialog, toast, validation message, and accessibility label is hard-coded in English. Greek-speaking visitors, editors, and viewers cannot use the interface in their language, even though the deck content itself may already be Greek. There is no localization layer to extend, so Greek support requires establishing one.

## What Changes

- Introduce a typed English/Greek UI localization layer that covers the entire web interface: landing page, editor chrome, slide rail, style panel, toolbar, dialogs, presentation overlay, viewer state, empty/error states, toasts, tooltips, keyboard-shortcut help, and accessibility labels.
- Detect the initial language from the browser's `Accept-Language` header (`el` → Greek, otherwise English), and default to English when there is no usable preference.
- Add a manual language switcher on the landing page and in the editor/viewer top bar. Persist the explicit choice in a first-party cookie so it survives reloads and applies across deck links.
- Keep the language out of deck URLs. Existing `/d/{deckId}#{token}` edit and view links MUST continue to work unchanged, and the language preference MUST NOT be part of capability-token handling.
- Localize numbers, plurals, relative timestamps, dates, document metadata, and the `<html lang>` attribute using `Intl` and locale-specific rules. Greek uses its own plural forms rather than English-style `one/other` copy.
- Map API error codes to localized messages instead of displaying English server text. Technical/unknown failures fall back to a localized generic message while diagnostic details remain available to logging.
- Keep user-created content (deck titles, slide text, uploaded images) and generated participant identities untranslated so shared decks remain identical for every participant. One participant may see Greek chrome while another sees English chrome on the same deck.
- Add automated coverage for locale detection and persistence, dictionary completeness, Greek plural/date formatting, localized error presentation, and Greek end-to-end flows. Existing English tests remain deterministic by pinning the browser locale.
- Explicitly out of scope for this change: additional languages, right-to-left layouts, locale-prefixed routes, server-side translation of user content, translated participant names, and professional copy review (Greek copy is authored in this change and flagged for native-speaker review).

## Capabilities

### New Capabilities

- `ui-localization`: Language negotiation, persistence, translation lookup, localized formatting, localized error presentation, language switching, and the invariant that localization does not affect deck links, capability tokens, collaboration data, or user content.

### Modified Capabilities

None. The `ui-localization` capability adds a cross-cutting interface behavior without changing the existing deck-authoring, live-collaboration, link-sharing, or deck-export contracts.

## Impact

- **Web UI**: `apps/web/src/app/layout.tsx` and metadata, a new locale provider and dictionaries under `apps/web/src/lib/i18n/`, and every user-facing component under `apps/web/src/components/`, `apps/web/src/app/`, `apps/web/src/hooks/`, and `apps/web/src/lib/`.
- **Locale resolution**: server-side reading of the locale cookie and `Accept-Language`; a client provider and cookie-backed switcher. No URL or routing changes.
- **Formatting**: `formatLastOpened` and slide/element count copy move to locale-aware helpers; `Intl.PluralRules`, `Intl.RelativeTimeFormat`, and `Intl.DateTimeFormat` replace hard-coded English.
- **Errors**: API error envelopes keep their existing `code` and `message`; the web client gains a code-to-dictionary mapping and localized fallbacks. No breaking API contract change.
- **Dependencies**: no new runtime dependency is required; the localization layer is a small typed dictionary and formatting utilities.
- **Tests and docs**: new unit tests for locale utilities and dictionary parity; Playwright coverage for Greek landing, editor, viewer, dialogs, and persistence; a localization guide covering how to add or review translations.
- **Compatibility**: existing English-only links, cookies, recent-deck entries, and collaboration sessions remain valid. The only visible default change is that a browser preferring Greek now opens the UI in Greek.
