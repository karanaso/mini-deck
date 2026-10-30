# Spec Delta

## MODIFIED Requirements

### Requirement: Join a live session

Opening a valid deck link or completing a join-code unlock SHALL join that deck's live collaboration session. For a PIN-protected deck, the participant MUST first hold a valid unlock session for the chosen role; a raw edit or view link token MUST NOT authorize a collaboration connection. A participant who joins later MUST receive the current deck content, including the latest slide order and elements.

#### Scenario: Late participant receives current state

- **WHEN** a participant opens a deck link after others have added slides and elements
- **THEN** the participant sees the current deck without waiting for a page reload

#### Scenario: Two participants edit the same deck

- **WHEN** two participants have the same deck open in separate browsers
- **THEN** both are shown as connected to the same session

#### Scenario: PIN-protected deck joins after unlock

- **WHEN** a participant unlocks a PIN-protected deck and enters the editor
- **THEN** the collaboration connection uses that unlock session
- **AND** the participant receives the current deck content

#### Scenario: Join-code unlock enters the session

- **WHEN** a participant finds a deck by join code, chooses a role, and enters the correct PIN
- **THEN** the collaboration connection uses the resulting unlock session
- **AND** the participant receives the current deck content

#### Scenario: Link token cannot join a protected session

- **WHEN** a client attempts to join a PIN-protected deck's collaboration session using only the edit or view link token
- **THEN** the connection is rejected
- **AND** no deck content is delivered

#### Scenario: View unlock remains read-only

- **WHEN** a participant joins with a view unlock session
- **THEN** the connection receives updates but cannot write deck content
