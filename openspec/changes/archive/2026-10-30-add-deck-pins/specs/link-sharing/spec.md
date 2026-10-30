# Spec Delta

## ADDED Requirements

### Requirement: Create deck access values

Every newly created deck SHALL receive a unique seven-digit join code, a random six-digit edit PIN, and a random six-digit view PIN. Values MUST come from a cryptographically secure source, MAY begin with zero, and the two PINs MUST differ. The creator MUST be shown all three once at creation, and role PINs MUST be stored only as salted hashes.

#### Scenario: Create a protected deck

- **WHEN** a visitor creates a new deck
- **THEN** the system assigns a seven-digit join code, a six-digit edit PIN, and a six-digit view PIN
- **AND** all three values are shown once in the creation flow
- **AND** neither PIN is stored in plaintext on the server

#### Scenario: Join code is unique

- **WHEN** two decks are created in succession
- **THEN** their join codes differ
- **AND** a join code resolves to at most one deck

#### Scenario: Leading zero is valid

- **WHEN** a generated join code is `0042719` or a generated PIN is `004271`
- **THEN** the interface displays every digit and accepts the value with its leading zero

#### Scenario: PINs differ

- **WHEN** the edit and view PINs are generated
- **THEN** they are not identical

### Requirement: Find a deck by join code

The landing page SHALL let a visitor enter a seven-digit join code. A valid code MUST resolve to the deck and show its title, then offer Edit and View as role choices before any role PIN is entered. An unknown code MUST show the generic not-found state without revealing whether a deck exists.

#### Scenario: Valid code finds the deck

- **WHEN** a visitor enters a valid join code
- **THEN** the deck title is shown
- **AND** the visitor can choose Edit or View

#### Scenario: Invalid code stays generic

- **WHEN** a visitor enters an unknown join code
- **THEN** a not-found message is shown
- **AND** no deck title or identifier is revealed

#### Scenario: Role choice comes before the PIN

- **WHEN** a visitor chooses View after a valid code lookup
- **THEN** the view PIN is requested
- **AND** the deck is not loaded before that PIN succeeds

### Requirement: Unlock a protected deck

Opening a PIN-protected deck link, or choosing a role after a join-code lookup, SHALL ask for the PIN matching that role before loading deck content, editor controls, or live collaboration. A correct PIN MUST create an unlock session; a wrong PIN MUST reveal no deck content and MUST show a generic invalid-PIN message.

#### Scenario: Edit link asks for the edit PIN

- **WHEN** a participant opens a protected edit link without a remembered session
- **THEN** the deck is not loaded and an edit-PIN prompt is shown

#### Scenario: View link asks for the view PIN

- **WHEN** a participant opens a protected view link without a remembered session
- **THEN** the deck is not loaded and a view-PIN prompt is shown

#### Scenario: Join code asks for the chosen role PIN

- **WHEN** a participant chooses Edit or View after a valid join-code lookup
- **THEN** the PIN for that role is requested

#### Scenario: Correct PIN opens the deck

- **WHEN** a participant enters the PIN matching the link or chosen role
- **THEN** the deck opens with that role's normal capabilities

#### Scenario: Wrong PIN stays locked

- **WHEN** a participant enters an incorrect PIN
- **THEN** the deck content remains hidden
- **AND** the prompt reports that the PIN is invalid

#### Scenario: PINs cannot escalate a role

- **WHEN** a participant enters the edit PIN after choosing View or on a view link
- **THEN** the deck remains locked or opens read-only
- **AND** editing is never granted from a view context

### Requirement: Remember unlock sessions

A successful unlock SHALL be remembered in that browser for 30 days and reused on later visits without asking for the PIN again. The session MUST be scoped to one deck and role, MUST stop working when it expires, and MUST require the PIN again after expiry or removal of browser storage.

#### Scenario: Reload does not ask again

- **WHEN** a participant unlocks a protected deck and reloads the page within 30 days
- **THEN** the deck opens without another PIN prompt

#### Scenario: Expired session asks again

- **WHEN** a remembered unlock session has expired
- **THEN** the deck remains locked until the correct PIN is entered

#### Scenario: Storage cleared

- **WHEN** a participant clears site storage and reopens the protected link
- **THEN** the PIN prompt is shown again

#### Scenario: Code entry reuses a remembered session

- **WHEN** a participant enters a valid join code in a browser with an unexpired session for that deck
- **THEN** the deck opens without asking for the PIN again

### Requirement: Enforce PIN protection on servers

For a PIN-protected deck, a raw edit or view link token alone MUST NOT authorize deck APIs, uploads, image search, or collaboration. Only a valid unlock session for that deck and role MAY authorize those operations, and the session MUST NOT be usable for another deck.

#### Scenario: Raw link token is rejected

- **WHEN** a client sends a protected deck's edit token to a deck API without an unlock session
- **THEN** the request is rejected and no deck data is returned

#### Scenario: Raw link token cannot join collaboration

- **WHEN** a client attempts a collaboration connection to a protected deck using only the edit or view token
- **THEN** the connection is rejected as unauthorized

#### Scenario: Unlock session is scoped

- **WHEN** an unlock session for deck A is presented for deck B
- **THEN** access to deck B is denied

#### Scenario: Viewer session stays read-only

- **WHEN** a participant unlocks a view link or chooses View after a join-code lookup
- **THEN** the collaboration connection and APIs remain read-only

#### Scenario: Join code alone reveals no content

- **WHEN** a client knows a join code but has no role PIN or unlock session
- **THEN** it can resolve the deck title
- **AND** it cannot load slide content or join collaboration

### Requirement: Manage and reset access

The share dialog SHALL show the deck's join code and PINs on a browser that holds them, with a copy action for each. An editor with a valid unlock session SHALL be able to reset all three values; the reset MUST create a new join code and two new PINs, invalidate the previous values, and invalidate existing unlock sessions.

#### Scenario: Copy access values

- **WHEN** an editor opens the share dialog on a browser that knows the deck's join code and PINs
- **THEN** the join code, edit PIN, and view PIN are shown with separate copy actions

#### Scenario: Reset access

- **WHEN** an unlocked editor confirms an access reset
- **THEN** a new seven-digit join code and two new six-digit PINs are generated and displayed
- **AND** the old code, old PINs, and old unlock sessions no longer work

#### Scenario: Viewer cannot reset

- **WHEN** a participant with a view-only session opens the share dialog
- **THEN** no access reset action is available

### Requirement: Limit join and PIN attempts

The system SHALL rate-limit join-code lookups and PIN attempts per client, and role PIN attempts per deck. After repeated failures, further attempts MUST be refused temporarily with a retry message, and responses MUST NOT reveal whether a deck exists or which part of a value was wrong.

#### Scenario: Repeated invalid join codes

- **WHEN** one client submits repeated unknown join codes
- **THEN** further lookups are refused with a rate-limit response

#### Scenario: Repeated wrong PINs

- **WHEN** one client submits repeated incorrect PINs for a deck
- **THEN** further attempts are refused with a rate-limit response

#### Scenario: Cooldown allows retry

- **WHEN** the rate-limit window passes
- **THEN** the participant may try the correct code or PIN again

### Requirement: Keep existing decks link-only

Decks created before this change MUST continue to open through their existing edit and view links without a join code, PIN prompt, migration, or schema-version change. Every deck created after this change MUST receive a join code and both role PINs.

#### Scenario: Existing edit link opens directly

- **WHEN** a participant opens an edit link for a deck created before this change
- **THEN** the editor opens without a PIN prompt

#### Scenario: Existing view link opens directly

- **WHEN** a participant opens a view link for a deck created before this change
- **THEN** the deck opens read-only without a PIN prompt

#### Scenario: Existing deck has no join code

- **WHEN** a visitor tries the previous deck's identifier as a join code
- **THEN** no join-code lookup succeeds for that legacy deck

## MODIFIED Requirements

### Requirement: Open an edit link

A valid edit link SHALL open the deck with editing, presenting, and link-sharing capabilities. When the deck is PIN-protected, the matching edit PIN MUST be entered first.

#### Scenario: Edit link opens the editor

- **WHEN** a participant opens a valid edit link for a link-only deck
- **THEN** the editor loads with slide and element controls enabled
- **AND** the share dialog is available

#### Scenario: Protected edit link needs its PIN

- **WHEN** a participant opens a valid edit link for a PIN-protected deck
- **THEN** the editor remains locked until the edit PIN is accepted

### Requirement: Open a view link

A valid view link SHALL open the deck in a read-only mode that supports viewing, navigating slides, presenting, and exporting, but not editing or revealing the edit link. When the deck is PIN-protected, the matching view PIN MUST be entered first.

#### Scenario: View link opens read-only

- **WHEN** a participant opens a valid view link for a link-only deck
- **THEN** the deck is displayed without editing, upload, or rename controls

#### Scenario: View link cannot reveal the edit link

- **WHEN** a participant with a view link inspects the page and available actions
- **THEN** the edit link or edit token is not present or derivable from what the client receives

#### Scenario: Viewer can present

- **WHEN** a participant with a view link starts presentation mode
- **THEN** the deck is presented without editing controls

#### Scenario: Protected view link needs its PIN

- **WHEN** a participant opens a valid view link for a PIN-protected deck
- **THEN** the deck remains hidden until the view PIN is accepted

### Requirement: Provide a share dialog

The system SHALL give editors a share dialog that displays the available edit/view links, the join code, and the role PINs on a browser that holds them, with copy actions. For a session opened by join code, the dialog MUST show the code and PINs instead of links it cannot recover. It MUST offer an editor-only access reset and warn that anyone holding a link or code plus its PIN can use it without signing in.

#### Scenario: Copy the view link

- **WHEN** an editor opens the share dialog from a link-opened session and copies the view link
- **THEN** the clipboard contains the view link
- **AND** the interface confirms the copy

#### Scenario: Copy the edit link

- **WHEN** an editor copies the edit link and sends it to a collaborator
- **THEN** the collaborator can open the deck with editing enabled after entering the edit PIN

#### Scenario: Copy the join code

- **WHEN** an editor copies the join code
- **THEN** the clipboard contains all seven digits
- **AND** the recipient can use it from the landing page

#### Scenario: Code-joined editor shares access

- **WHEN** an editor joined using the join code and opens the share dialog
- **THEN** the dialog shows the join code and PINs
- **AND** it does not claim that the original links are available on that browser

#### Scenario: Share warning is visible

- **WHEN** the share dialog is open for a PIN-protected deck
- **THEN** it states that a link or join code plus its role PIN is required and that anyone holding both can access the deck without an account

### Requirement: Protect link capabilities

Deck and token identifiers MUST be generated with enough randomness to resist guessing, and every deck session request and collaboration connection MUST validate its token or unlock session on the server. Join codes MUST be unique and non-sequential. A view credential MUST NOT be exchangeable for editing rights, and neither a raw link token nor a join code MUST bypass role PIN protection.

#### Scenario: View token cannot escalate

- **WHEN** a participant uses a view token or view unlock session on an editing endpoint or edit WebSocket connection
- **THEN** the request is rejected as unauthorized

#### Scenario: Tokens are not sequential

- **WHEN** two decks are created in succession
- **THEN** their identifiers, tokens, and join codes do not follow a predictable sequence

#### Scenario: Link alone does not bypass a PIN

- **WHEN** a protected deck's edit token is used without a valid edit unlock session
- **THEN** the protected operations are rejected

#### Scenario: Join code alone does not bypass a PIN

- **WHEN** a protected deck's join code is used without a valid role unlock session
- **THEN** deck content and protected operations remain unavailable

#### Scenario: Unlock session is bound to the deck

- **WHEN** an unlock session is presented for a different deck or role
- **THEN** it is rejected
