# Tasks

## 1. Share-link construction

- [x] 1.1 Change `buildDeckLinks` in `apps/web/src/lib/session.ts` to accept the active locale and build `/d/{deckId}?lang={en|el}#{token}` with the URL API, keeping `lang` before the fragment and deriving the view token unchanged. Verify the function compiles and the edit/view links contain the expected query and hash.
- [x] 1.2 Add `apps/web/test/session.test.ts` covering English and Greek links, query-before-hash ordering, a custom origin, and preservation of the edit/view tokens. Verify with `pnpm exec vitest run apps/web/test/session.test.ts`.

## 2. Share dialog integration

- [x] 2.1 Pass `locale` from `useI18n()` into `buildDeckLinks` in `apps/web/src/components/editor/share-dialog.tsx`, and regenerate the links when the dialog language changes without closing it. Verify the existing share dialog still displays both links and copies them.
- [x] 2.2 Update share-URL assertions in `e2e/sharing.spec.ts` and `e2e/localization.spec.ts` to parse the URL and assert `lang=en`, the deck path, and the fragment token instead of matching `/d/{id}#{token}` literally. Verify both specs pass.
- [x] 2.3 Add Playwright coverage that an English share dialog generates `lang=en` for both links and that switching the dialog to Greek while it is open regenerates both links with `lang=el` and keeps the dialog open. Verify in `e2e/localization.spec.ts`.

## 3. Proxy locale consumption

- [x] 3.1 Refactor `apps/web/src/proxy.ts` so CSP, referrer, nosniff, frame, permissions, `Vary`, and `Cache-Control` headers are applied by one helper used for both normal responses and redirects. Verify the existing proxy tests still pass.
- [x] 3.2 Implement the deck-link locale handoff in the proxy: for `/d/` requests with a valid `lang`, set `mini-deck-locale` using the existing cookie constants and attributes (`Path=/`, one-year max age, `SameSite=Lax`, non-HttpOnly, `Secure` on HTTPS or `X-Forwarded-Proto: https`), remove only `lang` from the URL, and return a `307` redirect. Verify an English cookie is overwritten by a Greek link and a Greek cookie by an English link.
- [x] 3.3 Extend `apps/web/test/proxy.test.ts` with valid-language redirect, cookie attributes, query preservation, security headers, `no-store`, invalid/empty language, missing language, non-deck path, and HTTP/forwarded-HTTPS `Secure` cases. Verify with `pnpm exec vitest run apps/web/test/proxy.test.ts`.
- [x] 3.4 Confirm invalid or unsupported `lang` values leave the request on the existing path with no cookie change and no error response. Verify with a proxy unit test and a manual response assertion.

## 4. Recipient behavior end to end

- [x] 4.1 Add a Playwright test that opens a Greek edit share link in an English browser with no stored locale and verifies Greek first paint (`html lang="el"` and Greek chrome), the Greek locale cookie, a URL with `lang` removed, the intact fragment token, and the editor role.
- [x] 4.2 Add a Playwright test that an English share link overrides a Greek stored locale and Greek `Accept-Language`, and that a Greek link overrides an English stored locale. Verify the first rendered language, not just a post-hydration switch.
- [x] 4.3 Add a Playwright test that opens a Greek view link in a fresh English context and verifies Greek chrome, read-only behavior, no edit-token or editing controls, and the stored locale.
- [x] 4.4 Add Playwright coverage for invalid `lang` falling back to the existing resolution, an old `/d/{deckId}#{token}` link still opening, reload persistence after a language-bearing link, and a manual language switch winning on the next reload. Verify in `e2e/localization.spec.ts` and `e2e/sharing.spec.ts`.
- [x] 4.5 Verify the language-bearing link never puts the capability token in a document request or the redirect `Location`, and that the session API still receives the token only in the `Authorization` header. Verify by extending the existing privacy assertions in `e2e/sharing.spec.ts`.

## 5. Documentation

- [x] 5.1 Update `docs/localization.md` to add the link-locale step ahead of the cookie and `Accept-Language`, explain link-wins persistence and parameter consumption, and replace the statement that locale is never stored in a deck URL. Verify every documented resolution step matches the implementation.
- [x] 5.2 Update `docs/sharing.md` with the new URL shape, the reason `lang` is a query parameter and the token remains in the fragment, and the rule that language never affects authorization. Verify the examples resolve to working links.
- [x] 5.3 Update the README localization and sharing summaries so they no longer claim deck URLs are unaffected by language. Verify the statements match the new behavior.

## 6. Integration verification

- [x] 6.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:integration`; confirm all pass, including the new session and proxy unit tests.
- [x] 6.2 Run `pnpm test:e2e` and confirm the English, Greek, and sharing suites pass with the redirect/fragment flow and the new share-link format.

## Workflow follow-up

- Before archiving this change, sync or archive `add-greek-localization` so `openspec/specs/ui-localization/spec.md` exists. This delta uses RENAMED and MODIFIED operations and cannot be applied while the capability is missing.
- After that prerequisite is resolved, archive this change and verify the archived `ui-localization` spec contains the new share-link requirements and no longer contains the "language out of deck links" invariant.
