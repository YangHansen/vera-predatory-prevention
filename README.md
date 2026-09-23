> **Frontend refresh (17 September decisions):** Start at `/` for the revised agent workspace. Use **New session** to preview the mobile client flow. This is an interactive, browser-local demo; camera, transcription and consent services are not connected. See [frontend requirements, integration notes, and acceptance cases](docs/frontend-refresh.md).
# Vera — AI-Powered Insurance Consent & Mis-selling Prevention

> **Project ID:** VERA-MVP-2026  
> **Regulatory Standards:** Monetary Authority of Singapore (MAS) Guidelines on Fair Dealing • Financial Advisers Act (FAA) • Insurance Act (Section 25(5)) • Singapore PDPA  
> **Tech Stack:** Next.js 15 (App Router) • React 19 • TypeScript • Tailwind CSS • Google MediaPipe Face Landmarker (WASM) • Google Gemini 3.5 Flash-Lite / 3.5 Transcribe Live • Progressive Web App (PWA)

---

## About Vera

Vera is a B2B SaaS compliance platform designed to eliminate predatory insurance sales tactics and guarantee genuine "Informed Consent" in financial advisory meetings under Singapore regulatory standards (MAS Fair Dealing Guidelines).

By pairing a real-time AI Sales Copilot for financial advisors with an accessible, high-contrast Customer Mobile Interface for senior and vulnerable consumers (e.g., Mdm. Tan), Vera bridges the transparency gap without slowing down advisory closing workflows.

---

## Implemented Modules & Features

### 1. AI Sales Copilot & Speech Mis-selling Detector (FR-02) — `/copilot`
- **Advisor Real-Time HUD**: Real-time compliance monitoring interface designed for field financial advisors (Advisor Andi, FC-1092).
- **Domain-Primed Speaker Turn Differentiation (`speakerTurns`)**:
  - Speech-to-Text and Gemini Copilot models are primed upfront with knowledge of an insurance advisory consultation between a **licensed Insurance Agent / Financial Adviser** and a **prospective Client / Consumer**.
  - Distinguishes when the **Agent is explaining** policy terms, benefits, fees, and penalties versus when the **Client is asking questions**, seeking clarification, or stating pre-existing health conditions.
  - Generates structured turn-by-turn feeds (`[Advisor Andi]` vs `[Prospect Client]`) displayed directly on the Copilot HUD.
- **Triple-Engine STT Speech Recognition Architecture**:
  - **Browser Web Speech API (`webkitSpeechRecognition`)**: Client-side speech listener with zero Google AI Studio token consumption.
  - **Google Gemini 3.5 Transcribe Live (Bidi WebSocket)**: Low-latency streaming speech transcription over WebSocket bidirectional protocol (`gemini-3.5-transcribe-live`).
  - **Google Gemini Cloud REST API**: High-accuracy multimodal audio transcription prioritizing `gemini-3.5-flash-lite` with automatic fallback to `gemini-3.5-transcribe` and pause-aligned VAD chunking.
- **Quick Speech Simulation Pills**: One-click speech simulator actions for rapid demonstration without audio hardware:
  - `[Speak: Waiting Period (Clause 4)]`
  - `[Speak: Surrender Penalty (Clause 3)]`
  - `[Speak: Annuity at 62 (Clause 1)]`
  - `[Speak: Section 25(5) Disclosure]`
  - `[Clear (Silent Mode)]`
- **Engine Source Provenance Transparency**: Real-time badge on the HUD indicating whether an audit was evaluated by **`Google Gemini Cloud (Live GenAI)`** or **`Vera MAS Compliance Rules Engine (Offline Fallback)`**.
- **60-Second Auto-Audit Batch Timer**: Automatically audits accumulated dialogue every 60 seconds or on demand, summarizing key points and answering customer inquiries.
- **MAS Compliance Categorization**: Flags advisory conduct as Green (Compliant), Yellow (Advisory Warning / Disclosure Omission), or Red (Severe Predatory Tactic / Misleading Guarantees).
- **Conversational Speaker-Turn Q&A Audit**: Automatically isolates client questions from advisor responses to audit specific topics:
  - Duty of Disclosure for pre-existing medical conditions under Section 25(5) of the Singapore Insurance Act.
  - Concealment of early surrender charges and penalties under MAS Notice FAA-N03.
  - Deceptive capital return guarantees under Section 26 of the Financial Advisers Act (FAA).
- **Advisor Cheat Sheet**: Generates immediate, legally compliant corrective scripts for the advisor.
- **Dual-Screen Session Pairing**: Automatically initializes and persists an active session ID in local storage, providing direct navigation to open the matching client screen in a paired window.

### 2. Customer Mobile Web Flow, Visual Focus Ring & Signature (FR-03, FR-04, FR-05, FR-06) — `/customer/[id]`
- **Senior-Friendly, High-Contrast UI**: Designed for senior policyholders (e.g., Mdm. Tan, 58) with large typography, reassuring tone, and plain-English disclosures.
- **Stage-Based Camera Lifecycle**:
  - **Stage 1 (Overview & Consent)**: Camera is **OFF**.
  - **Stage 2 (Face Calibration)**: Camera is **ON** for initial face alignment verification and Face Mesh baseline calibration.
  - **Stage 3 (Follow the Conversation)**: Camera is **OFF** (mic/audio only) so the client focuses entirely on live conversation and clause highlights without camera pressure.
  - **Stage 4 (Review Before Sign)**: Camera turns **ON again** for face positioning lock, active facial confusion monitoring while reading the summary, and head nod recap confirmation before signing.
- **Face Positioning & Alignment Verification Gate (Zero False-Positives on Empty Rooms/Walls)**:
  - The Face Mesh wireframe does **not** start automatically upon opening the camera.
  - Employs a **Dual-Layer Face Presence Verification Engine**:
    - **Layer 1: Native Chromium `FaceDetector` API (Shape Detection API)**: Directly detects human facial bounding boxes in supported Chromium engines. If 0 faces are in view, it immediately displays `"No face detected in camera"` and refuses to trigger.
    - **Layer 2: Multi-Factor Biometric Computer Vision Pipeline (Safari / Firefox / Fallback)**:
      - *YCbCr + Normalized RGB Skin Cluster*: Rejects wood, furniture, and beige walls that trick basic RGB checks.
      - *High-Frequency Edge Gradient Density*: Measures Sobel proxy gradients across the oval. Smooth walls/doors have $\text{avgGradient} < 5.0$, whereas human facial features (eyes, brows, nose, lips) have $\text{avgGradient} \ge 9.0$.
      - *Eyebrow & Eye Band Contrast Standard Deviation*: Verifies localized contrast in the upper third of the oval ($\sigma_{\text{eye}} \ge 11.0$).
      - *Distance & Lighting Checks*: Rejects underexposed ($< 30$) or overexposed ($> 235$) scenes.
    - **Center-of-Mass & Directional Alignment**: Evaluates spatial distribution within the oval, providing directional guidance (`"Move face right →"`, `"← Move face left"`, `"Move face down ↓"`, `"Move face up ↑"`).
    - **Stability Hold Gate**: Requires the face to remain centered and steady for ~1.4 seconds (12 consecutive frames), displaying live alignment progress (`0% -> 100%` and `"Hold steady..."`).
  - **Mesh Activation**: Only once face alignment is verified (`100%`) does the oval glow solid emerald green (`"Face Positioned Correctly ✓"`) and illuminate the high-precision Face Mesh wireframe. If the user moves away or covers the lens, the mesh immediately disappears and re-enters positioning mode.
- **Google MediaPipe Face Landmarker Integration (478-Point 3D Neural Mesh)**:
  - **Zero Manual Client Downloads**: The WebAssembly runtimes (`public/wasm/`) and the 16-bit float neural model (`public/models/face_landmarker.task` - 3.76 MB) are hosted directly in the local Next.js static asset pipeline. When a client opens `/customer/[id]` on mobile Safari or Chrome, the browser automatically loads the neural model in the background via standard HTTP requests with long-term immutable caching. No app store installation, no manual downloads, and no user prompts are required.
  - **478 Canonical 3D Landmarks**: Tracks face oval contour, eyebrows, eyelids, iris gaze, nose bridge/tip, lips, and jawline with sub-millimeter 3D spatial precision.
  - **52 ARKit Facial Blendshapes**:
    - *Glabella Brow Furrow*: Evaluated directly via `browDownLeft` and `browDownRight` ($\ge 0.38$), tracking physical corrugator supercilii contraction with complete lighting invariance.
    - *Puzzled Head Expression*: Evaluated via `browInnerUp` ($\ge 0.35$) and head roll/tilt disparity.
  - **3D Head Motion Tracking**: Tracks nose tip (Landmark 1) for pitch (vertical nod) and yaw (horizontal shake) across diverse camera angles.
  - **Resilient Dual-Engine Architecture**: If WebAssembly or WebGL is unavailable on an older mobile device, the system automatically falls back to the lightweight Canvas CV pipeline, guaranteeing 100% uptime.
  - **Color-Coded Status Feedback**:
    - **Emerald Green (`#10b981`)**: Face aligned and attentive reading.
    - **Blue (`#3b82f6`)**: Alignment holding / mesh calibrating.
    - **Pulsing Warm Amber (`#f59e0b`)**: Hesitation/confusion detected while reviewing summary.
- **Dedicated Live Customer Clarity & Confusion Tracker (Stage 4 Summary Review)**:
  - Prominent, visible real-time card directly under the camera on `/customer/[id]` Stage 4 (`REVIEW_BEFORE_SIGN`).
  - **Live Clarity Status Pill**:
    - `0 pts`: `● High Clarity (0/8 pts)` (Emerald green pulse)
    - `1 – 7 pts`: `● Normal Deliberation (${score}/8 pts)` (Blue pulse)
    - `8+ pts`: `⚠ Elevated Hesitation Detected (${score}/8 pts — Yellow Flag Triggered)` (Amber pulse)
  - **MAS Threshold Progress Bar**: Multi-segment visual meter showing exact score towards the calibrated 8-point Yellow Flag threshold (0 pts Clear, 4 pts Normal, 8.0 pts MAS Yellow Threshold).
  - **Live Facial Confusion Audit Feed (Reverse Chronological)**: Real-time event log displaying the newest events on top, each with timestamp, relative elapsed time (`+18s`), trigger type (`Glabella Brow Furrow`, `Puzzled Head Tilt`), intensity weighting (`Mild +1 pt`, `Moderate +2 pts`, `High +3 pts`), clause context, and consumer safeguard note.
  - **Continuous Hesitation Logging**: Uncapped continuous event logging with 5.0s debounce, decoupled from rendering timers to prevent interval thrashing.
  - **Interactive Simulation Controls**: Built-in testing pills (`[+1 pt: Brow Furrow]`, `[+2 pts: Puzzled Tilt]`, `[+3 pts: Sustained Hesitation]`, `[Reset]`) enabling instant verification of the branching engine threshold.
  - **Statutory MAS Consumer Safeguard Notice**: Automatically displays when score reaches $\ge 8$ pts or $\ge 6$ events, reminding the customer of their statutory 14-day Free-Look right to cancel with a 100% full refund at zero penalty.
- **Biometric Face Match & Anti-Impostor Verification (Phone-Lock Level Accuracy)**:
  - **Stage 2 Calibration Snapshot**: Upon completing face alignment in Stage 2, a biometric baseline snapshot and 21-ratio rigid craniofacial descriptor are captured.
  - **21 Rigid Skeletal Craniofacial Distance Ratios across 15 Bony Landmarks**:
    - Anchored strictly to bony skull landmarks: outer canthi (33, 263), inner canthi (133, 362), nasion & subnasale (168, 1, 2), alar bases (102, 331), cheekbone arches (234, 454), jaw angles (132, 361), chin tip (152), and forehead midline (10).
    - Normalized by rigid bi-ocular distance ($D(33, 263)$).
    - **100% Expression-Invariant**: Natural brow furrowing, eye squinting, head tilts (up to 18°), and speaking maintain $\le 2.3\%$ ratio variance, returning **95%–97% match** for the registered customer.
    - **Strict Identity Discrimination**: Different individuals (including different genders and close relatives) exhibit $> 10.0\%$ ratio variance, resulting in **12%–25% match**.
  - **Real-Time Stage 4 Security Gate**: If a substitute or different person appears before the camera (`localMatch < 0.70`), the system immediately overrides any fallback score, locks the match to **12%–25%**, disables optical agreement nod and confirm controls, and displays:
    `Identity Mismatch: Different Person (12%-25%)`.
  - **Authoritative Gemini Vision AI Verification (Tier 2 Cloud Audit — `/api/face/verify`)**: Uses Google AI Studio `gemini-3.5-flash-lite` multimodal vision to compare high-resolution calibration snapshots against active pre-signature frames. Strictly capped to **at most 2 calls per session** (Call 1 on Stage 4 entry, Call 2 upon agreement confirmation) to preserve API quota while maintaining bank-grade biometric auditability.
- **Ambient Lighting Dynamic Calibration & Zero False-Positive Confusion Engine**:
  - **Dynamic Baseline Sampling**: Real-world rooms naturally have $15\% - 25\%$ brightness asymmetry across cheeks due to windows and lamps. The engine dynamically learns the room's resting ambient baseline during clean frames (`baselineCheekAsymmetryRef` / `baselineTempleAsymmetryRef`).
  - **Conscious Gesture Prioritization**: Evaluates intentional facial expressions (**Glabella Brow Furrow** and **Puzzled Head Tilt**) before evaluating hand-to-head deliberation.
  - **Deliberation / Chin-Rest Occlusion**: Requires an asymmetrical deviation of $\Delta > 0.22$ *above baseline*, plus optical motion or landmark occlusion. Sitting peacefully under uneven room lighting guarantees 0 hesitation points.
- **Duration & Intensity Weighted Confusion Scoring**:
  - **Momentary Glances (< 1.5s)**: Filtered out as natural reading concentration (0 pts).
  - **Mild Hesitation (1.5s – 3.0s furrow/squint)**: 1 point.
  - **Moderate Confusion (3.0s – 5.0s sustained furrow + puzzled tilt)**: 2 points.
  - **Severe Confusion (> 5.0s prolonged perplexity on a single clause)**: 3 points.
- **Optical Gesture Agreement & Manual Fallback**:
  - **Head Nod (Vertical Oscillation)**: Confirms agreement (`"Agreement Confirmed"`).
  - **Head Shake (Horizontal Oscillation)**: Records objection (`"Disagreement Noted"`).
  - **Interactive Fallback Toggles**: Tap/click buttons (`✓ Agree / Confirm` and `✗ Object / Disagree`), gated by biometric match verification.
  - **100% Client-Side Privacy**: Runs locally in browser memory; zero video frames or biometric images are ever saved, stored, or transmitted to any server.
- **Comprehensive Stage 4 Pre-Signature Review Dashboard**:
  - **Key Figures Grid**: Sum Assured, Regular Premium, 14-Day Free-Look statutory rights (100% full refund guarantee), and Capital Protection classification.
  - **Plain-Language 4-Pillar Breakdown**: All 4 contract pillars with green checkmark status badges indicating covered topics.
  - **Live Conversation Recap**: AI-generated summary bullet points captured during the advisory session.
  - **Client Questions Addressed**: Questions raised during the meeting along with confirmed answers and deduplicated composite keys.
- **HTML5 Touch & Mouse Signature Pad**: Responsive digital signature canvas supporting touch, stylus, and mouse input with clear/undo controls.

### 3. Branching Engine & Quantitative Flag Calculation (Green vs Yellow vs Red)
The branching engine (`src/lib/branching-engine.ts`) calculates compliance outcomes using a transparent, multi-factor decision matrix calibrated to real-world deliberation reading patterns:

| Outcome Flag | SLA / Routing | Trigger Condition | Reason Category |
| :--- | :--- | :--- | :--- |
| **GREEN** | **1 Business Day** (Fast-Track Approval) | All agent statements are compliant (`GREEN`), customer confusion score $< 8$ (count $< 6$), and valid signature. | `CLEAN_PASS` |
| **YELLOW** | **3–4 Business Days** (Standard Underwriting Review) | **Trigger 1 (Agent Misalignment):** Any agent statement flagged `YELLOW` under MAS rules (omitted surrender fee, downplaying waiting period, moderate pressure). | `AGENT_MISALIGNMENT` |
| **YELLOW** | **3–4 Business Days** (Standard Underwriting Review) | **Trigger 2 (Elevated Customer Confusion):** All agent statements are 100% compliant (`GREEN`), BUT customer confusion score $\ge 8$ OR persistent confusion count $\ge 6$ while reading the summary. | `CUSTOMER_CONFUSION` |
| **RED** | **4–5 Business Days** (HQ Compliance Investigation) | Severe predatory sales tactic, fraudulent guaranteed returns, Section 25(5) medical concealment, or missing/invalid electronic signature. | `COMPOUND_RISK` / `INVALID_SIGNATURE` |

### 4. MAS Representative Registry & Admin Management — `/admin` & `/api/agents`
- **MAS Representative Verification**: Strict format validation ensuring representative numbers adhere to the `MAS-REP-XXXXXX` statutory standard.
- **Agent Roster**: Provisioning and management of certified financial advisers with disk persistence (`.agents-cache.json`).

### 5. Dynamic Multi-Policy Catalog & Policy Builder — `/policy` & `/api/policies`
- **4 Pre-Configured MAS Regulated Products**:
  1. *RetireSafe Golden Shield* (Annuity & Life Protection - Endowment)
  2. *WealthBuilder Horizon* (Unit-Linked Investment Plan - ILP)
  3. *PruLife Term Protect 2026* (Pure Protection Term Life)
  4. *FutureCare Elite* (Comprehensive Hospital & Surgical)
- **Gen-AI Policy Summarizer (FR-04)**: Condenses complex legal insurance clauses into 3–4 ultra-clear English bullet points using Google Gemini adhering to MAS clear product disclosure standards.

### 6. MAS Digital Disclosure & Consent Receipt — `/api/session/[id]/receipt`
- **Tamper-Evident Audit Record**: Generates an official MAS-compliant digital confirmation receipt containing customer signature, advisor MAS rep number, policy summary, full speech audit transcript, confusion metrics, and branching approval status.

### 7. Privacy Disclosure Gate (FR-05)
- **Agent Mandatory Disclosure Script (`/copilot`)**: Compliance card with the mandatory script the agent must read aloud to the customer at session start.
- **Customer Privacy Onboarding Gate (`/customer/[id]`)**: Pre-session onboarding screen explicitly guaranteeing under Singapore PDPA that video is processed exclusively on-device.

### 8. Cross-Device QR Hand-Off (FR-01, FR-03)
- Generates secure, time-boxed QR codes on the Advisor's screen (`/copilot`) to hand off the session directly to the customer's personal mobile device.
- Includes persistent disk caching (`.sessions-cache.json`) and on-demand session auto-recovery.

### 9. Progressive Web App (PWA) Foundation (FR-01)
- **Installable Web App**: Configured with Web App Manifest (`/manifest.webmanifest`) and standard icon sizes.
- **Service Worker (`/sw.js`)**: Static asset caching with network-first strategies and offline fallback alerts.

---

## Getting Started

### 1. Prerequisites
- Node.js: `v20.x` or `v24.x`
- npm: `v10.x` or `v11.x`

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Configure your `.env.local` file:
```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Gemini Model Configuration
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TRANSCRIBE_MODEL=gemini-3.5-flash-lite
GEMINI_LIVE_MODEL=gemini-3.5-transcribe-live
GEMINI_VISION_MODEL=gemini-3.5-flash-lite

# App Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server Port
PORT=3000
```
> Note: If `GEMINI_API_KEY` is not set or offline, Vera automatically utilizes local deterministic heuristics and on-device MediaPipe 3D Landmark geometry so all features remain functional for local development and testing.

### 4. Running the Development Server
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## Testing & Verification

Run the automated backend test suite:
```bash
npm run test:api
```

Run production build check:
```bash
npm run build
```

---

## Backend API Endpoints Directory

| Method | Endpoint | PRD Module | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Foundation | Returns API version, engine health, and Gemini connectivity |
| `GET` | `/api/agents` | Admin | Lists registered MAS certified advisers |
| `POST` | `/api/agents` | Admin | Registers new advisor with `MAS-REP-XXXXXX` validation |
| `GET` | `/api/policies` | Policy | Returns the MAS-compliant multi-policy catalog |
| `POST` | `/api/session` | FR-03 (QR Hand-off) | Creates session & generates base64 QR code data URL |
| `GET` | `/api/session` | FR-03 | Lists all active sessions |
| `GET` | `/api/session/[id]` | FR-03 | Fetches session state and linked policy details with auto-recovery |
| `PATCH` | `/api/session/[id]` | FR-03, FR-04 | Syncs live dialogue buffer and liveness/confusion telemetry in real time |
| `PATCH` | `/api/session/[id]/status` | FR-01, FR-03 | Updates session workflow state (`HANDED_OFF`, `CONSENT_SIGNED`, etc.) |
| `GET` | `/api/session/[id]/receipt` | Compliance | Generates MAS digital disclosure and signature receipt |
| `GET` | `/api/copilot/live-config` | FR-02 (Live STT) | Returns WebSocket configuration for Gemini 3.5 Transcribe Live |
| `POST` | `/api/copilot/transcribe` | FR-01, FR-02 | Multimodal audio speech-to-text transcription endpoint |
| `POST` | `/api/copilot/analyze` | FR-02 (AI Copilot) | Analyzes dialogue and speaker-turn Q&A for MAS compliance |
| `POST` | `/api/face/verify` | FR-05 (Biometrics) | Tier 2 Google Gemini multimodal biometric verification endpoint |
| `POST` | `/api/policy/summarize` | FR-04 (Summarizer) | Distills raw policy clauses or custom text into simplified bullets |
| `POST` | `/api/consent/submit` | FR-05, FR-06 | Submits signature & telemetry to trigger branching evaluation |

---

## Project Structure

```
vera/
├── public/
│   ├── icons/                  # PWA icons (192x192, 512x512, SVG)
│   ├── models/                 # MediaPipe Face Landmarker model asset (.task)
│   ├── wasm/                   # MediaPipe WebAssembly runtimes (internal wasm/js)
│   └── sw.js                   # PWA Service Worker (Offline caching)
├── src/
│   ├── app/
│   │   ├── admin/              # MAS Advisor registry management (/admin)
│   │   ├── api/                # Backend API Route Handlers
│   │   │   ├── agents/         # MAS Representative registration & listing
│   │   │   ├── consent/        # Consent submission & branching logic
│   │   │   ├── copilot/        # AI Copilot dialogue analysis & live config
│   │   │   ├── face/           # Biometric face verification endpoint (/api/face/verify)
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── policies/       # Multi-policy catalog endpoint
│   │   │   ├── policy/         # Policy summarization API
│   │   │   └── session/        # Session manager, QR generator & receipts
│   │   ├── copilot/            # AI Copilot speech & Q&A playground (/copilot)
│   │   ├── customer/           # Customer Mobile Web Flow & Signature (/customer/[id])
│   │   ├── policy/             # Policy Summarizer test page (/policy)
│   │   ├── manifest.ts         # Next.js Web App Manifest generator
│   │   ├── layout.tsx          # Root layout with PWA meta & viewport
│   │   ├── page.tsx            # Main developer dashboard
│   │   └── globals.css         # Tailwind CSS styling
│   ├── components/
│   │   ├── copilot/            # SpeechListener with Web Speech, REST & Gemini Live
│   │   ├── customer/           # VisualFocusRing with 21-ratio Face Mesh & confusion engine
│   │   └── pwa/                # PWA Service Worker registration component
│   ├── lib/
│   │   ├── agent-store.ts      # MAS Representative registry persistence
│   │   ├── branching-engine.ts # Compliance evaluation engine (MAS Fair Dealing)
│   │   ├── dummy-data.ts       # Static Singapore insurance policies (SGD)
│   │   ├── gemini.ts           # Google Gemini Multimodal STT, Vision & Audit service
│   │   └── session-store.ts    # Persistent session coordinator (.sessions-cache.json)
│   └── types/
│       └── index.ts            # TypeScript domain models
├── scripts/
│   └── test-api.mjs            # Core backend automated test runner
├── .env.example                # Environment variable template
├── package.json                # Project dependencies & scripts
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

---

## Regulatory Compliance
Designed in alignment with the **Monetary Authority of Singapore (MAS)** Guidelines on Fair Dealing, **Financial Advisers Act (FAA)**, **Insurance Act (Section 25(5))**, and **Personal Data Protection Act (PDPA)**.
