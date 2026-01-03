# Feature Specification: Round Robin Simul Sessions

**Feature Branch**: `001-round-robin-simul`  
**Created**: 2026-01-03  
**Status**: Draft  
**Input**: User description: "L'application permet de creer des sessions de jeu simultanees ou tous les participants s'affrontent mutuellement aux echecs. Un utilisateur cree une simultanee privee sans limite predefinie de participants. Un lien de partage est genere pour inviter d'autres joueurs. Les participants rejoignent librement la session via ce lien. Une fois tous les joueurs connectes, l'organisateur lance manuellement le debut des parties. Le systeme genere automatiquement toutes les parties en mode round-robin : chaque joueur affronte tous les autres participants. Cette fonctionnalite permet d'organiser facilement des parties simultanee privees entre amis ou groupes fermes, avec une flexibilite totale sur le nombre de participants et le moment de demarrage."

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Create and Start a Private Simul (Priority: P1)

As an organizer, I want to create a private simul session and start the round-robin when everyone is ready so the games begin only when I decide.

**Why this priority**: Without session creation and manual start, the private round-robin simul cannot exist.

**Independent Test**: Create a session, invite at least one participant, and start the session to verify games are generated.

**Acceptance Scenarios**:

1. **Given** an organizer creates a new private simul session, **When** creation completes, **Then** a shareable invite link and lobby view are provided.
2. **Given** a lobby has at least two participants, **When** the organizer starts the session, **Then** the system creates one game per unique player pair.
3. **Given** a lobby has fewer than two participants, **When** the organizer attempts to start the session, **Then** the start is blocked with a clear message.

---

### User Story 2 - Join via Share Link (Priority: P2)

As a participant, I want to join a private simul session from a shared link so I can be included in the round-robin games.

**Why this priority**: Joining by link is the only entry path to a private group session.

**Independent Test**: Open the invite link and verify the participant appears in the lobby roster.

**Acceptance Scenarios**:

1. **Given** a valid invite link, **When** a participant joins, **Then** they appear in the lobby roster with their identity.
2. **Given** a participant attempts to join the same session twice, **When** the second join occurs, **Then** no duplicate roster entry is created.

---

### User Story 3 - Access Generated Matches (Priority: P3)

As a participant, I want to see and access the games created for me so I can play each opponent in the round-robin.

**Why this priority**: Players need a clear way to find and play the games created by the system.

**Independent Test**: Start a session with three or more participants and confirm each player can access their full set of games.

**Acceptance Scenarios**:

1. **Given** a session has started with N participants, **When** a participant opens their match list, **Then** they see exactly N-1 games.
2. **Given** a participant finishes a game, **When** the result is recorded, **Then** the game status updates in the match list.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- What happens when a participant opens the invite link after the session has already started?
- How does the system handle a participant leaving the lobby before the organizer starts?
- What happens when the organizer tries to start twice?
- How does the system handle an odd number of participants?

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST allow an organizer to create a private simul session without a predefined participant cap.
- **FR-002**: System MUST generate a shareable invite link for each private simul session.
- **FR-003**: System MUST allow participants to join a session via the invite link.
- **FR-004**: System MUST display a lobby roster showing the organizer and current participants before start.
- **FR-005**: System MUST allow only the organizer to start the session and MUST require at least two participants.
- **FR-006**: System MUST create exactly one game for every unique pair of participants when the session starts.
- **FR-007**: System MUST prevent duplicate participant entries for the same session.
- **FR-008**: System MUST lock the participant roster once the session has started.
- **FR-009**: Participants MUST be able to access a list of their generated games after start.
- **FR-010**: System MUST NOT auto-start sessions; the organizer starts them manually.

Assumptions & Dependencies:
- Sessions are intended to be private and accessed only through the invite link (no public discovery).
- Each participant has a stable identity (account or declared display name) so games can be attributed correctly.

### Key Entities _(include if feature involves data)_

- **Simul Session**: Private lobby that holds the organizer, participants, invite link, and start state.
- **Participant**: A user identity linked to a session with join time and status.
- **Invite Link**: A shareable token or URL that grants access to join a session.
- **Game**: A match between two participants created at session start.

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Organizers can create a session and copy the invite link in under 30 seconds.
- **SC-002**: For sessions with up to 20 participants, all round-robin games are generated within 5 seconds of start.
- **SC-003**: In 100% of started sessions, each participant receives exactly N-1 games with no duplicates.
- **SC-004**: At least 95% of participants can join successfully from the invite link on the first attempt.
