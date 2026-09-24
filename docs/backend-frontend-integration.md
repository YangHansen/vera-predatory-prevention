# Frontend / backend integration

Create a connected session at `/sessions`. The QR opens `/client/sess_...`; the agent invitation opens `/agent/sess_.../invite`, then `/session/sess_...`. `/client/preview` and `/agent/preview` remain explicitly labeled visual demos.

The current white/blue layout and client steps are retained. Server sessions are polled every two seconds. Policy highlights, questions, recording/camera permissions, and review status persist through the existing session API. Agent transcription reuses SpeechListener in cloud mode, saves the transcript, and sends contextual analysis every 60 seconds or on demand. The existing backend selects its configured AI or fallback analysis.

The camera uses the existing VisualFocusRing calibration, MediaPipe detection, and `/api/face/verify` behavior in a compact rendering. Camera starts only on request in this frontend. Face snapshots may be sent to the server and Google Gemini; the client and agent disclosures explain this. Opening mesh and snapshot remain in component memory, so a page reload before final verification requires restarting the opening check. No simulated camera-check button is shown for connected sessions.

Typed signatures are rendered to PNG; drawn signatures use canvas PNG. Both submit to `/api/consent/submit` with actual collected telemetry and use the returned session result. Agent results show backend decision and audit notes; client acknowledgement remains neutral.

## Validation
- Run `node scripts/test-frontend-integration.cjs`. Tests isolate disk state in a temporary directory, disable Gemini, and check session creation, client QR target, permissions, questions, shared policy selection, review state, consent outcome, and missing-session errors.
- Browser checks: create session, open client link, consent screens, disabled progression until camera calibration, client question visible to agent.
- Run the production build.
- Hardware camera/microphone accuracy and remote Gemini calls need a manual run with permission and a configured key. Phone QR testing requires a reachable HTTPS host. The backend’s file-backed session storage and existing fallback decisions are retained; this is not a distributed production deployment.


## Conversation and history UI revision
- Client conversation displays Following along only. Conversation recap is included in the final Summary & consent steps; the My question tab is removed. The separate ask-advisor action remains available.
- Agent conversation follows the supplied two-column reference: batch timer, conversation points, customer questions, and copilot wording. Transcript controls are secondary, inside an expandable section.
- Dashboard separates Ongoing (including final review) from Completed (signed). Completed sessions open read-only history rather than an editable conversation. Each tab includes a clearly labeled illustrative sample; samples do not call recording or analysis APIs.
- Sample routes: `/session/sample-conversation` and `/session/sample-history`.

Presentation access: the agent invitation offers an unlocked Preview conversation link when joining/disclosure is incomplete. The ?presentation=1 view uses sample content and local screen transitions; it does not change live verification, record audio, or submit consent. The client question button has been removed.
