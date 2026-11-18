# Jynlo Mobile ↔ Web — Parity audit (2026-11-18)

Working branches: `jynlo-mobile/develop`, `jynlo-web-FE/develop`, `jynlo-web-BE/develop`. This audit covers source contracts only; not a claim of device-level verification.

## Rule of acceptance
A feature is **complete** only after API and permission parity, Android/iOS UI validation, successful TypeScript/contract tests, and a release build installed by testers. Never mask a server-side safety gate (private media, push delivery) with UI-only changes.

## Findings and remediation

### 1. Stories — HIGH
Web editor supports draggable/rotatable caption, font, color, background, optional timestamp, places, tags, alt text; native editor previously published only caption geometry, place and tags.

Mobile `develop` now sends `textColor`, `textBackground`, `textFont`, `showTime`, and `altText` to the existing `POST /api/stories` contract, renders corresponding overlays in editor and viewer, and adds test coverage. Existing captions remain supported. Pending: real Android/iOS visual checks for alignment, pinch/rotate, camera/gallery, date label, tags and actual publish/refresh. Multiple Stories/media in one authoring action are not yet verified.

### 2. Personal Lives — CRITICAL
Web has `/api/live` event management, LiveKit rooms, chat, guest requests and host moderation; mobile had LiveKit direct calls but no personal Lives flow.

Mobile `develop` now has `/live` discovery/start and `/live/[id]` host/viewer room, the authenticated API, host heartbeat, LiveKit publisher/viewer roles, media toggles, chat, host chat enable/disable, guest request and approval, role revocation, WebSocket-first invalidation, 30s fallback. Start asks Android permissions before creating a server LIVE event. Viewer connects without publishing. Pending: real-device LiveKit E2E (two test accounts), remote audio routing/headsets, rotation/backgrounding, reconnect, all moderation actions, revoked token behavior, network spikes, screen-sharing, co-hosting. Do not claim feature released until this passes.

### 3. Community Lives — CRITICAL
Backend `/api/communities/{communityId}/live` already manages capabilities, scheduling, host start/end, heartbeat and join. Web has a community Live panel. Mobile has no equivalent documented in this audit. Next: role-gated community listing/scheduling/stream, without granting non-admin users host privileges. Test viewer and admin accounts.

### 4. Posts and social feed — HIGH
Both mobile and web have post creation and interactions. Source parity has **not** yet been established for text placement, media presentation, edit/delete/hide, likes/comments and privacy controls. Compare existing upload receipts and server authorization before changing flows. Prior user observation: mobile publish sometimes shows no result.

### 5. Chats — HIGH
Mobile direct, community, session and team chats exist. Many use authenticated WebSockets with HTTP resync, but updates, keyboard overlaps, attachment visibility, history and parity must be tested with two real accounts and roles. Never restore manual Refresh as a workaround.

### 6. Sessions, tournaments, teams — HIGH
Mobile has creation/review/editing, maps and tournament/championship/team routes; previous fixes were added on `develop`. Validate saved venue pin, session cancellation fan-out, registration rules, team balancing, creating teams, scores and tournament controls. Do not claim full parity without checking server-permission matrices.

### 7. Privacy & native notifications — BLOCKING
Private profiles remain server-gated pending protected-media cutover and prevention of direct-link exposure. Android push requires verified Firebase/FCM credentials, a signed build, token registration and real-device end-to-end delivery. Never enable server push merely because UI exists.

## Release gate
1. `npm run typecheck`, `npm run test:all`, `npm run check:push`, and signing/config checks pass with no known regression.
2. An Android closed-testing AAB (not merely a local demo) built from the intended `develop` commit.
3. Two-device manual E2E: start/stop Live, viewer video/audio, chat and guest promotion/demotion; create, view and delete Stories with styles; posts; permissions; notifications; session flows.
4. Check Render API errors/CPU/memory and back-pressure during multiple active Live viewers; do not extrapolate successful UI from successful source commits.
