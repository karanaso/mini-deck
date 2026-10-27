# Tasks

## 1. Localization foundation

- [x] 1.1 Add `apps/web/src/lib/i18n/config.ts` with the `en`/`el` locale set, default locale, cookie name, locale guard, and an `Accept-Language` parser that respects quality values. Verify Vitest covers `el`, `el-GR`, weighted preferences, wildcards, empty/malformed headers, `q=0`, and the English fallback.
- [x] 1.2 Inventory every user-facing string in the web app and create the English dictionary at `apps/web/src/lib/i18n/dictionaries/en.ts`, grouped by `landing`, `deckShell`, `editor`, `dialogs`, `presentation`, `feedback`, `errors`, `format`, `metadata`, and `a11y` namespaces. Verify every current UI surface listed in the design is represented and `pnpm --filter @mini-deck/web typecheck` passes.
- [x] 1.3 Create the Greek dictionary at `apps/web/src/lib/i18n/dictionaries/el.ts` covering every English key, using the glossary and tone rules in the design. Verify `tsc` reports no missing or extra keys when the Greek object is checked against the English dictionary type.
- [x] 1.4 Add `apps/web/src/lib/i18n/dictionaries.ts` with locale-to-dictionary lookup, `MessageKey`, and typed translation helpers. Verify unit tests prove key parity, non-empty Greek values, identical placeholder sets per key, and that no raw key can be returned for a known key.
- [x] 1.5 Implement `t(key, params)` interpolation and `tCount(baseKey, count)` plural selection using `Intl.PluralRules`, including an `.other` fallback for unhandled categories. Verify unit tests cover 0/1/2 counts in both locales, missing placeholders, and repeated placeholders.
- [x] 1.6 Implement locale-aware formatting helpers in `apps/web/src/lib/i18n/format.ts` for relative time, absolute dates, and numbers. Verify tests cover Greek `τώρα`/minutes/hours/yesterday/date output and confirm no English `"m ago"` suffix appears.
- [x] 1.7 Write `apps/web/src/components/i18n/locale-provider.tsx` with the server-provided initial locale, both dictionaries, `t`/`tCount`, `setLocale`, cookie persistence, `document.documentElement.lang` updates, localized document title, and `router.refresh()`. Verify a component test shows a switch updating copy without remounting children or losing local state.

## 2. Request resolution and language switcher

- [x] 2.1 Add `apps/web/src/lib/i18n/server.ts` with `getLocale()` resolving a valid cookie first and then `Accept-Language`, plus a pure `resolveLocale(cookieValue, headerValue)` helper for tests. Verify Vitest covers cookie precedence, invalid cookies, missing cookies, Greek headers, and English fallback.
- [x] 2.2 Convert `apps/web/src/app/layout.tsx` to an async Server Component that renders `<html lang={locale}>`, wraps the app in `LocaleProvider`, and exposes localized metadata through `generateMetadata`. Verify `pnpm --filter @mini-deck/web build` succeeds and a Greek first request returns `lang="el"` with Greek metadata.
- [x] 2.3 Build `apps/web/src/components/i18n/locale-switcher.tsx` as an accessible dropdown using the existing menu primitives, with autonyms `English`/`Ελληνικά`, a selected-state indicator, a localized accessible name, keyboard support, and focus restoration. Verify component tests cover selection, `aria-checked`/active state, keyboard navigation, and the localized label.
- [x] 2.4 Place the language switcher in the landing header and the editor/viewer top bar for both roles. Verify it is visible and operable on landing, editor, and viewer screens at desktop and mobile widths.
- [x] 2.5 Verify cookie persistence and server resolution together: switch to Greek, reload, open a deck link, and return to landing; confirm all three document requests keep Greek and the cookie has `Path=/`, `SameSite=Lax`, and a one-year max-age. Verify the check with a Playwright test or a documented manual browser-network check.

## 3. Landing page

- [x] 3.1 Migrate the landing header, hero copy and line-broken headline, feature cards, mockup labels, footer, and action labels to dictionary lookups. Verify the Greek landing page has no English interface copy and the English landing copy is unchanged.
- [x] 3.2 Migrate recent-deck states, open/remove accessible names, empty-state copy, and removal toasts; pass the active locale into `formatLastOpened` and replace the hard-coded relative-time strings with the formatter. Verify unit tests for `formatLastOpened` and a Playwright assertion for Greek relative timestamps and empty state.
- [x] 3.3 Migrate deck-creation errors and success feedback to localized API error codes and dictionary messages. Verify a simulated create failure shows Greek feedback and never displays the server's English message.

## 4. Deck shell and error states

- [x] 4.1 Migrate `DeckLoader` loading, invalid-link, retry, and error states to the dictionary, and ensure session/network failures show a localized generic message while logging diagnostic detail. Verify Playwright covers Greek loading, Greek invalid-link, and Greek retry states.
- [x] 4.2 Migrate `apps/web/src/app/not-found.tsx` and `apps/web/src/app/error.tsx` to the active locale, including headings, descriptions, buttons, and accessible names. Verify Greek not-found and error screens render with Greek copy and `lang="el"`.
- [x] 4.3 Migrate the editor workspace's loading-slides, syncing, and reconnecting messages plus the read-only feedback shown to viewers. Verify Greek copy appears for each state and English remains unchanged.

## 5. Editor and viewer chrome

- [x] 5.1 Migrate `TopBar`: back/all-decks label, deck-title field label, view-only badge, presence "you"/rename labels, connection badge, shortcuts trigger, share, present, and export actions. Include the language switcher. Verify Playwright checks Greek editor and viewer top bars and localized presence labels.
- [x] 5.2 Migrate `SlideRail`: slides heading, add/duplicate/delete labels, slide navigation accessible names, deletion toasts, and the last-slide error. Verify Greek labels and a Greek last-slide error through component or Playwright tests.
- [x] 5.3 Migrate `Toolbar`, `StylePanel`, and `ZoomControls`: tool labels with shortcut keys, image action, undo/redo, style labels, element-type names, alignment labels, arrange labels, zoom labels, selection summaries, and duplicate/delete toasts. Verify Greek singular/plural selection summaries and a Greek style-panel control sweep.
- [x] 5.4 Migrate the keyboard-shortcuts dialog, including action names, descriptions, and key combinations; keep key symbols and key names untranslated. Verify Greek dialog copy and that shortcut keys still work.
- [x] 5.5 Migrate `ShareDialog`, `ParticipantDialog`, and the shared dialog close label, including copy feedback, link descriptions, bearer-secret warning, display-name labels, cancel/save, and error text. Verify Playwright covers the Greek share and participant dialogs and localized copy confirmations.
- [x] 5.6 Migrate `PresentationOverlay`: exit/previous/next labels, keyboard help, and any status text. Verify Greek presentation mode with keyboard navigation and Escape exit.
- [x] 5.7 Migrate `DeckProvider`, `CanvasStage`, clipboard, and shortcut feedback: display-name update, cut/paste/duplicate results, read-only messages, element creation failures, image paste results, and text paste results. Verify Greek toasts for each action and confirm no document/collaboration fields were added.

## 6. Errors, validation, and formatting integration

- [x] 6.1 Extend the API error envelope with optional `details` for localized parameters such as `maxMb`, keeping `code` and `message` backward compatible. Update `apiError` and the image-upload route. Verify integration tests still read `code`/`message` and that `image_too_large` includes the limit detail.
- [x] 6.2 Add `apps/web/src/lib/api-error.ts` to parse error responses into typed `ApiError` values with `code`, `status`, `details`, and diagnostic `cause`, and map codes to `errors.api.*` with a localized generic fallback. Verify unit tests cover known codes, unknown codes, non-JSON responses, and network failures.
- [x] 6.3 Convert `validateImageFile` to return error codes and migrate the toolbar and clipboard upload flows to localized messages, including supported formats and the size limit. Verify Playwright shows Greek messages for an oversized image and an unsupported SVG.
- [x] 6.4 Introduce typed client operation errors for export and image loading, map them to localized export feedback, and keep technical details in the error cause. Verify a Greek PDF export failure shows a Greek message, downloads no partial file, and allows retry.
- [x] 6.5 Replace remaining hard-coded counts, plural forms, and time/date formatting across landing, slide rail, style panel, and export progress with the formatting helpers. Verify unit tests cover both locales and a Playwright sweep confirms no English count or time fragments appear in Greek.

## 7. End-to-end and accessibility coverage

- [x] 7.1 Pin the Playwright default locale to `en-US` in `playwright.config.ts` so existing English tests stay deterministic, and add a helper for opening a Greek context or setting the locale cookie. Verify the existing English suite passes unchanged.
- [x] 7.2 Add `e2e/localization.spec.ts` covering first-visit Greek detection, manual switching from landing and deck, persistence across reload/deck links, `html lang`, Greek landing/editor/viewer/share/presentation screens, and Greek invalid-link/error states.
- [x] 7.3 Add a two-context mixed-language test: one Greek participant and one English participant on the same deck, each seeing their own chrome while sharing identical deck content, presence, and edits.
- [x] 7.4 Add a mid-edit language-switch test that changes language while an element is selected and a dialog is open, then verifies the selection, current slide, document content, edit history, open dialog, and live connection survive.
- [x] 7.5 Run axe on the Greek landing page, editor, viewer, and presentation overlay; verify no serious or critical violations and that the language switcher exposes a localized accessible name and selected state.
- [x] 7.6 Check Greek text expansion at desktop and mobile widths across the top bar, toolbar tooltips, style panel, share dialog, presentation help, and landing feature cards. Verify no clipped labels or broken controls and record the check in the localization guide.
- [x] 7.7 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, and `pnpm test:e2e`. Verify all suites pass, including the new Greek coverage, and record any environment-specific setup needed for Playwright.

## 8. Documentation and release review

- [x] 8.1 Write `docs/localization.md` covering the supported locales, resolution order, cookie, server/client provider boundaries, dictionary workflow, interpolation and plural rules, Greek glossary and tone, API error-code mapping, coverage checklist, and how to add a future locale. Verify every documented key/command matches the implementation.
- [x] 8.2 Update the README with the localization behavior and a pointer to `docs/localization.md`. Verify the quickstart and test commands remain accurate.
- [ ] 8.3 Complete a native-speaker review of the Greek copy against the glossary and tone rules, correcting awkward or gendered phrasing and confirming product terms such as "deck". Record the reviewer and date in the localization guide or pull request.
- [x] 8.4 Measure the production web bundle/RSC payload after adding both dictionaries, and confirm the increase is acceptable for two locales. If it is not, lazy-load the inactive dictionary and re-measure; verify switching still works offline.
- [x] 8.5 Perform a final English regression review of landing, editor, viewer, sharing, clipboard, presentation, and export; verify English copy, layout, shortcuts, and roles are unchanged apart from the language switcher.

## Workflow follow-up

- Archive the change with `/opsx-archive` after the Greek copy review, the full test suite, and the English regression review pass.
- Confirm the archived `ui-localization` spec preserves the URL/capability invariant and the mixed-language collaboration behavior.
