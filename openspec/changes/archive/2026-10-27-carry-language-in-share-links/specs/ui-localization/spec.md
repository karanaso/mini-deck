# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Keep language out of deck links and authorization`
- TO: `### Requirement: Keep link language separate from authorization`

## MODIFIED Requirements

### Requirement: Keep link language separate from authorization

The `lang` parameter MUST be treated only as a presentation preference. It MUST NOT alter the deck identifier, fragment token, role, permissions, collaboration document or awareness data, exports, or recent-deck storage. Deck routes MUST NOT use locale-prefixed paths, and removing or changing `lang` MUST NOT grant, revoke, or change access.

#### Scenario: Language does not change permissions

- **WHEN** a viewer opens a language-bearing view link
- **THEN** the session remains read-only
- **AND** no editing controls or edit token become available

#### Scenario: Tampering with the language parameter does not change access

- **WHEN** a visitor changes `lang` in a share link to another supported or unsupported value
- **THEN** the deck still opens only if the fragment token is valid
- **AND** the role is determined solely by that token

#### Scenario: Language never enters the authorization request

- **WHEN** the browser requests a deck or calls the session API
- **THEN** the capability token is sent only in the fragment and, after the shell reads it, in the Authorization header
- **AND** the language is never used as a credential

## ADDED Requirements

### Requirement: Include the interface language in share links

The share dialog SHALL generate edit and view links that identify the editor's active interface locale with a `lang` query parameter (`en` or `el`). Every generated share link MUST include the parameter, including English links, and MUST keep the capability token in the URL fragment.

#### Scenario: Greek editor copies a share link

- **WHEN** an editor whose interface is Greek opens the share dialog
- **THEN** both the edit and view links include `lang=el`
- **AND** each token remains after `#` in the link

#### Scenario: English editor copies a share link

- **WHEN** an editor whose interface is English opens the share dialog
- **THEN** both links include `lang=en`
- **AND** each link opens the deck without an account

#### Scenario: Link language follows a dialog switch

- **WHEN** an editor changes the interface language while the share dialog is open
- **THEN** the displayed edit and view links carry the newly selected language
- **AND** the dialog remains open

### Requirement: Apply a share link's language before first render

When a deck link contains a valid `lang` value, the system SHALL use that locale for the initial render, overriding any stored locale preference and the browser's language preference, and SHALL persist it as the visitor's stored locale preference for later visits. The system MUST remove the consumed parameter from the deck URL without changing the deck identity, fragment token, or role.

#### Scenario: Greek link opens in Greek for an English visitor

- **WHEN** a visitor with an English browser and no stored locale opens a Greek edit or view link
- **THEN** the first rendered interface and document language are Greek
- **AND** the stored locale preference becomes Greek
- **AND** the deck opens with the role encoded by the fragment token

#### Scenario: Link language overrides a stored preference

- **WHEN** a visitor whose stored locale is English opens a Greek share link
- **THEN** the first rendered interface is Greek
- **AND** later reloads remain Greek until the visitor switches language

#### Scenario: English link opens in English for a Greek visitor

- **WHEN** a visitor with a Greek browser preference or stored Greek locale opens an English share link
- **THEN** the first rendered interface is English
- **AND** the stored locale preference becomes English

#### Scenario: Language choice remains after the link parameter is consumed

- **WHEN** the visitor reloads or opens another deck link after following a language-bearing link
- **THEN** the interface uses the language from the share link
- **AND** the visitor can switch language normally afterward

#### Scenario: Invalid link language is ignored

- **WHEN** a deck link contains an unsupported, empty, or malformed `lang` value
- **THEN** the deck opens with the existing locale resolution order
- **AND** no error is shown for the invalid value

#### Scenario: Link without a language keeps working

- **WHEN** a visitor opens an existing `/d/{deckId}#{token}` link that has no `lang` parameter
- **THEN** the deck opens with the stored or browser-derived locale
- **AND** the token and role are unchanged
