# link-sharing Specification

## Purpose

Lets people share a deck through unguessable edit and view links without creating accounts, while keeping the edit link unavailable to view-only participants.

## Requirements

### Requirement: Work without accounts

The system SHALL NOT require sign-up or sign-in to create, edit, present, or view a deck. Access MUST be determined solely by the link used to open the deck.

#### Scenario: Create and edit without signing in

- **WHEN** a first-time visitor creates a deck and edits a slide
- **THEN** the work is saved without any account prompt

#### Scenario: View without signing in

- **WHEN** a recipient opens a view link in a private browser window
- **THEN** the deck is displayed without a sign-in prompt

### Requirement: Open an edit link

A valid edit link SHALL open the deck with editing, presenting, and link-sharing capabilities.

#### Scenario: Edit link opens the editor

- **WHEN** a participant opens a valid edit link
- **THEN** the editor loads with slide and element controls enabled
- **AND** the share dialog is available

### Requirement: Open a view link

A valid view link SHALL open the deck in a read-only mode that supports viewing, navigating slides, presenting, and exporting, but not editing or revealing the edit link.

#### Scenario: View link opens read-only

- **WHEN** a participant opens a valid view link
- **THEN** the deck is displayed without editing, upload, or rename controls

#### Scenario: View link cannot reveal the edit link

- **WHEN** a participant with a view link inspects the page and available actions
- **THEN** the edit link or edit token is not present or derivable from what the client receives

#### Scenario: Viewer can present

- **WHEN** a participant with a view link starts presentation mode
- **THEN** the deck is presented without editing controls

### Requirement: Reject invalid links

The system SHALL reject unknown deck identifiers and invalid tokens with a not-found response that does not reveal whether a deck exists or which part of the link was wrong.

#### Scenario: Unknown deck

- **WHEN** a visitor opens a link for a deck that does not exist
- **THEN** a not-found page is shown

#### Scenario: Tampered token

- **WHEN** a visitor changes one character of a valid edit token
- **THEN** access is denied and the deck content is not displayed

### Requirement: Provide a share dialog

The system SHALL give editors a share dialog that displays the edit link and the view link separately, labels each role, and copies either link on request. The dialog MUST warn that anyone holding a link can use it without signing in.

#### Scenario: Copy the view link

- **WHEN** an editor opens the share dialog and copies the view link
- **THEN** the clipboard contains the view link
- **AND** the interface confirms the copy

#### Scenario: Copy the edit link

- **WHEN** an editor copies the edit link and sends it to a collaborator
- **THEN** the collaborator can open the deck with editing enabled

#### Scenario: Share warning is visible

- **WHEN** the share dialog is open
- **THEN** it states that anyone with a link can access the deck without an account

### Requirement: Protect link capabilities

Deck and token identifiers MUST be generated with enough randomness to resist guessing, and every deck session request and collaboration connection MUST validate its token on the server. A view token MUST NOT be exchangeable for editing rights.

#### Scenario: View token cannot escalate

- **WHEN** a participant uses a view token on an editing endpoint or edit WebSocket connection
- **THEN** the request is rejected as unauthorized

#### Scenario: Tokens are not sequential

- **WHEN** two decks are created in succession
- **THEN** their identifiers and tokens do not follow a predictable sequence

### Requirement: List recent decks on the device

The landing page SHALL list decks opened with an edit link on the current device, showing the title last observed on that device and when it was last opened. The stored title MUST update whenever the deck title changes during an open session. Selecting an entry MUST reopen the deck's editor. View-only visits MUST NOT create an editable recent entry.

#### Scenario: Recent deck after creation

- **WHEN** a visitor creates a deck and returns to the landing page
- **THEN** the deck appears in the recent list with its title

#### Scenario: Renamed deck in recent list

- **WHEN** an editor renames a deck and returns to the landing page
- **THEN** the recent list shows the new title

#### Scenario: Remove a recent entry

- **WHEN** a visitor removes a deck from the recent list
- **THEN** it disappears from the list on that device
- **AND** its existing links remain valid

### Requirement: Keep recent-deck data on the device

The recent-decks list SHALL be stored locally on the device and MUST NOT be exposed to other visitors. Clearing browser storage MAY remove the list without affecting the deck or its links.

#### Scenario: Another browser does not see recents

- **WHEN** a visitor opens the landing page in a different browser profile
- **THEN** decks created in the first browser are not listed

#### Scenario: Clearing storage loses only the list

- **WHEN** a visitor clears site storage and reopens the landing page
- **THEN** the recent list is empty
- **AND** a previously saved edit link still opens its deck
