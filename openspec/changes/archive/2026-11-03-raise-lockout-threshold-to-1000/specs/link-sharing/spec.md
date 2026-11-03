# Spec Delta

## MODIFIED Requirements

### Requirement: Limit join and PIN attempts

The system SHALL rate-limit join-code lookups and PIN attempts per client, and role PIN attempts per deck, and MUST accept at least 1000 attempts within a one-minute window before refusing further attempts temporarily with a retry message. The limit MUST recover within one minute after the threshold is exceeded. Responses MUST NOT reveal whether a deck exists or which part of a value was wrong.

#### Scenario: Repeated invalid join codes

- **WHEN** one client submits repeated unknown join codes
- **THEN** further lookups are refused with a rate-limit response after the threshold is exceeded

#### Scenario: Repeated wrong PINs

- **WHEN** one client submits repeated incorrect PINs for a deck
- **THEN** further attempts are refused with a rate-limit response after the threshold is exceeded

#### Scenario: Cooldown allows retry

- **WHEN** one minute passes after the rate limit is exceeded
- **THEN** the participant may try the correct code or PIN again

#### Scenario: At least 1000 attempts are accepted

- **WHEN** a client starts with fresh join-code and PIN limits and submits up to 1000 attempts
- **THEN** no attempt is refused by the rate limiter because of the attempt count
- **AND** invalid codes or PINs still receive their normal invalid-value response

#### Scenario: Refusal begins after the threshold

- **WHEN** a client exceeds 1000 join-code or PIN attempts within a one-minute window
- **THEN** further attempts are refused with a rate-limit response and a retry delay

#### Scenario: Every join and PIN limiter uses the threshold

- **WHEN** only the per-client join-code lookups, per-code join attempts, per-client PIN attempts, or per-deck PIN attempts limit has been exhausted
- **THEN** the request is refused with a rate-limit response
- **AND** the threshold for each of those limits is at least 1000 attempts
- **AND** each limit recovers within one minute
