# UX research: client welcome and agent invitation

Research date: 20 September 2026. This is a heuristic redesign, not a claim of usability testing with clients.

## Findings and application

1. **Visible status and relevant information.** [Nielsen Norman Group: 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) supports showing current status, using familiar language, and removing information that competes with the task. The agent now has a dedicated invitation page: session context, QR, link alternative, waiting/joined status, and one gated continuation action. No metrics, marketing illustrations, or transcript appear during handoff.
2. **Readable controls for older clients.** [W3C: Developing websites for older people](https://www.w3.org/WAI/older-users/developing/) emphasizes readable text, contrast, labels, and understandable feedback. Client content uses 15–16px body text, labeled checkboxes, approximately 44–49px primary controls, native keyboard interactions, and plain-language camera errors. This is not a full WCAG conformance audit.
3. **Review before commitment.** [GOV.UK: Check answers](https://design-system.service.gov.uk/patterns/check-answers/) places a review step immediately before submission. The client retains the full summary, explicit acknowledgement, unresolved-question gate, and signature step before submitting demo consent.
4. **Clear completion and next steps.** [GOV.UK: Confirmation pages](https://design-system.service.gov.uk/patterns/confirmation-pages/) recommends explaining completion and what happens next. The client receipt remains neutral with a reference and downloadable summary. Agent review flags stay out of the client UI.

## Preview URLs

- Agent invitation: `/agent/preview`
- Client welcome and camera: `/client/preview`
- Any new session: `/agent/[id]/invite` pairs with `/client/[id]`.

The named preview uses a sample Siti Aminah session even when browser storage is empty. A Reset demo control on the agent screen restores welcome. These links are local, not publicly hosted. A QR that points to 127.0.0.1 will not open this server on a phone. Cross-device linking and shared state require hosted backend integration; same-browser tabs synchronize in this prototype.

## Camera preview

The new client component requests `getUserMedia` only when the client chooses Turn on camera, after disclosure acknowledgement for the opening check. It requests front-facing video and no audio. It displays the local stream in a mirrored, muted, inline video element. It does not record, upload, or save frames.

Opening and review screens own the camera component. Track cleanup runs when the camera is switched off, permission is cancelled, the component unmounts, the client enters conversation, or consent completes. A request token prevents a late permission response from reopening the camera after navigation. Permission denied, no camera, busy camera, and general failure have retry guidance.

**A visible live camera is not identity verification.** Face matching, confusion detection, and physical nod recognition are still unimplemented. Their demo controls are separately labeled as simulations, and can be used without a camera. Do not treat them as compliance evidence.

## Integration and validation still needed

- Test with older clients and agents: comprehension of the notice, successful scan, time to join, ability to ask a question, and recovery from denied camera permission.
- Real-device front-camera testing on Safari/iOS and Chrome/Android, including permission revocation, backgrounding, interrupted calls, and camera-in-use conditions.
- Secure session tokens, server-confirmed handoff status, expiration, cross-device synchronization, and accessible assistance when a client cannot use a camera or scan a QR.
- Actual liveness/matching/gesture integration with no frame persistence, phase-scoped understanding checks, and non-camera assistance paths.

## Verification of this revision

- Production build passed with the two agent invitation routes and the client route.
- Browser walkthrough confirmed: disclosure → camera panel → simulated identity check → join; agent status changes to joined in the other tab and continuation requires the agent disclosure checkbox.
- Camera panel is absent in conversation and present again in final review.
- Reset demo restores the paired welcome state.
- The camera stream implementation was inspected for request cancellation and track cleanup. Physical camera permissions and hardware were not exercised in this run.

## Screen-by-screen client flow

Updated after review: the client flow no longer combines permissions, policy terms, and signature into one scrolling page.

- Opening: welcome → audio consent → camera consent → camera preview / demo identity check.
- Conversation: one policy detail at a time, Previous/Next navigation, no camera component.
- Final review: camera setup → premium → each summary detail separately → demo face match/nod → policy acknowledgement → signature → receipt.
- Questions open as a separate full-screen step and return to the current step.
- A compact camera preview stays mounted across final review steps and stops during conversation, help, or completion.
- Back/Next remain in a separate footer. Content is sized for 390×844 and compact 320×568 layouts. Overflow remains available as an accessibility fallback for enlarged text or unusually short viewports; content is never silently clipped.


## PRD scope correction
The September 13 PRD v3.1 is the source of product scope; explicit September 17 meeting decisions override camera timing and agent-only outcome visibility. The main entry now shows early QR hand-off, rather than the added general dashboard. Agent conversation and copilot remain the core screen. Client conversation has separate Following along, Summary, and My question views; agent policy selections mirror locally and sample playback supplies an illustrative conversation summary. Separate permission and final consent screens remain. Manager analytics are future scope. This is a frontend demo using same-browser storage, not implemented cross-device sync, Gemini analysis, or identity verification.
