# Jynlo Mobile ↔ Web — Parity audit (2026-11-18)

Working branches: `jynlo-mobile/develop`, `jynlo-web-FE/develop`, `jynlo-web-BE/develop`. This audit covers source contracts only; not a claim of device-level verification.

## Rule of acceptance
A feature is **complete** only after API and permission parity, Android/iOS UI validation, successful TypeScript/contract tests, and a release build installed by testers. Never mask a server-side safety gate (private media, push delivery) with UI-only changes.

## Findings and remediation

### 1. Stories — HIGH
Web editor supports draggable/rotatable caption, font, color, background, optional timestamp, places, tags, alt text; native editor previously published only caption geometry, place and tags.

Mobile `develop` now sends `textColor`, `textBackground`, `textFont`, `showTime`, and `altText` to the existing `POST /api/stories` contract, renders corresponding overlays in editor and viewer, and adds test coverage. Existing captions remain supported. Pending: real Android/iOS visual checks for alignment, pinch/rotate, camera/gallery, date label, tags and actual publish/refresh. Multiple Stories/media in one authoring action are not yet verified.

#### Story viewer, reactions and verified audience (2026-11-18)
After the Android screenshot showing an apparently empty Story viewer:
- Added explicit media states (loading, ready, error), 12-second timeout for stalled images/videos, a retry action and a clear error overlay rather than a permanently black surface. Video uses `contain` to avoid cutting off the subject. Photo progression waits for a successful media load.
- Improved the lower interaction row with responsive wrapping, private quick reactions (emoji replies), privacy disclosure, and an author-only `Quem viu` sheet showing unique authenticated viewers, usernames, avatars and view timestamps.
- Added `POST /api/stories/{id}/views` only after a photo loads or a video reaches ready-to-play; the author does not count as a viewer. `GET /api/stories/{id}/audience` is author-only. Do not synthesize zero counts while the backend is unavailable.
- Backend `develop` adds `social_story_view` with unique `story_id,profile_id` and cascade deletion (Liquibase change `2026-11-18-story-view-audience.yaml`). The web Story feed and profile player also report a view after media load, and the web owner gets an audience panel.
- The feature is **NOT production-ready** until migration, Java unit tests, Angular build, mobile typecheck and native two-account tests pass. Confirm private profile blocking, viewer permissions, Story expiration cleanup, and FCM unaffected. Existing stories cannot acquire historical viewer counts retroactively.
- 23:43 UTC additional audit: closed stale audience race in mobile (the Story ID/account/request revision must still match before an async audience response is displayed), and added Java tests for blocked actors, expired Stories and blocked audience entries. Isolated source-level mobile Story tests: **33/33 PASS** after the corrections. Backend CI on the prior test commit failed because the new blocked-view test did not consume a default Mockito stub; fixed in backend commit `3e8fc6e`, with CI rerun pending. These targeted results are not equivalent to an APK or staging migration acceptance.

### 2. Personal Lives — CRITICAL
Web has `/api/live` event management, LiveKit rooms, chat, guest requests and host moderation; mobile had LiveKit direct calls but no personal Lives flow.

Mobile `develop` now has `/live` discovery/start and `/live/[id]` host/viewer room, the authenticated API, host heartbeat, LiveKit publisher/viewer roles, media toggles, chat, host chat enable/disable, guest request and approval, role revocation, WebSocket-first invalidation, 30s fallback. Start now checks camera and microphone permissions on **Android and iOS**, before creating a server LIVE event. Guest promotion to publishing privileges uses the same gate. The native manifest already has the iOS usage descriptions and Android capture permissions; these are checked in contract tests. Viewer connects without publishing. Pending: real-device LiveKit E2E (two test accounts), remote audio routing/headsets, rotation/backgrounding, reconnect, all moderation actions, revoked token behavior, network spikes, screen-sharing, co-hosting. Do not claim feature released until this passes.

### 3. Community Lives — CRITICAL
Backend `/api/communities/{communityId}/live` controls capabilities, scheduling, owner-only start/end, heartbeat, and member-only join. Web hosts an equivalent panel. Mobile `develop` now has `/communities/[id]/live` discovery/scheduling/start and `/communities/[id]/live/[eventId]` for LiveKit host/viewer room, gated by backend capabilities and memberships. Viewer only subscribes; owner requests camera and microphone permissions on **Android or iOS** before starting. Host heartbeat runs every 20s and room checks stream status every 15s; expired sessions cannot be claimed as active. The owner can explicitly end with confirmation. Mobile access is linked from the community detail for members. API and navigation contracts have regression tests.

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
Mobile direct, community, session and team chats support authenticated historical messages and media/PDF attachments, but connectivity differed. The direct-chat screen relied on a 15-second timer and optional native notifications even though the backend already emits authenticated `CHAT_MESSAGE` and `CHAT_READ_RECEIPT` WebSocket events.

On mobile `develop`:
- Added `observeDirectChat` scoped to authenticated self+peer. It only uses relevant WebSocket event envelopes as **invalidation hints**, never message data. Authorized HTTP continues to own content, block checks, read state and errors.
- Changed the direct screen to refresh immediately on relevant events or socket reconnect, with 5-second fallback when disconnected and 30-second recovery sync when online. It tears down sockets on focus/account/peer changes.
- Changed session chat from fixed 15-second polling to WebSocket-first refresh with the same adaptive fallback. Other community/team chats already use authenticated realtime invalidations and HTTP reconciliation; no manual Refresh button was reintroduced.
- Added regression tests for cross-conversation events, socket authentication and cleanup, and scoped fallback/notification handling.
- **Community membership safety:** the community WebSocket handler no longer places socket payload messages directly into the visible history. It triggers an authenticated HTTP refresh, which rechecks access and clears messages if membership is revoked; read receipts still require actual message visibility in the viewport.
- **Team composer keyboard:** the team chat now tracks keyboard show/hide and composer focus. The history shrinks while typing, and scrolls to the latest message only if the user was already near the bottom. This avoids involuntary jumps away from earlier messages.
- Team feeds already provide member-scoped WebSocket invalidations, the same online/offline 30-second/5-second recovery schedule, private media and PDF attachments, comments, reactions, search and pagination. Reused rather than duplicating these existing features.
- Added `mobile-community-team-chat-parity-audit.test.cjs` and updated the community chat visibility regression test. These are source-level contracts; complete device tests remain a release gate.

Pending: two-device tests with distinct accounts and blocked users, attachments (images and PDFs) in direct/session/community/team scopes, pending writes during backgrounding, receipt consistency, reconnect under poor network, typing indicators, and team/community feeds. Ensure native keyboard does not hide the composer. A successful source contract check does not establish device-level message delivery.

### 6. Sessions, tournaments, teams — HIGH
Mobile has creation/review/editing, maps and tournament/championship/team routes; previous fixes were added on `develop`. Validate saved venue pin, session cancellation fan-out, registration rules, team balancing, creating teams, scores and tournament controls. Do not claim full parity without checking server-permission matrices.

### 7. Privacy & native notifications — BLOCKING
Private profiles remain server-gated pending protected-media cutover and prevention of direct-link exposure. Android push requires verified Firebase/FCM credentials, a signed build, token registration and real-device end-to-end delivery. Never enable server push merely because UI exists.

## Release gate
1. `npm run typecheck`, `npm run test:all`, `npm run check:push`, and signing/config checks pass with no known regression.
2. An Android closed-testing AAB (not merely a local demo) built from the intended `develop` commit.
3. Two-device manual E2E: start/stop Live, viewer video/audio, chat and guest promotion/demotion; create, view and delete Stories with styles; posts; permissions; notifications; session flows.
4. Check Render API errors/CPU/memory and back-pressure during multiple active Live viewers; do not extrapolate successful UI from successful source commits.
