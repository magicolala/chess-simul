# Quickstart: Round Robin Simul Sessions

## Goal

Verify that an organizer can create a private session, invite participants, start the round-robin, and that each participant sees their generated games.

## Prerequisites

- A running dev environment with Supabase configured.
- Two or more test user accounts.

## Steps

1. Sign in as the organizer.
2. Create a new private simul session and copy the invite link.
3. Open the invite link (contains `rr_session` and `invite` params) in a second browser/session and join as a participant.
4. Confirm both users appear in the lobby roster.
5. Attempt to start with only one participant to confirm it is blocked.
6. Start the session as the organizer.
7. Verify each participant sees exactly N-1 games in their match list once the session is started.
8. Finish one game and confirm the status updates for both players.

## Expected Results

- The invite link allows participants to join exactly once.
- The organizer is the only one who can start the session.
- Round-robin games are generated once per participant pair.
- Game status updates appear without refresh.
