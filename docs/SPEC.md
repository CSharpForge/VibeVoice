# VibeVoice — Feature Specification

Status: derived from the current implementation and README (the project had no written specs).
Keywords **MUST**, **SHOULD**, **MAY** follow RFC 2119. Each requirement has an ID so tests and
reports can reference it. "Verification" says how it is checked (U = unit test, A = API test against
the running app, B = browser/UI test, M = manual/needs a LiveKit server).

## 1. Purpose and scope

VibeVoice provides private, ephemeral voice rooms with text chat and screen sharing. Media and
signalling run on the operator's own self-hosted LiveKit OSS server. The web app only creates room
credentials and issues short-lived LiveKit access tokens.

Out of scope: accounts, persistence, recording, moderation, hosting LiveKit itself.

## 2. Privacy model (non-functional, applies to every feature)

| ID | Requirement | Verification |
|----|-------------|--------------|
| PRV-1 | The app MUST NOT require or create user accounts. | A, review |
| PRV-2 | The app MUST NOT use a database or persist rooms, participants, or messages server-side. | review |
| PRV-3 | The app MUST NOT record audio, screen share, or calls. Issued tokens MUST NOT grant recording or admin rights. | U |
| PRV-4 | Text chat MUST travel only as LiveKit data packets (topic `chat`) and live only in connected browsers' memory. | M, review |
| PRV-5 | The app MUST NOT load remote fonts, CDNs, analytics, or other third-party runtime assets. | B (network log) |
| PRV-6 | Responses carrying credentials (room key, token) MUST send `Cache-Control: no-store`. | A |
| PRV-7 | The room key MUST NOT be sent to the server except in the token request body. It lives in the URL fragment. | review |
| PRV-8 | A public privacy notice at `/privacy` MUST describe what is not stored, what is processed, and what servers log. | B |
| PRV-9 | LiveKit logs at `warn` and container logs are size-capped so IPs and timestamps rotate out quickly. | review (deploy/) |

## 3. Configuration

| ID | Requirement | Verification |
|----|-------------|--------------|
| CFG-1 | The app MUST read `APP_SECRET`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` from the environment and fail the token request if any is missing. | A |
| CFG-2 | `ROOM_TOKEN_TTL_SECONDS` MAY be set; it MUST default to 3600 and fall back to 3600 when not a positive integer. | U/A |
| CFG-3 | `NEXT_PUBLIC_APP_NAME` MAY override the displayed brand name (default "VibeVoice"). | B |
| CFG-4 | A missing-config failure MUST NOT disclose internal variable names to the client. | A (see GAP-3) |

## 4. Room creation — `POST /api/rooms`

| ID | Requirement | Verification |
|----|-------------|--------------|
| ROOM-1 | Returns `{ roomId, roomKey, joinUrl }` with status 200. | A |
| ROOM-2 | `roomId` MUST be 9 random bytes and `roomKey` 18 random bytes from a CSPRNG, base64url-encoded. | U |
| ROOM-3 | `joinUrl` MUST be `<origin>/room/<roomId>` and MUST NOT contain the key. | U/A |
| ROOM-4 | Every call MUST return a fresh, distinct id and key. | A |
| ROOM-5 | No server state is created; the call is idempotent from the server's view. | review |
| ROOM-6 | `joinUrl` origin SHOULD come from trusted configuration, not client-supplied forwarded headers. | A (see GAP-4) |

## 5. Private room naming

| ID | Requirement | Verification |
|----|-------------|--------------|
| NAME-1 | The LiveKit room name MUST be `room_` + first 48 chars of base64url(HMAC-SHA256(APP_SECRET, `roomId:roomKey`)). | U |
| NAME-2 | The same (secret, id, key) MUST always yield the same name; changing any input MUST change it. | U |
| NAME-3 | The name MUST NOT reveal the room id or key. | U |

## 6. Join token — `POST /api/livekit-token`

| ID | Requirement | Verification |
|----|-------------|--------------|
| TOK-1 | Body MUST be JSON `{ roomId, roomKey, displayName }`; invalid JSON or missing fields → 400. | A |
| TOK-2 | `roomId` MUST match `^[A-Za-z0-9_-]{8,80}$`; `roomKey` `^[A-Za-z0-9_-]{16,160}$`; otherwise 400. | U/A |
| TOK-3 | `displayName` is trimmed and inner whitespace collapsed; length MUST be 1–42 after normalisation; otherwise 400. | U/A |
| TOK-4 | On success returns `{ token, url }` (200) where `url` is `LIVEKIT_URL`. | A |
| TOK-5 | The token MUST be a LiveKit JWT signed with the API key/secret, scoped to exactly the derived room, with the display name as `name`, valid for the configured TTL. | U |
| TOK-6 | Grants MUST be: roomJoin, canPublish, canPublishData, canSubscribe, canUpdateOwnMetadata. No admin, record, or hidden grants. | U |
| TOK-7 | Each token MUST carry a unique participant identity (`<roomName>_<uuid>`). | A |
| TOK-8 | Any valid (id, key) pair yields a token; the server does not check that the room "exists" (rooms are implicit). A wrong key therefore lands in a different, empty room. | A |
| TOK-9 | Server errors MUST return 500 with `{ error }` and `no-store`; the message SHOULD be generic. | A (see GAP-3) |
| TOK-10 | The endpoint SHOULD be rate-limited. | A (see GAP-2) |

## 7. Home page (`/`)

| ID | Requirement | Verification |
|----|-------------|--------------|
| HOME-1 | Shows Create and Join tabs; Create is the default. | B |
| HOME-2 | "Create private room" calls `/api/rooms` and displays the room link and the room key as separate, individually copyable values. | B/U |
| HOME-3 | An "Open room" action navigates to `/room/<roomId>` carrying the key to the room page. | B/U (see GAP-1) |
| HOME-4 | Join tab: user pastes a room link and key; empty key → notice "Paste the room key before joining."; invalid URL → "Paste a valid room link."; otherwise navigates to the room page with the key. | B |
| HOME-5 | Creation failure shows an error notice and re-enables the button. | B |

## 8. Room page (`/room/[roomId]`)

### 8.1 Pre-join

| ID | Requirement | Verification |
|----|-------------|--------------|
| JOIN-1 | Shows heading "Join private room" with required Display name (max 42) and Room key fields. | B/U |
| JOIN-2 | The key field is pre-filled when the key was supplied by the link. | B |
| JOIN-3 | Submitting calls `/api/livekit-token`; on non-OK response shows the server's error message and returns to the form. | B/U |
| JOIN-4 | While connecting the button is disabled and reads "Joining". | B |

### 8.2 In room (requires LiveKit)

| ID | Requirement | Verification |
|----|-------------|--------------|
| LIVE-1 | After connect, the microphone is enabled by default and audio playback is started. | M |
| LIVE-2 | Participant list shows every participant with name, "(you)" marker for self, a speaking indicator, and a screen-share indicator. | M |
| LIVE-3 | Mute toggle enables/disables the microphone and reflects state in label and style. | M |
| LIVE-4 | Screen-share toggle starts/stops sharing (with audio); the shared track is shown on the stage for all participants; otherwise an empty-state message is shown. | M |
| LIVE-5 | Remote audio tracks are attached on subscribe and removed on unsubscribe. | M |
| LIVE-6 | Leave disconnects and returns to the pre-join form. Unmounting the page disconnects. | M |
| LIVE-7 | A server-initiated disconnect returns the UI to idle and clears participants and screen. | M |

### 8.3 Chat

| ID | Requirement | Verification |
|----|-------------|--------------|
| CHAT-1 | Messages are sent reliably as UTF-8 data packets with topic `chat`. | M |
| CHAT-2 | Outgoing messages are trimmed; empty messages are not sent; input max length is 500. | B/M |
| CHAT-3 | Incoming messages on other topics, empty, or >500 chars are ignored. | M |
| CHAT-4 | Own messages are shown as "You"; others by display name. History exists only in memory and is lost on leave/reload. | M |
| CHAT-5 | Message text MUST be rendered as plain text (no HTML injection). | B |

## 9. Deployment

| ID | Requirement | Verification |
|----|-------------|--------------|
| DEP-1 | `npm run build` produces a Next.js standalone output; `poweredByHeader` disabled. | build |
| DEP-2 | The Dockerfile builds a multi-stage image (ARM64 supported via buildx), runs as a non-root user, listens on port 3000. | docker build |
| DEP-3 | The container needs only the env vars in §3. | review |

## 10. Known gaps (spec vs. current implementation)

These are requirements above that the implementation does not (fully) meet; they are tracked, not hidden.

| ID | Gap | Affects |
|----|-----|---------|
| GAP-1 | ~~Room key in the query string~~ — fixed: the key now lives in the URL fragment (`#key=`). | PRV-7, HOME-3 |
| GAP-2 | No rate limiting on `/api/livekit-token` or `/api/rooms`. | TOK-10 |
| GAP-3 | 500 responses return raw `error.message` (e.g. "Missing required environment variable: APP_SECRET"). | CFG-4, TOK-9 |
| GAP-4 | `joinUrl` origin trusts `x-forwarded-host` / `x-forwarded-proto` from the request. | ROOM-6 |
| GAP-5 | Dockerfile copies `/app/public`, which does not exist in the repo (build likely fails). | DEP-2 |
| GAP-6 | No end-to-end media encryption; LiveKit server can see media. README should say so explicitly. | PRV |
| GAP-7 | No moderation: every holder of link+key has full publish rights and cannot be removed. | TOK-6 |
| GAP-8 | 500 responses from `/api/livekit-token` lack `Cache-Control: no-store`. | TOK-9 |
| GAP-9 | No security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy). A `Referrer-Policy` matters while GAP-1 stands. | PRV-7 |
| GAP-10 | `npm start` runs `next start`, which Next.js warns is unsupported with `output: "standalone"` (use `node .next/standalone/server.js`). | DEP-1 |

## 11. Test report (2026-11-26)

Environment: Node 22.22.1, Next.js 16.2.9, production build served on localhost:3100 with dummy
LiveKit credentials. **No LiveKit server was available**, so everything marked "M" is untested.

| Check | Result |
|-------|--------|
| `npm run lint` | pass |
| `tsc --noEmit` | pass |
| `npm test` (vitest, 7 tests) | pass — covers NAME-1..3, TOK-2/3/5/6, HOME-2/3, JOIN-1/3 |
| `npm run build` | pass |
| ROOM-1..4 | pass (id 12 chars, key 24 chars, distinct each call, `joinUrl` has no key) |
| ROOM-6 | **fail** — forged `x-forwarded-host: evil.example` produced `http://evil.example/room/...` (GAP-4) |
| TOK-1..4 | pass — all 11 negative cases returned 400 (bad JSON, missing field, short id, `../` id, short key, blank/43-char/numeric name, array/null body); 42-char name accepted; GET → 405 |
| TOK-5/6 | pass — JWT scoped to derived room, name normalised to "Ada L", ttl 3600, no admin/record grants |
| TOK-7/8 | pass — unique identity per token; wrong key yields a different room name |
| TOK-9 / CFG-4 | **fail** — missing `APP_SECRET` returns 500 `Missing required environment variable: APP_SECRET` (GAP-3, GAP-8) |
| TOK-10 | **fail** — 60 rapid requests all returned 200 (GAP-2) |
| PRV-6 | pass for 200 responses (`no-store`) |
| PRV-5 | pass — in Chrome the only requests were to localhost and the configured LiveKit host |
| PRV-7 / HOME-3 | **fail** — room URL is `/room/<id>?key=<key>` (GAP-1) |
| HOME-1..2, JOIN-1..2 | pass in Chrome — Create tab default, link and key shown separately, key pre-filled on room page |
| JOIN-3 | pass — with LiveKit unreachable the form stays and shows "could not establish signal connection…" (message is cryptic; consider friendlier text) |
| DEP-1 | pass (standalone output produced) |
| DEP-2 | **fail** — `docker build` stops at `COPY --from=builder /app/public` (GAP-5) |
| HOME-4/5, CHAT-5, LIVE-*, CHAT-1..4 | not tested in the first run — see the follow-up run below |

### Follow-up run: in-room features (local LiveKit v1.13.11, two Chrome tabs)

Chrome had no microphone or screen picker, so `getUserMedia` / `getDisplayMedia` were stubbed
(oscillator tone, canvas video); WebRTC through LiveKit was real.

| Check | Result |
|-------|--------|
| LIVE-1, LIVE-2 | pass — both tabs list both participants, "(you)" marker correct |
| CHAT-1, CHAT-4 | pass — messages delivered both ways, own shown as "You" |
| CHAT-5 | pass — `<b>` / `<img onerror>` rendered as literal text, no script ran |
| LIVE-3 | pass — mute/unmute toggles label and style |
| LIVE-4 | pass — Bob received and played Alice's 640x360 screen share |
| LIVE-5 | **fail, now fixed (BUG-1)** — see below |
| LIVE-6, LIVE-7, CHAT-2/3, HOME-4/5 | not tested |

**BUG-1 (fixed):** a participant who joined a room that already had people heard none of them.
`TrackSubscribed` fires for already-published tracks while `room.connect()` is still pending, but
the `<audio>` container only existed in the connected view, so the attach was silently skipped.
Fix: the container is rendered in both views at a stable position
([components/room-shell.tsx](../components/room-shell.tsx)). Regression test:
[components/room-shell.audio.test.tsx](../components/room-shell.audio.test.tsx) — it failed before
the fix (0 audio elements) and passes after. Not yet redeployed to the server.
