# Design

## Context

See `proposal.md` for motivation and `specs/ui-localization/spec.md` for the behavior contract.

- Share links are built in `apps/web/src/lib/session.ts` (`buildDeckLinks`) and rendered by `apps/web/src/components/editor/share-dialog.tsx`. Today they are `/d/{deckId}#{token}`: deck identity in the path, capability token in the fragment.
- Locale is resolved before the first render by `getLocale()` in `apps/web/src/lib/i18n/server.ts`, using the `mini-deck-locale` cookie, then `Accept-Language`, then English. `apps/web/src/app/layout.tsx` renders `<html lang>` and passes the locale to the client provider.
- `apps/web/src/proxy.ts` is a Next.js 16 Proxy (formerly middleware). It runs on document routes, sets security headers, and marks deck/API responses `no-store`. Proxy responses can set cookies and issue redirects.
- The root layout cannot read `searchParams`. Any link-driven locale must therefore be turned into request state before the layout renders, or resolved on the client after hydration.
- The token must never leave the fragment. Query parameters are sent to the server on the initial request, so only the presentation-only locale may travel there.
- `add-greek-localization` deliberately kept locale out of deck URLs. This change supersedes that decision for share links only; the authorization and collaboration invariants it established remain.

## Goals / Non-Goals

**Goals:**

- A share link opens in the language of the editor who generated it, on the first paint, regardless of the recipient's browser preference or stored language.
- The link's language becomes the recipient's remembered preference; it does not keep overriding a later manual switch.
- The final deck URL is clean and identical to today's shape apart from having carried the hint.
- Capability handling, roles, collaboration data, and token privacy are untouched.

**Non-Goals:**

- Locale-prefixed routes, per-deck content language, additional locales, or translating stored deck content.
- Changing the API, database, Yjs document, awareness data, recent-deck storage, or exports.
- Forcing a language on collaborators forever; the switcher remains authoritative after the first open.
- Adding language hints to the creator's initial deck URL, recent-deck reopen URLs, or non-share navigation.

## Decisions

### D1. Carry the locale as a `lang` query parameter before the fragment

Share links become:

```text
/d/{deckId}?lang={en|el}#{token}
```

Both edit and view links include `lang`, including `lang=en`. The query is before the fragment, so the token remains entirely client-side.

`buildDeckLinks` uses the URL API instead of string concatenation:

```ts
const url = new URL(`/d/${deckId}`, origin);
url.searchParams.set("lang", locale);
url.hash = token;
```

The share dialog reads `locale` from `useI18n()` and re-runs link generation when the dialog is open and the locale changes. It passes the value explicitly rather than reading the cookie, keeping link generation deterministic and unit-testable.

**Alternatives considered**

- *Locale path prefix (`/el/d/{deckId}#{token}`)*: makes every deck have multiple URLs, changes route matching, and risks treating locale as part of capability resolution. Rejected.
- *Composite fragment (`#lang=el&token=...`)*: keeps language out of the HTTP request but changes the token parsing contract, risks breaking existing links, and gives no server-side first-paint benefit. Rejected.
- *Server-side share-link endpoint*: adds a round trip and API surface for data the browser already has. Rejected.
- *Only add `lang` for non-default locales*: smaller diff, but links would be ambiguous about whether English was intended or merely omitted. Always including it makes the link self-describing and keeps tests symmetric.

### D2. Consume the parameter in the proxy, set the cookie, then redirect to the clean URL

On a `/d/` document request, the proxy:

1. Reads `lang` from the query.
2. Validates it with the existing `isLocale` allowlist (`en` or `el`).
3. Sets `mini-deck-locale` on the response using the same attributes as the client-written cookie: `Path=/`, one-year max age, `SameSite=Lax`, non-HttpOnly, and `Secure` when the request is HTTPS (including `X-Forwarded-Proto: https` behind a TLS proxy).
4. Redirects with `307` to the same URL with only `lang` removed, preserving any other query parameters.

The browser inherits the original fragment on a redirect whose `Location` has no fragment (RFC 9110 §10.2.2), so the token survives. The follow-up request carries the new cookie, and the existing `getLocale()` path resolves the language before the layout renders. No second locale-resolution mechanism is needed.

The redirect is important: leaving `?lang=` in the address bar would re-apply the sharer's language on every reload, including after the recipient switches language. Removing it makes the cookie the single source of truth after the first open.

The proxy's security headers and `no-store` rule currently apply only to the `NextResponse.next()` path. They must be applied to the redirect response too, via a shared helper, so a redirected deck response keeps the same CSP, referrer, frame, and caching protections.

**Alternatives considered**

- *Set a request header and override `getLocale()` without redirecting*: also gives a correct first paint, but the URL remains sticky. The recipient's manual switch would be overridden by `?lang` on reload unless the client mutates history, and that cleanup has its own cookie-blocked edge cases. The redirect is simpler and reuses the existing cookie path.
- *Resolve in the deck page and call `setLocale` on the client*: causes an English first paint, a possible hydration mismatch, and wrong `<html lang>`/metadata. Rejected.
- *Rewrite instead of redirect*: preserves the parameter in the address bar and recreates the sticky-language problem. Rejected.
- *Use `lang` in a cookie set by the share page*: the share dialog and deck page are on the same origin, but a recipient opening the link has no prior visit, and the client cannot set a cookie before the server render. Rejected.

### D3. Precedence: link, then cookie, then browser

Effective resolution for a deck navigation:

1. A valid `lang` on the deck URL.
2. A valid `mini-deck-locale` cookie.
3. `Accept-Language`.
4. English.

The link wins because the user's decision is explicit: they opened a link generated in a specific language, and the feature is meant to align collaborators initially. Persisting the value means the next page load does not revert, and the visible switcher lets them change it immediately. Once the parameter is consumed, a manual switch writes the cookie and is not overridden.

Invalid, empty, or unsupported `lang` values are ignored. They do not redirect, do not change the cookie, and do not produce an error. Existing links without `lang` behave exactly as before.

**Alternatives considered**

- *Cookie wins over link*: respects a recipient's prior choice but defeats the purpose when the collaborator has used the app before. Rejected by the chosen product behavior.
- *Link wins for one visit only*: closer to "initially", but requires an additional visit-scoped state channel and makes the first reload inconsistent. Rejected by the chosen product behavior.

### D4. Keep locale out of authorization and collaboration

`lang` is untrusted presentation input. It is validated against a two-value allowlist and used only to set the locale cookie. It is never read by `authorizeDeck`, `resolveRole`, the session API, the collaboration server, or persistence code. The deck ID stays in the path and the token stays in the fragment; changing or removing `lang` cannot change access.

The share dialog continues to derive the view token locally. No locale value is stored in recent decks, Yjs, awareness, or exports. The proxy sees the language query but never the fragment token.

### D5. Test at the three boundaries

- **Unit (`buildDeckLinks`)**: output for `en` and `el`, query-before-fragment ordering, origin handling, token preservation, and URL parsing.
- **Unit (`proxy`)**: valid language redirects with `307`, removes only `lang`, preserves other query parameters, sets the cookie with the expected attributes, and keeps security/no-store headers; invalid language, non-deck paths, and missing language take the existing path; HTTPS and forwarded-HTTPS set `Secure`.
- **Playwright**: a Greek edit and view link open in Greek for an English browser and an English stored preference; an English link opens in English for a Greek browser and Greek cookie; first paint has the right `<html lang>`; the cookie is stored; the address bar no longer has `lang`; reload stays in the chosen language; a manual switch after opening wins on reload; invalid `lang` falls back; old links still open; the share dialog shows `lang` for both link types and updates it when the dialog language switches.

Existing assertions that compare share URLs as `/d/{id}#{token}` must parse the URL and assert the `lang` parameter instead. Helpers that open deck URLs already pass the full string and need no structural change.

### D6. Documentation and rollout

Update `docs/localization.md` (resolution order and the removed "never in a deck URL" statement), `docs/sharing.md` (URL shape and token/privacy rationale), and the README localization summary. This is a web-only change: no database migration, API version, or collaboration protocol change.

Rollout order is one release containing link generation and proxy consumption. If link generation ships alone, recipients ignore the unknown query and keep their own language, which is graceful. If proxy consumption ships alone, existing links are unaffected. Rollback is a web redeploy; stale locale cookies and `lang` parameters are harmless because unknown parameters are ignored.

## Risks / Trade-offs

- **A redirect could lose the fragment token in a non-conforming client** → Standard browsers inherit fragments on fragmentless redirects; cover the edit-link flow with Playwright before release. The token never goes in `Location`, so it cannot leak through the redirect response.
- **Opening a share link overwrites the recipient's language preference** → Intentional product behavior, confirmed for this change. The language switcher is always visible in the top bar, and the parameter is consumed so switching sticks.
- **Cookies are blocked** → The proxy still redirects and strips `lang`; the follow-up request falls back to `Accept-Language`, matching the existing localization degradation. The first render may then differ from the link. Document this as a cookie-availability limitation.
- **A crafted link forces a language** → Only presentation changes; no privileges or content change, and the recipient can switch. Acceptable.
- **Locale query appears in server/access logs** → It contains no capability or user data; the token remains in the fragment. Do not add tokens or deck content to the query.
- **Proxy redirect responses skip existing security headers** → Apply the shared header helper to redirects and assert the CSP and `no-store` headers in proxy tests.
- **Stacked change** → `ui-localization` is not yet in `openspec/specs` because `add-greek-localization` is unarchived. Sync or archive that change before archiving this one; the current delta cannot be applied against a missing capability.
- **Link previews or URL shorteners drop query strings** → The deck still opens via the fragment and uses the recipient's locale; only the language hint is lost. Acceptable.

## Migration Plan

1. Ensure the `ui-localization` main spec exists by syncing or archiving `add-greek-localization`.
2. Add locale-aware share-link construction and update the share dialog.
3. Add proxy consumption, cookie setting, redirect cleanup, and shared security-header handling.
4. Update unit and Playwright coverage, including the redirect/fragment behavior and old-link compatibility.
5. Update localization, sharing, and README documentation.
6. Deploy the web app. No data migration or rollback order is required; reverting removes the hint and ignores the parameter.

## Open Questions

None. The precedence and persistence behavior were decided before planning; remaining work is implementation and verification.
