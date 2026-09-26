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
- **Advisor Authentication & Identity Locking (`/login`)**:
  - Secure login portal for authorized MAS-registered financial representatives (e.g. Andi Wijaya, Sarah Lim, Marcus Chen).
  - Self-registration is strictly disabled; advisor credentials and MAS representative numbers are verified and hardcoded in `AgentStore` (`/api/agents`).
  - Active advisor profile is locked to the session lifecycle, dynamically populating credentials across all customer touchpoints and audit certificates.
- **Session Dispatch & QR Hand-Off**:
  - Direct policy selection from the MAS-regulated catalog.
  - Instantly generates client pairing QR codes and secure, isolated mobile URLs (`/client/[id]`).
- **Live Consultation Room (`LiveConversation.tsx`)**:
  - Dual-panel interface with real-time speech transcription, policy clause bookmarks, and customer question tracking.
  - **Fluid Advisor Exit**: When the advisor completes the meeting, clicking **"End session"** runs the final compliance audit and immediately navigates back to `/sessions` with status `"Client reviewing"`—freeing the advisor while the customer reviews independently on mobile.
- **Session History & Compliance Audit Overview (`/sessions`, `/session/[id]`)**:
  - Displays real-time MAS Status badge, Biometric Identity Match percentage, and Customer Hesitation metrics.
  - One-click download of the official **Cryptographic MAS Audit Certificate** (`/api/audit/[sessionId]`) and plain-text advisory summary.

### 2. Isolated Customer Mobile Portal (`/client/[id]`)
- **Strict Portal Isolation**: Completely isolated from the advisor workspace with zero navigation links or backdoors to `/` or internal dashboards.
- **Stage-Based Biometric Consent Flow**:
  1. *Welcome & Camera Permissions*: Explains zero-video PDPA edge privacy guarantees.
  2. *Face Calibration*: Calibrates 478-point 3D facial mesh and captures rigid craniofacial baseline.
  3. *Attentive Reading & Summary Review*: Presents plain-language policy pillars and conversation summary while monitoring customer concentration.
  4. *Biometric Agreement & Identity Verification*: Verifies head nod gesture or fallback button confirmation, validating face match against initial calibration.
  5. *Digital Signature & Receipt*: HTML5 canvas signature recording with instant submission. Post-signing screen confirms completion and instructs the customer to safely close the tab.

### 3. Regulatory MAS Status Categorization & Dynamic Confusion Threshold
Vera's branching engine (`src/lib/branching-engine.ts`) enforces the Singapore MAS Guidelines on Fair Dealing using clear regulatory statuses and a dynamic, proportion-based hesitation threshold:

| MAS Display Status | Internal Code | Routing & Turnaround | Regulatory Trigger Condition |
| :--- | :--- | :--- | :--- |
| **`Approved`** | `GREEN` | **1 Business Day** (Fast-Track Underwriting) | Clean advisor dialogue, verified biometric liveness, and customer hesitation within the dynamic 30% threshold. |
| **`Flagged for Secondary Audit`** | `YELLOW` | **3–4 Business Days** (Central Underwriting Review) | **Trigger 1 (Advisor Misalignment):** Omitted surrender fee disclosure or moderate closing pressure.<br>**Trigger 2 (Elevated Confusion):** Clean advisor dialogue, but customer hesitation score exceeds the 30% dynamic threshold. |
| **`Compliance Risk`** | `RED` | **4–5 Business Days** (HQ Compliance Escalation) | Critical misrepresentation, Section 25(5) disclosure violation, or missing/invalid electronic consent signature. |

#### Dynamic Proportional Confusion Threshold:
Rather than a static cutoff, the hesitation threshold scales dynamically with the complexity and volume of discussed points:
$$\text{Total Points} = \text{Policy Summary Points} + \text{Discussion Points} + \text{Client Questions}$$
$$\text{Threshold Score} = \max\left(3, \operatorname{round}(\text{Total Points} \times 0.30)\right)$$
- If a consultation covers 10 touchpoints, the threshold is **3 weighted points** (30%).
- If an extensive meeting covers 16 touchpoints, the threshold scales to **5 weighted points** (30%), allowing natural reading deliberation on complex terms without triggering false-positive secondary audits.

### 4. Resilient Speech-to-Text Architecture
- **Primary Engine (Google Gemini 3.5 Flash-Lite)**: Cloud-based audio transcription via `/api/copilot/transcribe` utilizing low-latency audio chunking.
- **Resilient Fallback (Browser Web Speech API)**: If network interruptions or API rate limits occur, the system instantly and seamlessly fails over to the browser's native Web Speech API without dropping microphone capture.

### 5. Cryptographic MAS Audit Certificate (`/api/audit/[sessionId]`)
- Generates tamper-evident SHA-256 hashed certificates recording:
  - Advisor MAS representative registration number.
  - Plain-language policy summary and premium schedules.
  - Multi-turn speech audit log and speaker differentiation.
  - Edge biometric match score and hesitation timeline.
  - Regulatory statutory references (MAS Fair Dealing, FAA Section 26, Insurance Act Section 25(5), PDPA 2012).

### 6. Developer Console & Testbench (`/dev`, `/copilot`)
- Preserved developer workbench accessible at `/dev` and `/copilot` for live speech simulator pills, MediaPipe mesh inspection, agent roster editing, and manual state overrides.

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
| `PATCH` | `/api/session/[id]/status` | FR-01, FR-03 | Updates session workflow state (`HANDED_OFF`, `CUSTOMER_REVIEWING`, `CONSENT_SIGNED`, etc.) |
| `GET` | `/api/session/[id]/receipt` | Compliance | Generates MAS digital disclosure and signature receipt |
| `GET` | `/api/audit/[sessionId]` | Compliance | Generates tamper-evident SHA-256 cryptographic MAS compliance certificate |
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
│   ├── icon.svg                # Application branding icon
│   └── sw.js                   # PWA Service Worker (Offline caching)
├── src/
│   ├── app/
│   │   ├── login/              # Advisor authentication gate (/login)
│   │   ├── client/[id]/        # Isolated customer mobile consent flow (/client/[id])
│   │   ├── sessions/           # Past sessions queue & audit history (/sessions)
│   │   ├── session/[id]/       # Completed compliance inspection & certificate download (/session/[id])
│   │   ├── dev/                # Preserved developer testbench & raw engine tools (/dev)
│   │   ├── copilot/            # AI Copilot speech & Q&A playground (/copilot)
│   │   ├── customer/[id]/      # Legacy customer mobile test page (/customer/[id])
│   │   ├── admin/              # MAS Advisor registry management (/admin)
│   │   ├── policies/           # Regulated insurance policy catalog (/policies)
│   │   ├── guide/              # Advisor onboarding and compliance instructions (/guide)
│   │   ├── api/                # Backend API Route Handlers
│   │   │   ├── agents/         # MAS Representative registration & listing
│   │   │   ├── audit/          # Cryptographic MAS Audit Certificate generator
│   │   │   ├── consent/        # Consent submission & branching logic
│   │   │   ├── copilot/        # AI Copilot dialogue analysis & transcription
│   │   │   ├── face/           # Biometric face verification endpoint
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── policies/       # Multi-policy catalog endpoint
│   │   │   ├── policy/         # Policy summarization API
│   │   │   └── session/        # Session manager, QR generator & receipts
│   │   ├── manifest.ts         # Next.js Web App Manifest generator
│   │   ├── layout.tsx          # Root layout with PWA meta & viewport
│   │   ├── page.tsx            # Main financial advisor workspace (/)
│   │   └── globals.css         # Refreshed design system & styling
│   ├── components/
│   │   ├── workspace/          # Refreshed UI: Workspace, LiveConversation, SessionHistory, ClientExperience
│   │   ├── copilot/            # SpeechListener with Gemini 3.5 Flash-Lite & Web Speech fallback
│   │   ├── customer/           # VisualFocusRing with 21-ratio Face Mesh & confusion engine
│   │   └── pwa/                # PWA Service Worker registration component
│   ├── lib/
│   │   ├── agent-store.ts      # MAS Representative registry persistence
│   │   ├── branching-engine.ts # Compliance evaluation engine (30% dynamic confusion threshold)
│   │   ├── dummy-data.ts       # Static Singapore insurance policies (SGD)
│   │   ├── frontend-demo.ts    # Presentation adapters and formatters
│   │   ├── gemini.ts           # Google Gemini Multimodal STT, Vision & Audit service
│   │   └── session-store.ts    # Persistent session coordinator (.sessions-cache.json)
│   └── types/
│       └── index.ts            # TypeScript domain models (MAS status labels, telemetry)
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
