# Vera — AI-Powered Insurance Consent & Mis-selling Prevention

> **Project ID:** VERA-MVP-2026  
> **Regulatory Standards:** Monetary Authority of Singapore (MAS) Guidelines on Fair Dealing • Financial Advisers Act (FAA) • Insurance Act (Section 25(5)) • Singapore PDPA  
> **Tech Stack:** Next.js 15 (App Router) • React 19 • TypeScript • Tailwind CSS • Google MediaPipe Face Landmarker (WASM) • Google Gemini 3.5 Flash-Lite / 3.5 Transcribe Live • Progressive Web App (PWA)

---

## About Vera

Vera is a B2B SaaS compliance platform designed to eliminate predatory insurance sales tactics and guarantee genuine "Informed Consent" in financial advisory meetings under Singapore regulatory standards (MAS Fair Dealing Guidelines).

By pairing a real-time AI Sales Copilot for financial advisors with an accessible, high-contrast Customer Mobile Interface for senior and vulnerable consumers (e.g., Mdm. Tan), Vera bridges the transparency gap without slowing down advisory closing workflows.

---

## Implemented Modules & Architecture

### 1. Refreshed Financial Advisor Workspace (`/`, `/sessions`, `/session/[id]`)
- **Advisor Authentication & Device Terminal Lock (`/login`, `/dev`)**:
  - Secure login portal for authorized MAS-registered financial representatives (`Andi Wijaya, ChFC`, `Sarah Lim, CFP`, `Marcus Chen`, `Rachel Koh, CFP`).
  - Self-registration is strictly disabled; advisor credentials and MAS representative numbers (`MAS-REP-XXXXXX`) are verified and persisted in `AgentStore`.
  - **Device Terminal Lock**: To satisfy MAS market conduct requirements (Notice FAA-N03), the active advisor account is locked to the physical terminal. In-app account switching is restricted; administrators and developers can reassign device profiles via the dedicated **Device Agent Switcher** on `/dev`.
  - **Strict Session Isolation**: Multi-agent segregation ensures advisors only view, create, and audit their own assigned client sessions (`/api/session?agentId=...`).
- **Session Dispatch & QR Hand-Off**:
  - Direct policy selection from the MAS-regulated catalog.
  - Instantly generates client pairing QR codes and secure, isolated mobile URLs (`/client/[id]`).
- **Live Consultation Room & Continuous Recording (`LiveConversation.tsx`)**:
  - Dual-panel interface with real-time speech transcription, policy clause bookmarks, and customer question tracking.
  - **Resilient Multi-Session Resumption**: If an advisor temporarily navigates back to `/sessions`, in-flight speech buffers are automatically flushed and preserved. Upon returning, previous transcripts and elapsed timers reload seamlessly with a **"Resume"** recording action.
  - **Fluid Advisor Exit**: When the meeting concludes, clicking **"End conversation"** triggers the final compliance audit and transitions the session to `"Client reviewing"`, allowing the customer to review independently on mobile.
- **Session History & Compliance Audit Overview (`/sessions`, `/session/[id]`)**:
  - Displays real-time MAS Status badges, Biometric Identity Match percentage, and Customer Hesitation metrics.
  - Generates tamper-evident **MAS Compliance Certificates** (`/api/audit/[sessionId]`) and plain-text advisory summaries.

### 2. Isolated Customer Mobile Portal (`/client/[id]`)
- **Strict Portal Isolation**: Completely isolated from the advisor workspace with zero navigation links or backdoors to internal dashboards.
- **Dynamic Advisor Prompts**: All client instructions, policy pillar descriptions, and question cards dynamically adapt to the assigned advisor's identity (e.g., *"Ask Sarah if you would like this explained"*).
- **High-Contrast Face Alignment & Helping Lines**:
  - High-visibility SVG face oval guide with corner alignment brackets, dark drop-shadows, and dynamic color progression (dashed white $\rightarrow$ pulsing blue $\rightarrow$ solid emerald green upon alignment).
  - Mirror-corrected horizontal directional prompts (`"← Move face left"`, `"Move face right →"`) for effortless positioning.
- **Stage-Based Biometric Consent Flow**:
  1. *Welcome & Camera Permissions*: Explains zero-video PDPA edge privacy guarantees.
  2. *Face Calibration*: Calibrates 478-point 3D facial mesh and captures rigid craniofacial baseline.
  3. *Attentive Reading & Summary Review*: Presents plain-language policy pillars and conversation summary while monitoring customer concentration.
  4. *Biometric Agreement & Identity Verification*: Verifies head nod gesture or fallback confirmation button, validating biometric face match against initial calibration.
  5. *Digital Signature & Receipt*: HTML5 canvas signature recording with instant submission and post-signing confirmation.

### 3. MAS Status Categorization & Weighted Touchpoint Engine
Vera's branching engine (`src/lib/branching-engine.ts`) evaluates advisory sessions against Singapore MAS Guidelines on Fair Dealing using dynamic weighted touchpoints and an automated Self-Correction Protocol:

| MAS Display Status | Internal Code | Routing & Turnaround | Regulatory Trigger Condition |
| :--- | :--- | :--- | :--- |
| **`Approved`** | `GREEN` | **1 Business Day** (Fast-Track Underwriting) | Clean advisor dialogue, verified biometric liveness, and customer hesitation within the dynamic 30% threshold. |
| **`Flagged for Secondary Audit`** | `YELLOW` | **2–4 Business Days** (Central Underwriting Review) | **Trigger 1 (Advisor Misalignment):** Omitted surrender fee disclosure or moderate closing pressure.<br>**Trigger 2 (Elevated Confusion):** Customer hesitation score exceeds the 30% dynamic threshold.<br>**Trigger 3 (Rectified Misstatement):** Advisor initially uttered a non-compliant statement but proactively acknowledged and cured it during the meeting. |
| **`Compliance Risk`** | `RED` | **4–5 Business Days** (HQ Compliance Escalation) | Unrectified critical misrepresentation, Section 25(5) non-disclosure violation, or missing/invalid electronic consent signature. |

#### A. Weighted Touchpoints Formulation
Rather than an unweighted count, total touchpoints scale proportionally based on the cognitive complexity of each discussion area:
- **Policy Clauses / Pillars**: **3 touchpoints** each ($\text{clauses} \times 3$)
- **Conversation Summary Points**: **2 touchpoints** each ($\text{summary} \times 2$)
- **Client Questions Raised**: **3 touchpoints** each ($\text{questions} \times 3$)
- **Proactive Rectification Turns**: **+2 bonus touchpoints**

$$\text{Total Points} = (\text{Clauses} \times 3) + (\text{Summary Points} \times 2) + (\text{Questions} \times 3) + (\text{Rectifications} \times 2)$$

$$\text{Threshold Score} = \max\left(3, \operatorname{round}(\text{Total Points} \times 0.30)\right)$$

*Example*: A standard session covering 4 policy clauses, 5 conversation summary points, and 1 client question yields $12 + 10 + 3 = \mathbf{25\text{ weighted touchpoints}}$. The 30% hesitation threshold is $\mathbf{8\text{ points}}$, perfectly matching the 8-point deliberation meter displayed on the client interface.

#### B. Self-Corrected Predatory Selling & Rectification Protocol
To encourage honest self-correction without compromising consumer protection:
- **Active Uncured `RED`**: Remains a hard **`RED`** compliance risk.
- **Proactively Cured `RED`**: If an advisor makes a non-compliant statement (e.g. inaccurate return guarantee or downplayed surrender charge) but later explicitly acknowledges the mistake, apologizes, and provides accurate statutory terms before consent is executed:
  - The AI Copilot detects the retraction and marks `rectification: { isRectified: true }`.
  - The branching engine downgrades the outcome from `RED` to **`YELLOW`** (`AGENT_RECTIFIED_MISALIGNMENT`) with an expedited 2-day review queue.
  - The MAS Audit Certificate logs a transparent audit trail with before-and-after timestamps, giving underwriters clear visibility of the cure.

### 4. Resilient Speech-to-Text Architecture
- **Primary Engine (Google Gemini 3.5 Flash-Lite)**: Cloud-based audio transcription via `/api/copilot/transcribe` utilizing low-latency audio chunking.
- **Resilient Fallback (Browser Web Speech API)**: Seamless failover to browser-native Web Speech API during network interruptions or API limits without dropping mic audio.

### 5. Cryptographic MAS Audit Certificate (`/api/audit/[sessionId]`)
- Generates tamper-evident SHA-256 hashed certificates recording:
  - Advisor MAS representative registration number.
  - Plain-language policy summary and premium schedules.
  - Multi-turn speech audit log and speaker differentiation.
  - Edge biometric match score and hesitation timeline.
  - Proactive self-correction audit trail (if applicable).
  - Regulatory statutory references (MAS Fair Dealing, FAA Section 26, Insurance Act Section 25(5), PDPA 2012).

### 6. Developer Console & Testbench (`/dev`, `/copilot`)
- Preserved developer workbench accessible at `/dev` and `/copilot` for live speech simulation, MediaPipe mesh inspection, master device advisor reassignment, and manual state overrides.

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

Run the comprehensive frontend and multi-agent integration test suite:
```bash
node scripts/test-frontend-integration.cjs
```

Run production type-checking and build check:
```bash
npx tsc --noEmit
npm run build
```

---

## Backend API Endpoints Directory

| Method | Endpoint | PRD Module | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Foundation | Returns API version, engine health, and Gemini connectivity |
| `GET` | `/api/agents` | Admin | Lists registered MAS certified advisers (with search/agentId filter) |
| `POST` | `/api/agents` | Admin | Registers new advisor with `MAS-REP-XXXXXX` validation |
| `DELETE` | `/api/agents/[id]` | Admin | Deletes provisioned non-seed advisor accounts |
| `GET` | `/api/policies` | Policy | Returns the MAS-compliant multi-policy catalog |
| `POST` | `/api/session` | FR-03 (QR Hand-off) | Creates session & generates base64 QR code data URL |
| `GET` | `/api/session` | FR-03 | Lists sessions filtered by agent ID (`?agentId=...`) |
| `GET` | `/api/session/[id]` | FR-03 | Fetches session state and linked policy details with auto-recovery |
| `PATCH` | `/api/session/[id]` | FR-03, FR-04 | Syncs live dialogue buffer and liveness/confusion telemetry in real time |
| `PATCH` | `/api/session/[id]/status` | FR-01, FR-03 | Updates session workflow state (`HANDED_OFF`, `CUSTOMER_REVIEWING`, `CONSENT_SIGNED`, etc.) |
| `GET` | `/api/session/[id]/receipt` | Compliance | Generates MAS digital disclosure and signature receipt |
| `GET` | `/api/audit/[sessionId]` | Compliance | Generates tamper-evident SHA-256 cryptographic MAS compliance certificate |
| `GET` | `/api/copilot/live-config` | FR-02 (Live STT) | Returns WebSocket configuration for Gemini 3.5 Transcribe Live |
| `POST` | `/api/copilot/transcribe` | FR-01, FR-02 | Multimodal audio speech-to-text transcription endpoint |
| `POST` | `/api/copilot/analyze` | FR-02 (AI Copilot) | Analyzes dialogue and speaker-turn Q&A for MAS compliance & rectification |
| `POST` | `/api/face/verify` | FR-05 (Biometrics) | Tier 2 Google Gemini multimodal biometric verification endpoint |
| `POST` | `/api/policy/summarize` | FR-04 (Summarizer) | Distills raw policy clauses or custom text into simplified bullets |
| `POST` | `/api/consent/submit` | FR-05, FR-06 | Submits signature & telemetry to trigger branching evaluation |

---

## Project Structure

```
vera/
├── docs/                       # Architecture documentation & design handoffs
│   ├── backend-frontend-integration.md
│   ├── frontend-refresh.md
│   └── ux-research-handoff.md
├── public/
│   ├── icons/                  # PWA icons (192x192, 512x512, maskable, SVG)
│   ├── models/                 # MediaPipe Face Landmarker model asset (.task)
│   ├── wasm/                   # MediaPipe WebAssembly runtimes (internal wasm/js)
│   ├── icon.svg                # Application branding icon
│   ├── vera-logo.svg           # Vera vector logo
│   └── sw.js                   # PWA Service Worker (offline caching)
├── src/
│   ├── app/
│   │   ├── login/              # Advisor authentication gate (/login)
│   │   ├── client/[id]/        # Isolated customer mobile consent flow (/client/[id])
│   │   ├── sessions/           # Past sessions queue & audit history (/sessions)
│   │   ├── session/[id]/       # Completed compliance inspection & certificate download (/session/[id])
│   │   ├── dev/                # Preserved developer testbench & raw engine tools (/dev)
│   │   ├── copilot/            # AI Copilot speech & Q&A playground (/copilot)
│   │   ├── customer/[id]/      # Legacy customer mobile test page (/customer/[id])
│   │   ├── admin/agents/       # MAS Advisor registry management (/admin/agents)
│   │   ├── agent/              # Advisor preview & invitation flows (/agent/[id]/invite)
│   │   ├── policies/           # Regulated insurance policy catalog (/policies)
│   │   ├── policy/             # Policy inspection & clause details (/policy)
│   │   ├── guide/              # Advisor onboarding and compliance instructions (/guide)
│   │   ├── api/                # Backend API Route Handlers
│   │   │   ├── agents/         # MAS Representative registration, listing & deletion
│   │   │   ├── audit/          # Cryptographic MAS Audit Certificate generator
│   │   │   ├── consent/        # Consent submission & branching logic
│   │   │   ├── copilot/        # AI Copilot dialogue analysis & live STT configuration
│   │   │   ├── face/           # Biometric face verification endpoint (Tier 2 Gemini)
│   │   │   ├── health/         # System & AI health check endpoint
│   │   │   ├── policies/       # Multi-policy catalog endpoint
│   │   │   ├── policy/         # Policy summarization API
│   │   │   └── session/        # Session coordinator, QR generator, status & receipts
│   │   ├── manifest.ts         # Next.js Web App Manifest generator
│   │   ├── layout.tsx          # Root layout with PWA meta & viewport
│   │   ├── page.tsx            # Main financial advisor workspace (/)
│   │   └── globals.css         # Refreshed design system & styling
│   ├── components/
│   │   ├── workspace/          # Workspace, LiveConversation, SessionHistory, ClientExperience, CameraPreview
│   │   ├── copilot/            # SpeechListener with Gemini 3.5 Flash-Lite & Web Speech fallback
│   │   ├── customer/           # VisualFocusRing with 21-ratio Face Mesh & confusion engine
│   │   ├── dev/                # DeviceAgentSwitcher for terminal binding & developer control
│   │   └── pwa/                # PWA Service Worker registration component
│   ├── lib/
│   │   ├── agent-store.ts      # MAS Representative registry persistence (.agents-cache.json)
│   │   ├── branching-engine.ts # Compliance evaluation engine (weighted touchpoints & dynamic threshold)
│   │   ├── dummy-data.ts       # Static Singapore insurance policies catalog (SGD)
│   │   ├── frontend-demo.ts    # Presentation adapters, session bridges & formatters
│   │   ├── gemini.ts           # Google Gemini Multimodal STT, Vision, Self-Correction & Audit service
│   │   └── session-store.ts    # Persistent session coordinator (.sessions-cache.json)
│   └── types/
│       └── index.ts            # TypeScript domain models (MAS status labels, telemetry, rectifications)
├── scripts/
│   ├── test-frontend-integration.cjs # Comprehensive end-to-end integration test runner
│   └── test-api.mjs            # Core backend automated test runner
├── .env.example                # Environment variable template
├── package.json                # Project dependencies & scripts
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

---

## Regulatory Compliance
Designed in alignment with the **Monetary Authority of Singapore (MAS)** Guidelines on Fair Dealing, **Financial Advisers Act (FAA)**, **Insurance Act (Section 25(5))**, and **Personal Data Protection Act (PDPA)**.

