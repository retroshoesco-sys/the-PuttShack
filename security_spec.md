# Security Specification - Puttshack Leaderboard

## Data Invariants
1. A Player cannot exist without a valid Session.
2. Players must have a non-negative score (though in golf, negative is theoretically possible relative to par, but here we track total strokes, so 0+). Actually, strokes are usually positive.
3. Player names must be strings between 1-50 characters.

## The "Dirty Dozen" Payloads (Red Team Test Cases)
1. Creating a player with `score: -100`.
2. Updating a player's `score` by `1000` in one go (instead of increment).
3. Deleting a Session without being an "Admin" (if we had one).
4. Creating a player with a name that is an object.
5. Injected fields into Player: `{ name: "Ayan", score: 0, isAdmin: true }`.
6. Session creation with a `createdAt` in the future.
7. Attempting to update `joinedAt` on a Player doc.
8. Attempting to change `sessionId` or `id` inside a document.
9. Impersonating another player's write (if we had owner-based auth, but here it's public).
10. Massive 1MB payload for a player name.
11. Invalid characters in Player ID.
12. Creating a player in a non-existent session.

## Test Runner Logic
The rules must forbid:
- Scores < 0.
- Names > 50 chars.
- Extra fields.
- Non-server timestamps.
