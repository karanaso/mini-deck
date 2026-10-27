# Design

## Context

See `proposal.md` — Why and `specs/ui-localization/spec.md` for the behavior contract. The current web app is a single-locale Next.js 16 App Router application:

- `apps/web/src/app/layout.tsx` hard-codes `<html lang="en">` and English metadata.
- Interface copy is embedded directly in client components, hooks, and a few server components. There is no i18n dependency, dictionary, provider, or locale cookie.
- Deck routes are `/d/{deckId}#{token}`. The fragment token is a bearer capability and must never acquire locale-specific routing or query data.
- Most UI is client-rendered, but the landing page, deck shell, and metadata begin as server output. A client-only locale switch would therefore flash English and produce a hydration mismatch for Greek visitors.
- The test suite assumes English copy in Playwright and in several unit tests.

The design must add Greek without changing the deck URL model or storing UI language in collaborative data.

## Goals / Non-Goals

**Goals:**

- Resolve one active interface locale (`en` or `el`) before the first render, from a saved preference or the browser's `Accept-Language` header.
- Make a manual switch immediate and persistent without a page reload or collaboration reconnect.
- Centralize every interface string in typed dictionaries, with compile-time and test-time guarantees that Greek is complete.
- Localize formatting (plurals, relative times, dates, metadata) rather than concatenating English fragments.
- Localize API failures by stable error code, not by displaying server English.
- Keep existing English behavior and all deck capability links working unchanged.

**Non-Goals:**

- Locale-prefixed routes (`/el/d/...`), domain-based locales, or translated share URLs.
- Machine translation at runtime, a translation management service, or translating user content.
- Right-to-left support, additional locales, or language-specific fonts.
- Translating logs, internal errors, database content, generated participant identities, or the `packages/deck` API.
- Server-side locale negotiation for API responses; APIs stay language-neutral and return stable codes.

## Decisions

### D1. Two locale identifiers and one preference cookie

Use `en` and `el` as the only supported interface locales. `en` is the default and fallback. The HTML `lang` attribute uses the bare tag; `Intl` formatting uses `en-US` and `el-GR` for stable regional formatting.

Persist an explicit choice in a first-party cookie:

```text
name: mini-deck-locale
value: en | el
path: /
max-age: 31536000
samesite: Lax
secure: only on HTTPS
httponly: false (the client sets it on switch)
```

The cookie is a presentation preference, not an authorization input. It contains no token or deck identifier and MUST NOT influence role resolution. Invalid values are ignored. If cookies are unavailable, the in-memory switch still works for the current tab; persistence simply degrades.

**Alternatives considered**

- *`localStorage` only*: easy on the client, but unavailable during server rendering, so Greek users would get an English first paint and a hydration correction. Rejected.
- *Locale in the URL*: shareable and crawler-friendly, but changes `/d/{deckId}#{token}` links, requires redirects for every existing link, and mixes locale with capability routing. Rejected for this change.
- *Per-deck language stored in Yjs*: would force one language on all collaborators and mutate deck content when someone changes their UI. Rejected.

### D2. Resolution order and server-first rendering

Resolve the locale on every document request, before React renders:

1. If the `mini-deck-locale` cookie is valid, use it.
2. Otherwise parse `Accept-Language`, sorted by quality value, and choose `el` when the highest-priority supported tag is Greek (`el` or `el-*`).
3. Otherwise use `en`.

`apps/web/src/app/layout.tsx` becomes an async Server Component that calls a server-only `getLocale()` helper and renders `<html lang={locale}>`. A `generateMetadata` function uses the same locale for the document title and description. `not-found.tsx` resolves the locale the same way. Passing the server-resolved locale into the client provider guarantees the first client render matches the server output.

Because `cookies()` and `headers()` are request-time APIs, document routes become dynamically rendered. That is acceptable: deck routes are already `no-store`, and the landing page depends on device-local recents. API routes and asset delivery are unaffected.

**Alternatives considered**

- *Client-only detection after hydration*: simplest, but causes an English flash, stale `<html lang>`, and metadata for Greek users. Rejected.
- *Proxy-only locale injection*: the proxy could set a request header or cookie, but the root layout still needs to read it. Keeping resolution in one server helper is simpler and easier to test. The existing proxy remains responsible only for security headers.

### D3. Typed dictionaries and a client locale provider

Create `apps/web/src/lib/i18n/` with:

```text
config.ts          supported locales, cookie name, Accept-Language parsing
dictionaries/en.ts English source of truth
dictionaries/el.ts Greek translations, typed against the English shape
dictionaries.ts    locale -> dictionary lookup and MessageKey type
server.ts          request-scoped getLocale() using cookies() and headers()
format.ts          locale-aware plural, relative-time, and date helpers
```

Dictionaries are flat key/value maps grouped by namespace (`landing.*`, `editor.*`, `share.*`, `errors.*`, `a11y.*`). English is the source of truth; the Greek object uses `satisfies EnglishDictionary`, so a missing or extra Greek key is a TypeScript error. A unit test additionally verifies key parity, non-empty values, and matching placeholders.

A client `LocaleProvider` (mounted in the root layout) receives the server-resolved `initialLocale`, exposes `locale`, `t(key, params)`, `tCount(baseKey, count)`, and `setLocale(next)`, and selects the active dictionary from the shared dictionary module. Both dictionaries are small and ship together, which makes switching instant and works while offline. If more locales are added later, lazy-load dictionaries instead of growing the initial bundle.

`t` performs simple `{name}` interpolation on plain-text strings; React escapes the result, so no HTML interpolation or `dangerouslySetInnerHTML` is used. `tCount` uses `Intl.PluralRules(locale)` to select `<baseKey>.one` / `<baseKey>.other`, falling back to `.other` for unhandled categories. Greek and English both use `one`/`other` categories, which are asserted in tests.

**Alternatives considered**

- *`next-intl` or another library*: robust but adds a dependency, provider setup, message compilation, and routing assumptions for two locales and a small string set. The typed dictionary is less machinery and gives compile-time parity. Revisit if the product adds many locales or translators.
- *JSON dictionaries fetched at runtime*: adds a request or bundler step and weakens type safety. TS modules are simpler here.
- *Functions in dictionaries*: cannot be serialized across the server/client boundary cleanly and complicate parity checks. Keep values as strings and compose in components.

### D4. Instant switching without interrupting the deck

`setLocale(next)` performs four steps:

1. Update provider state and the active dictionary immediately.
2. Set `document.documentElement.lang` and the localized document title immediately.
3. Write the `mini-deck-locale` cookie (when available).
4. Call `router.refresh()` to re-render server components and metadata with the new locale.

`router.refresh()` preserves client state and does not remount the editor, so the Yjs document, UndoManager, awareness, current slide, selection, and open dialogs remain intact. The language switcher itself is a small client component using the existing dropdown primitives, with a globe/languages icon, an autonym menu (`English`, `Ελληνικά`), a check for the active locale, and a localized accessible name.

Placement:

- Landing header, in the right-hand utility cluster.
- Editor/viewer top bar, next to the shortcuts control. It must be visible for both roles.

**Alternatives considered**

- *Full page reload on switch*: guaranteed correctness but disconnects the collaboration session and can lose in-memory edits. Rejected.
- *Server action to set the cookie and return the dictionary*: adds a round trip and still needs client state for an instant transition. Cookie + local state is simpler.
- *Language switch synced through awareness*: would override collaborators' personal preference. Rejected.

### D5. Dictionary coverage and migration

Every user-facing string in the web app moves to the dictionary. The initial migration covers:

- **Landing**: header tagline, no-account note, hero copy, create action, mockup labels, feature cards, recent-deck heading and empty state, relative times, open/remove accessible names, footer, toasts.
- **Deck shell/errors**: loading, invalid-link, error, retry, and back-to-landing screens.
- **Editor top bar**: back/all-decks, deck title label, view-only badge, presence/you labels, connection states, shortcuts help, share, present, export.
- **Editor chrome**: slide rail labels and actions, toolbar tool labels (keeping shortcut keys), style panel labels/values, zoom controls, read-only feedback, syncing/reconnecting messages.
- **Dialogs and overlays**: share dialog, participant dialog, keyboard-shortcut dialog, presentation controls/help, dialog close button.
- **Feedback**: all success/error/info toasts, image validation, upload/export/duplicate/delete failures, export progress.
- **Accessibility**: every `aria-label`, `title`, screen-reader string, and status label.

Strings that are product names, keyboard keys, file formats, or user content stay unchanged. Greek copy uses a consistent glossary:

| English | Greek |
| --- | --- |
| deck | deck (product term; keep Latin) |
| slide | διαφάνεια |
| link | σύνδεσμος |
| share | κοινοποίηση |
| present | παρουσίαση |
| export | εξαγωγή |
| image | εικόνα |
| rectangle / ellipse / arrow | ορθογώνιο / έλλειψη / βέλος |
| fill / stroke | γέμισμα / περίγραμμα |
| opacity / rotation | αδιαφάνεια / περιστροφή |

Greek copy is direct and friendly, uses gender-neutral phrasing where possible, Greek punctuation, and keeps `Mini Deck`, PNG, PDF, and keyboard symbols unchanged. The initial Greek copy is authored in this change and must be reviewed by a native speaker before release.

A `docs/localization.md` guide records the locale model, cookie, dictionary workflow, glossary, plural/interpolation rules, and a coverage checklist for new UI.

**Alternatives considered**

- *Translate only the landing page first*: less work but leaves the editor unusable for Greek users. Rejected by the chosen scope.
- *Automated string extraction*: would help later, but the component count is small enough for a typed dictionary and a review checklist now.

### D6. Localized API and application errors

The API keeps its existing envelope `{ error: { code, message } }` and its English `message` for API consumers and logs. Add an optional, non-breaking `details` object for values needed by localized copy, for example `{ maxMb: 10 }` on `image_too_large`.

The web client never renders `error.message` directly. A small `lib/api-error.ts` parses the envelope into a typed `ApiError` carrying `code`, `status`, and `details`. Components map codes to `errors.api.<code>`; unknown codes and network failures fall back to `errors.api.generic`. The English server text remains available in `cause` for `console.error` and tests.

The same pattern applies to client-side operations: `validateImageFile` returns a code rather than a sentence, export/image loading throws typed errors with codes, and `LastSlideError` maps to a localized message. Internal `packages/deck` messages remain English because they are diagnostic, not UI.

**Alternatives considered**

- *Return translated messages from the server*: requires sending locale with every request, makes APIs locale-dependent, and duplicates translation logic. Rejected.
- *Display raw server messages and hope they are short*: violates the no-English-in-Greek-UI requirement and leaks technical copy. Rejected.

### D7. Locale-aware formatting

Replace hard-coded formatting with `Intl`:

- `Intl.PluralRules(locale)` for element/slide/participant counts and `tCount` keys.
- `Intl.RelativeTimeFormat(locale, { numeric: "auto" })` for recent-deck timestamps (`τώρα`, `πριν από 5 λεπτά`, `χθες`).
- `Intl.DateTimeFormat(locale, { dateStyle: "medium" })` for dates older than the relative window.
- `Intl.NumberFormat(locale)` where counts are displayed as numbers.

The slide counter keeps the compact `current / total` format because it is numeric and unambiguous. The formatter helpers accept an explicit locale so they are unit-testable without React.

**Alternatives considered**

- *Hard-coded Greek strings such as `"${n} λεπτά πριν"`*: wrong for singular/plural and for dates. Rejected.
- *A formatting library such as date-fns*: unnecessary; `Intl` is built into the runtime and covers the required cases.

### D8. Test strategy

- **Unit (Vitest)**: Accept-Language parsing with quality values, `el-*` matching, wildcards, empty/malformed input, and `q=0`; cookie validation; dictionary key parity, non-empty values, placeholder parity; plural selection for 0/1/2; relative-time and date output in both locales; API error mapping and unknown-code fallback.
- **Component**: `LocaleProvider` renders Greek/English copy, the switcher exposes the active language, and switching updates the provider without remounting children.
- **Playwright**: pin `locale: "en-US"` in the shared config so existing English tests stay deterministic; add a Greek suite that covers first-visit detection (`el-GR`), manual switching and persistence across reload/deck links, `html lang`, Greek landing/editor/viewer/share/presentation/error surfaces, Greek validation and API errors, plural/relative-time output, mixed-language collaboration, and language switching mid-edit without losing content or connection.
- **Accessibility**: run axe on Greek landing and editor; verify localized accessible names and the language switcher's selected state.
- **API integration**: assert that error envelopes still expose stable codes and that optional details do not break existing consumers.

**Alternatives considered**

- *Only unit tests*: would miss server/client hydration mismatches, cookie behavior, and untranslated JSX. Rejected.
- *Screenshot snapshots of every Greek screen*: brittle and noisy for a copy change. Use targeted role/text assertions and axe instead.

### D9. Rollout and compatibility

No database, API, or document-schema migration is required. Ship dictionaries, provider, server locale resolution, and migrated strings together. Default English preserves existing behavior for unsupported browsers; a Greek browser now receives Greek on first visit. Existing edit/view links, recent-deck entries, and active collaboration sessions are untouched. Rollback is a code revert; the locale cookie is harmless if left behind and is ignored by older code.

## Risks / Trade-offs

- **Greek copy quality without native review** → Author copy against the glossary, use gender-neutral phrasing, and require a native-speaker review task before release. Flag any strings that need product terminology decisions.
- **A missed string leaves English in the Greek UI** → Typed dictionaries catch key drift, but not hard-coded JSX. Use a coverage checklist, a Greek E2E sweep, and code review focused on user-facing strings. Add new strings only through the dictionary.
- **Greek text expansion overflows tight controls** → Greek is often longer than English; verify the top bar, style panel, buttons, tooltips, and dialogs at desktop and mobile widths. Prefer flexible sizing and shorter Greek synonyms over truncation.
- **Server-rendered locale makes document routes dynamic** → Accept it for a collaborative app with `no-store` deck routes. If landing-page caching becomes important, move detection behind a proxy or a client shell and re-evaluate.
- **Cookie unavailable or blocked** → The current tab still switches in memory; only persistence is lost. Auto-detection remains the fallback on the next request.
- **Two dictionaries in the client bundle** → Small for two locales; measure the bundle delta and switch to lazy dictionary loading when more locales are added.
- **New API error code without a translation** → The UI shows a localized generic message rather than English; add the code to the mapping and a unit test when introducing one.
- **Different UI languages on one deck** → Intentional. The shared Yjs document, participant identities, and exported slides stay language-neutral; only chrome differs per participant.
- **Default deck title and participant names remain English** → They are shared content/identity, not chrome. Greek users can rename the deck and themselves; translating stored values would make collaboration inconsistent.

## Migration Plan

1. Add locale configuration, dictionaries, server resolver, formatters, and unit tests.
2. Add the provider and language switcher to the root layout, landing header, and editor top bar.
3. Migrate strings surface by surface, starting with the landing page and shell, then editor chrome, dialogs/overlays, feedback, and accessibility labels.
4. Convert API/validation/export failures to typed codes and localized presentation.
5. Add Greek Playwright coverage, pin English locale for existing tests, run axe, and verify layout with long Greek strings.
6. Write the localization guide and complete native-speaker review.
7. Deploy with the normal web build. No data migration or service rollout order is required; rollback is a web-only redeploy.

## Open Questions

None. The only remaining non-technical step is native-speaker review of the Greek copy, which is tracked as a release task rather than an open design question.
