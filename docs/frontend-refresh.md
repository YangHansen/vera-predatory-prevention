# Vera frontend refresh — 17 September decisions

## Scope

Frontend-first implementation on `feat/vera-frontend-refresh`. The revised experience uses browser-local demo data. The existing API routes, branching engine, Gemini integration and original `/copilot`, `/policy`, `/customer/[id]`, and `/admin/agents` playgrounds remain available for later integration. They have NOT been migrated to the new UX.

### Preview routes

| Route           | Purpose                                                                |
| --------------- | ---------------------------------------------------------------------- |
| `/`             | Agent overview, activity metrics, active conversation, recent sessions |
| `/sessions`     | Searchable session history, status/date filters and CSV export         |
| `/policies`     | Existing sample policy catalog with plain-language details             |
| `/guide`        | Revised workflow and agent guidance                                    |
| `/session/[id]` | Agent conversation, sample transcript, guidance, invitation and review |
| `/client/[id]`  | Mobile client welcome → conversation → review/consent → receipt        |

Use **New session** with a sample name, then **Open client welcome**. Keep the agent and client tabs open in the same browser and origin. The current sample clock is fixed to 20 September 2026. Preferences can reset the demo workspace.

## Revised requirements

| ID    | Requirement                                             | Frontend behavior                                                                                                        |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| UX-01 | Agent already has access                                | Opens directly into the advisor workspace; no sign-in or sign-up                                                         |
| UX-02 | Simple mobile client flow                               | A single welcome combines disclosure and the opening identity check                                                      |
| UX-03 | Explicit audio recording disclosure                     | Client must acknowledge disclosure before the simulated opening check                                                    |
| UX-04 | Camera at opening and final review only                 | No camera controls, facial indicators, or confusion scores during conversation                                           |
| UX-05 | Understanding checks during final summary               | Calm review notice; no intrusive focus ring or emotion score                                                             |
| UX-06 | Final identity and physical gesture confirmation        | Separate simulated face-match/nod step before demo consent                                                               |
| UX-07 | Questions before consent                                | Questions sync to the agent tab; unresolved questions block submission                                                   |
| UX-08 | Private review outcomes                                 | Agent sees sample fast-track/manual-review status; client gets a neutral receipt                                         |
| UX-09 | Continuous transcription, minute-based context feedback | Sample transcript playback and 60-second feedback demonstration                                                          |
| UX-10 | Accessible review                                       | Mobile layout, zoom enabled, labeled controls, keyboard dialog trap, typed signature alternative, reduced-motion support |

## Design assets

- `public/vera-logo.svg`: reusable wordmark in solid blue.
- `src/app/icon.svg`: compact V mark for browser tabs.
- `src/components/workspace/Brand.tsx`: code-native brand component.
- White surfaces, blue actions, slate text, and a flat metrics row. The overview prioritizes session work; decorative illustrations and promotional copy have been removed.

## Integration boundary

This is a prototype, not a working recording/verification system. It now offers an opt-in, local-only camera preview during opening and final review. It does not request microphone permission, call AI APIs, store a signature, or submit an insurance application. See [the handoff research and camera notes](ux-research-handoff.md). The simulated final submission is always marked **Needs review** for the agent; existing fixture outcomes are samples, not decisions.

Session metadata and questions are stored under `vera-frontend-demo-v1` in localStorage. Use sample data only. Cross-tab updates use storage events. New sessions do not pair across devices; the QR points to the preview URL, and its dialog states the same-browser limitation. Real authentication/authorization and agent-only API response filtering are backend requirements; hiding outcomes in client components is not a security boundary.

Before live integration:

1. Replace the demo store with session creation, polling/subscriptions, and secure early client handoff. Do not expose internal compliance fields in customer responses.
2. Gate audio recording on explicit disclosure; keep transcription live and feedback batched at 60 seconds. Show rate-limit/unavailable/retry states rather than fabricated feedback.
3. Implement opening baseline identity capture in device memory. Stop tracks before conversation. Restart only for summary understanding review and final liveness/gesture verification; stop on leave, error, and completion.
4. Validate matching and gesture confidence, user permission denial, retry and manual-assistance paths. Do not use elapsed time or a simulated button as successful verification.
5. Calibrate confusion against the opening baseline and sustained signals during summary review. Sensitivity and thresholds require representative testing; this UI does not claim to solve detection accuracy.
6. Submit an actual signature and verified session-bound evidence only after explicit consent. Preserve unresolved questions, support pause/decline, and return an agent-only decision with a neutral client receipt.
7. Reconcile sample policy terms with the approved backend source before using any real customer data.

## Development

The repository already contains an npm lockfile that does not match the declared Next.js range. A reproducible `pnpm-lock.yaml` is included for this branch. With Node.js and pnpm installed:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm exec tsc --noEmit
pnpm build
```

Do not run `next dev` and `next build` against `.next` concurrently. Optional dependency lifecycle scripts are explicitly disabled in `pnpm-workspace.yaml`; the frontend does not require them.

## Focused acceptance cases

| Case                   | Steps                                                                                              | Expected                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Create session         | New session → sample name → create                                                                 | New record persists; agent welcome opens                    |
| Disclosure gate        | Open client welcome before checking disclosure                                                     | Join disabled; no camera/mic request                        |
| Opening check          | Acknowledge → simulate initial check → join                                                        | Agent and client move to conversation                       |
| Conversation privacy   | View conversation                                                                                  | Camera off; no focus ring, emotion score or approval flag   |
| Question sync          | Client asks a question in a second tab                                                             | Agent sees the exact question                               |
| Review gate            | Enter review, complete demo identity check, acknowledgement and signature while a question remains | Submit stays disabled                                       |
| Resolution             | Agent marks question discussed                                                                     | Submit becomes enabled when other checks are complete       |
| Consent                | Submit demo consent                                                                                | Neutral client receipt; agent shows Needs review            |
| Signature alternatives | Draw or type; clear                                                                                | Either input enables signature condition; clear resets both |
| Search and filter      | Search unmatched text; clear; filter Needs review                                                  | Empty state and filtered counts are accurate                |
| Policies               | Search catalog → open details → start a session                                                    | Selected policy carries into new session form               |
| Keyboard dialog        | Open modal → Tab/Shift-Tab → Escape                                                                | Focus stays within dialog and returns to trigger            |
| Mobile                 | Inspect at 390px and 320px                                                                         | Client content fits; touch controls remain usable           |
| Export                 | Export history / save client summary                                                               | Demo-marked download; no internal outcome in client summary |
| Missing session        | Open an unknown client ID                                                                          | Honest unavailable state with workspace link                |

Live camera permissions, genuine liveness, Gemini rate-limit handling, backend branching, offline reliability, and cross-device pairing need separate integration tests.


## Verification completed

- TypeScript: `tsc --noEmit` passed.
- Production: `next build` passed (all 21 static pages generated; dynamic preview routes compiled).
- Browser walkthrough: created a sample client, acknowledged disclosure, simulated opening face check, entered conversation, sent a question to the agent tab, moved into final review, verified consent stayed disabled until the question was resolved, submitted demo consent, and observed a neutral client receipt.
- Browser checks: session search empty state, status filtering and Escape dismissal passed.
- Responsive checks: client screens inspected at 390px and 320px; no horizontal overflow. Desktop overview visually inspected.
- These checks validate the frontend demo, not live identity, AI, recording or insurance approval behavior.


