# Spec Delta

## MODIFIED Requirements

### Requirement: Create deck access values

Every newly created protected deck SHALL receive a unique seven-digit join code, a random six-digit edit PIN, and a random six-digit view PIN. A deck created in open mode SHALL receive a unique seven-digit join code but MUST NOT receive role PINs. Values MUST come from a cryptographically secure source and MAY begin with zero; when PINs are generated they MUST differ. The creator MUST be shown the join code once, plus both PINs once when the deck is protected, and role PINs MUST be stored only as salted hashes.

#### Scenario: Create a protected deck

- **WHEN** a visitor creates a new deck in the default protected mode
- **THEN** the system assigns a seven-digit join code, a six-digit edit PIN, and a six-digit view PIN
- **AND** all three values are shown once in the creation flow
- **AND** neither PIN is stored in plaintext on the server

#### Scenario: Create an open deck

- **WHEN** a visitor creates a new deck in open mode
- **THEN** the system assigns a seven-digit join code
- **AND** no edit PIN, view PIN, or PIN hash is created
- **AND** the creation flow shows the join code and does not show PIN values

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

The landing page SHALL let a visitor enter a seven-digit join code. A valid code MUST resolve to the deck and show its title, then offer Edit and View as role choices. For a protected deck, the chosen role PIN MUST be requested before loading deck content. For an open deck, choosing a role MUST open the deck with that role without asking for a PIN. An unknown code MUST show the generic not-found state without revealing whether a deck exists.

#### Scenario: Valid code finds the deck

- **WHEN** a visitor enters a valid join code
- **THEN** the deck title is shown
- **AND** the visitor can choose Edit or View

#### Scenario: Invalid code stays generic

- **WHEN** a visitor enters an unknown join code
- **THEN** a not-found message is shown
- **AND** no deck title or identifier is revealed

#### Scenario: Role choice comes before the PIN

- **WHEN** a visitor chooses View after a valid code lookup for a protected deck
- **THEN** the view PIN is requested
- **AND** the deck is not loaded before that PIN succeeds

#### Scenario: Open deck skips the PIN

- **WHEN** a visitor chooses Edit or View after a valid code lookup for an open deck
- **THEN** the deck opens with the chosen role
- **AND** no PIN input is requested

### Requirement: Unlock a protected deck

Opening a PIN-protected deck link, or choosing a role after a join-code lookup for a protected deck, SHALL ask for the PIN matching that role before loading deck content, editor controls, or live collaboration. A correct PIN MUST create an unlock session; a wrong PIN MUST reveal no deck content and MUST show a generic invalid-PIN message. An open deck MUST NOT ask for a PIN.

#### Scenario: Edit link asks for the edit PIN

- **WHEN** a participant opens a protected edit link without a remembered session
- **THEN** the deck is not loaded and an edit-PIN prompt is shown

#### Scenario: View link asks for the view PIN

- **WHEN** a participant opens a protected view link without a remembered session
- **THEN** the deck is not loaded and a view-PIN prompt is shown

#### Scenario: Join code asks for the chosen role PIN

- **WHEN** a participant chooses Edit or View after a valid join-code lookup for a protected deck
- **THEN** the PIN for that role is requested

#### Scenario: Open deck loads without a PIN

- **WHEN** a participant opens an open deck's edit or view link
- **THEN** the deck opens with that link's role without a PIN prompt or unlock session

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

### Requirement: Provide a share dialog

The system SHALL give editors a share dialog that displays the available edit/view links and, when available on that browser, the join code and role PINs, with copy actions. For a protected deck, the dialog MUST offer an editor-only access reset and warn that anyone holding a link or code plus its PIN can use it without signing in. For an open deck, the dialog MUST show that no PINs are required, MUST display the join code when the browser knows it, and MUST NOT offer an access reset.

#### Scenario: Copy the view link

- **WHEN** an editor opens the share dialog from a link-opened session and copies the view link
- **THEN** the clipboard contains the view link
- **AND** the interface confirms the copy

#### Scenario: Copy the edit link

- **WHEN** an editor copies the edit link and sends it to a collaborator
- **THEN** the collaborator can open the deck with editing enabled after entering the edit PIN when the deck is protected

#### Scenario: Copy the join code

- **WHEN** an editor copies the join code
- **THEN** the clipboard contains all seven digits
- **AND** the recipient can use it from the landing page

#### Scenario: Code-joined editor shares access

- **WHEN** an editor joined using the join code and opens the share dialog
- **THEN** the dialog shows the join code and PINs for a protected deck
- **AND** it does not claim that the original links are available on that browser

#### Scenario: Share warning is visible

- **WHEN** the share dialog is open for a PIN-protected deck
- **THEN** it states that a link or join code plus its role PIN is required and that anyone holding both can access the deck without an account

#### Scenario: Open deck share dialog

- **WHEN** an editor opens the share dialog for an open deck
- **THEN** the dialog shows the edit and view links
- **AND** it shows the join code when this browser knows it
- **AND** it does not show PIN fields or an access reset action

### Requirement: Manage and reset access

The share dialog SHALL show a protected deck's join code and PINs on a browser that holds them, with a copy action for each. An editor with a valid unlock session SHALL be able to reset all three values for a protected deck; the reset MUST create a new join code and two new PINs, invalidate the previous values, and invalidate existing unlock sessions. An open deck has no PINs and MUST NOT offer or accept an access reset.

#### Scenario: Copy access values

- **WHEN** an editor opens the share dialog on a browser that knows the deck's join code and PINs
- **THEN** the join code, edit PIN, and view PIN are shown with separate copy actions

#### Scenario: Reset access

- **WHEN** an unlocked editor confirms an access reset on a protected deck
- **THEN** a new seven-digit join code and two new six-digit PINs are generated and displayed
- **AND** the old code, old PINs, and old unlock sessions no longer work

#### Scenario: Viewer cannot reset

- **WHEN** a participant with a view-only session opens the share dialog
- **THEN** no access reset action is available

#### Scenario: Open deck cannot reset

- **WHEN** an editor requests an access reset for an open deck
- **THEN** the request is rejected because the deck has no PIN access
- **AND** its links and join code remain unchanged

### Requirement: Keep existing decks link-only

Decks created before PIN support MUST continue to open through their existing edit and view links without a join code, PIN prompt, migration, or schema-version change. Every deck created after this change MUST receive a join code and either both role PINs or no PINs, depending on the access mode chosen at creation.

#### Scenario: Existing edit link opens directly

- **WHEN** a participant opens an edit link for a deck created before PIN support
- **THEN** the editor opens without a PIN prompt

#### Scenario: Existing view link opens directly

- **WHEN** a participant opens a view link for a deck created before PIN support
- **THEN** the deck opens read-only without a PIN prompt

#### Scenario: Existing deck has no join code

- **WHEN** a visitor tries a deck created before PIN support by its identifier as a join code
- **THEN** no join-code lookup succeeds for that legacy deck

#### Scenario: Open deck remains link-only

- **WHEN** a participant opens an open deck's edit or view link without a remembered session
- **THEN** the deck opens with that link's role without a PIN prompt
