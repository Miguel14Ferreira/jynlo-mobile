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
Backend `/api/communities/{communityId}/live` controls capabilities, scheduling, owner-only start/end, heartbeat, and member-only join. Web hosts an equivalent panel. Mobile `develop` now has `/communities/[id]/live` discovery/scheduling/start and `/communities/[id]/live/[eventId]` for LiveKit host/viewer room, gated by backend capabilities and memberships. Viewer only subscribes; owner requests capture permission before starting. Host heartbeat runs every 20s and room checks stream status every 15s; expired sessions cannot be claimed as active. The owner can explicitly end with confirmation. Mobile access is linked from the community detail for members. API and navigation contracts have regression tests.

Pending before release: physical-device E2E with owner + member (Android/iOS), verify viewer audio, camera and microphone toggle, deny permissions, expire/close on other client, and error handling under poor network. The mobile scheduler uses a validated text datetime field, which should be replaced by a reliable native picker in UX polish. Backend currently reserves host rights for the community **owner** (not every admin); do not infer host rights from local roles.

### 4. Posts and social feed — HIGH
The backend accepts creating single-media posts, mixed albums (up to six), text/location edits and `PUT /api/feed/posts/{postId}/media` for explicit replacement of existing attachments. Mobile already had a feed, full-post view and an author-only editor. Findings and remediation on mobile `develop`:

- **Blank feed after canceled first load:** the first authenticated fetch could set account identity while the hidden-post preferences were still pending. If that fetch was invalidated by navigation, a later refresh never retried the visibility load, leaving `hiddenReady=false` and hiding all posts. Added `hiddenReadyRef` and retry whenever preferences have not finished loading, preserving account isolation.
- **Post success navigation:** a server-confirmed new post is now reachable directly from the success banner via its authoritative `postId`, not only from a feed refresh.
- **Editing attachments:** the author editor can now choose 1–6 replacement photos/videos with previews, preserves current media unless the user explicitly confirms replacement, sends the existing authenticated multipart PUT with `replaceMedia=true` and repeated `files`, and keeps reactions/comments attached to the post.
- **Stale list after media edit:** confirmed replacement media is preserved across delayed feed GET responses until the server converges, without freezing likes or comments. Text-only edits retain server-authoritative media. Media-only posts with nullable captions are handled.
- Added regression tests for interrupted visibility hydration, post confirmation links, media upload contract, explicit replacement consent and reconciliation. Executed the pure reconciliation logic on isolated test data with successful checks; no actual mobile/native build or end-to-end upload verification is claimed.

Pending: run complete TypeScript/Node suite and actual Android media-upload/edit/delete flow against staging with two accounts. Confirm media stored, old files cleaned, privacy rules, album order, post preview + profile gallery, resuming after network faults, and feed events. Do not retry uncertain upload responses automatically: a network timeout may occur after the server has saved the post.

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
