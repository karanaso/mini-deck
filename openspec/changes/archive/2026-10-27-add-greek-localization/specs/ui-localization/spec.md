# Spec Delta

## Purpose

Lets each visitor use the web interface in English or Greek while sharing the same deck content, without changing deck links, authorization, or collaboration behavior.

## ADDED Requirements

### Requirement: Provide English and Greek interface locales

The web interface SHALL support exactly two interface locales: English (`en`) and Greek (`el`). Every user-facing interface string MUST resolve to a translation in the active locale, and Greek mode MUST NOT display raw translation keys or untranslated English interface copy. The "Mini Deck" brand name and user-created content are exempt.

#### Scenario: Greek interface is fully translated

- **WHEN** a visitor uses the interface in Greek
- **THEN** navigation, actions, labels, help text, feedback, and accessibility names appear in Greek
- **AND** no raw translation key or English interface copy is visible

#### Scenario: English interface remains available

- **WHEN** a visitor uses the interface in English
- **THEN** all interface strings appear in English

### Requirement: Detect the initial language from the browser

On a visit without a stored language preference, the system SHALL use the browser's preferred languages. Greek MUST be selected when it is the highest-priority supported language; otherwise the system MUST start in English. Unsupported, empty, or malformed preferences MUST fall back to English without an error.

#### Scenario: Greek browser preference

- **WHEN** a first-time visitor's browser prefers Greek
- **THEN** the first rendered interface is in Greek

#### Scenario: English browser preference

- **WHEN** a first-time visitor's browser prefers English or a language other than Greek
- **THEN** the first rendered interface is in English

#### Scenario: Unusable language header

- **WHEN** the browser sends an empty or malformed language preference
- **THEN** the interface starts in English without showing an error

### Requirement: Persist a manual language choice

The system SHALL provide a language switcher on the landing page and in the deck editor/viewer top bar. Changing the language MUST apply immediately, persist for future visits and deck links on that browser, and expose the selected language to assistive technology. A missing or invalid stored preference MUST be ignored in favor of browser detection.

#### Scenario: Switch language on the landing page

- **WHEN** a visitor selects Greek from the landing-page language switcher
- **THEN** the landing page changes to Greek immediately
- **AND** a later visit in the same browser opens in Greek

#### Scenario: Switch language inside a deck

- **WHEN** an editor or viewer selects English from the deck top bar
- **THEN** the deck interface changes to English immediately
- **AND** the next deck link opened in that browser uses English

#### Scenario: Stored preference is invalid

- **WHEN** the stored language value is not a supported locale
- **THEN** the system ignores it and uses browser detection

#### Scenario: Switcher is accessible

- **WHEN** a keyboard or screen-reader user reaches the language switcher
- **THEN** it has a localized accessible name and reports the current selection

### Requirement: Switch language without interrupting work

Changing the interface language MUST NOT reload the page, disconnect the collaboration session, discard unsaved local edits, clear the selection, change the current slide, or close an open dialog. Deck content and collaboration state MUST remain unchanged.

#### Scenario: Switch language mid-edit

- **WHEN** an editor changes the interface language while an element is selected
- **THEN** the document, selection, current slide, and edit history are preserved
- **AND** the collaboration connection remains active

#### Scenario: Switch language with a dialog open

- **WHEN** a participant changes the language while the share or participant dialog is open
- **THEN** the dialog remains open and its content appears in the new language

### Requirement: Keep language out of deck links and authorization

Language selection MUST NOT alter deck URLs, URL fragments, share links, capability tokens, or authorization decisions. The system MUST NOT add a locale prefix to deck routes or require locale data to open an edit or view link.

#### Scenario: Existing deck link keeps working

- **WHEN** a participant opens a previously saved edit or view link while the interface is Greek
- **THEN** the link resolves with the same deck and role
- **AND** the interface is displayed in Greek

#### Scenario: Share links are unchanged

- **WHEN** an editor switches the interface language and opens the share dialog
- **THEN** the generated edit and view links have the same format as before the switch

#### Scenario: Language does not change permissions

- **WHEN** a viewer switches from Greek to English
- **THEN** the session remains read-only
- **AND** no editing controls become available

### Requirement: Localize landing page and document metadata

The landing page SHALL use the active locale for its heading, feature copy, create action, recent-deck section, empty state, relative timestamps, removal actions, footer, accessible names, page title, page description, and the document language attribute. Greek pages MUST declare `lang="el"` and English pages MUST declare `lang="en"`.

#### Scenario: Greek landing page

- **WHEN** the landing page is displayed in Greek
- **THEN** all landing-page interface copy and accessible names are Greek
- **AND** the document language is `el`

#### Scenario: Greek recent-decks state

- **WHEN** a Greek visitor has no recent decks
- **THEN** the empty-state copy and action labels are Greek

#### Scenario: Localized page metadata

- **WHEN** the page is rendered in Greek
- **THEN** the browser title and description are Greek while the "Mini Deck" brand name remains unchanged

### Requirement: Localize editor and viewer chrome

The editor and read-only viewer SHALL use the active locale for the top bar, deck-title field label, presence and connection states, share/present/export actions, slide rail, toolbar tooltips, style panel, zoom controls, and read-only indicators.

#### Scenario: Greek editor chrome

- **WHEN** an editor opens a deck in Greek
- **THEN** the top bar, slide rail, toolbar, style panel, and zoom controls are Greek

#### Scenario: Greek viewer chrome

- **WHEN** a viewer opens a deck in Greek
- **THEN** the viewer interface and read-only feedback are Greek
- **AND** no editing controls are shown

#### Scenario: Greek accessibility labels

- **WHEN** a screen reader inspects the Greek editor
- **THEN** control names, tooltips, and status text are Greek

### Requirement: Localize dialogs, presentation, and feedback

Dialogs, presentation mode, loading states, toasts, validation messages, export progress, and not-found/error screens SHALL use the active locale.

#### Scenario: Greek share dialog

- **WHEN** an editor opens the share dialog in Greek
- **THEN** the title, role descriptions, copy actions, copied confirmation, and link-security warning are Greek

#### Scenario: Greek presentation mode

- **WHEN** a participant starts presentation mode in Greek
- **THEN** the navigation labels, exit control, and keyboard help are Greek

#### Scenario: Greek error pages

- **WHEN** a deck link is invalid or an unexpected error occurs in Greek
- **THEN** the not-found or error screen is Greek
- **AND** the action to return to the landing page is Greek

#### Scenario: Greek toast feedback

- **WHEN** an action such as adding an image, deleting a slide, or exporting a PDF succeeds in Greek
- **THEN** the success message is Greek

### Requirement: Present API failures with localized messages

API failures SHALL be presented using the API error code mapped to the active locale. The UI MUST NOT display the API's English `message` field. Unknown or unclassified failures MUST fall back to a localized generic message while diagnostic detail remains available to logging.

#### Scenario: Known API error in Greek

- **WHEN** an upload is rejected for being too large while the UI is Greek
- **THEN** the visible error explains the size limit in Greek

#### Scenario: Read-only API rejection in Greek

- **WHEN** a viewer attempts a write that the API rejects
- **THEN** the visible feedback is the Greek read-only message

#### Scenario: Unknown API failure

- **WHEN** the API returns an error code the UI does not recognize
- **THEN** the UI shows a localized generic failure message
- **AND** the English server message is not displayed

### Requirement: Localize counts, plurals, and date formatting

Counts, plurals, relative times, and absolute dates SHALL use the active locale's formatting rules. Greek MUST use correct Greek plural forms and relative-time expressions, and MUST NOT show English unit suffixes such as "m ago".

#### Scenario: Singular element count in Greek

- **WHEN** exactly one element is selected in Greek
- **THEN** the selection summary uses the Greek singular form

#### Scenario: Plural element count in Greek

- **WHEN** multiple elements are selected in Greek
- **THEN** the selection summary uses the Greek plural form

#### Scenario: Greek recent-deck time

- **WHEN** a recent deck was opened minutes ago and the UI is Greek
- **THEN** the timestamp uses a Greek relative-time expression

#### Scenario: Greek absolute date

- **WHEN** a recent deck is older than the relative-time window and the UI is Greek
- **THEN** the date uses Greek date formatting

### Requirement: Restrict localization to interface text

Localization MUST NOT modify deck content, deck titles, uploaded images, exported slide content, generated participant names, or collaboration document and awareness data. Participants MAY use different interface languages on the same deck without affecting each other's interface or the shared document.

#### Scenario: Mixed-language collaboration

- **WHEN** one participant uses Greek and another uses English on the same deck
- **THEN** each participant sees their own interface language
- **AND** both see identical deck content

#### Scenario: Language switch does not edit the deck

- **WHEN** a participant switches the interface language
- **THEN** no deck content or collaboration state is modified

#### Scenario: Generated participant names stay stable

- **WHEN** a participant switches the interface language
- **THEN** their generated display name does not change for other participants

### Requirement: Preserve the existing English experience

For English users, the existing labels, layout, shortcuts, roles, and behavior SHALL remain unchanged except for the addition of the language switcher. English MUST remain the default for unsupported browser preferences.

#### Scenario: English browser keeps existing copy

- **WHEN** a visitor with an English browser preference opens the app
- **THEN** the interface uses the existing English labels and behavior

#### Scenario: English end-to-end flows still pass

- **WHEN** the existing English editor, viewer, sharing, clipboard, export, and collaboration flows are exercised
- **THEN** they pass without requiring a language choice
