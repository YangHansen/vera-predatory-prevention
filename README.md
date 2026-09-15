# Vera — AI-Powered Insurance Consent & Mis-selling Prevention

> **Project ID:** VERA-MVP-2026  
> **Regulatory Standards:** Monetary Authority of Singapore (MAS) Guidelines on Fair Dealing • Financial Advisers Act (FAA) • Insurance Act (Section 25(5)) • Singapore PDPA  
> **Tech Stack:** Next.js 15 (App Router) • React 19 • TypeScript • Tailwind CSS • Google Gemini 3.5 Flash / Flash-Lite • Progressive Web App (PWA)

---

## About Vera

Vera is a B2B SaaS platform designed to eliminate predatory insurance sales tactics and guarantee genuine "Informed Consent" in financial advisory meetings under Singapore regulatory standards (MAS Fair Dealing Guidelines).

By pairing a real-time AI Sales Copilot for financial advisors with an accessible, high-contrast Customer Mobile Interface for senior and vulnerable consumers (e.g., Mdm. Tan), Vera bridges the transparency gap without slowing down advisory closing workflows.

---

## Implemented Modules & Features

### 1. AI Sales Copilot & Speech Mis-selling Detector (FR-02) — `/copilot`
- **Advisor Real-Time HUD**: Real-time compliance monitoring interface designed for field financial advisors (Advisor Andi, FC-1092).
- **Dual STT Speech Recognition Architecture**:
  - **Browser Web Speech API (`webkitSpeechRecognition`)**: Default client-side real-time speech listener with zero Google AI Studio token consumption.
  - **Google Gemini Cloud AI STT**: Multimodal audio transcription processing 16kHz mono PCM WAV slices with Voice Activity Detection (VAD).
- **Quick Speech Simulation Pills**: One-click speech simulator actions for rapid demonstration without audio hardware:
  - `[Speak: Waiting Period (Clause 4)]`
  - `[Speak: Surrender Penalty (Clause 3)]`
  - `[Speak: Annuity at 62 (Clause 1)]`
  - `[Speak: Section 25(5) Disclosure]`
  - `[Clear (Silent Mode)]`
- **Engine Source Provenance Transparency**: Real-time badge on the HUD indicating whether an audit was evaluated by **`Google Gemini Cloud (Live GenAI)`** or **`Vera MAS Compliance Rules Engine (Offline Fallback)`**.
- **60-Second Auto-Audit Batch Timer**: Automatically audits accumulated dialogue every 60 seconds or on demand.
- **MAS Compliance Categorization**: Flags advisory conduct as Green (Compliant), Yellow (Advisory Warning / Disclosure Omission), or Red (Severe Predatory Tactic / Misleading Guarantees).
- **Conversational Speaker-Turn Q&A Audit**: Automatically isolates client questions from advisor responses to audit specific topics:
  - Duty of Disclosure for pre-existing medical conditions under Section 25(5) of the Singapore Insurance Act.
  - Concealment of early surrender charges and penalties under MAS Notice FAA-N03.
  - Deceptive capital return guarantees under Section 26 of the Financial Advisers Act (FAA).
- **Advisor Cheat Sheet**: Generates immediate, legally compliant corrective scripts for the advisor.
- **Dual-Screen Session Pairing**: Automatically initializes and persists an active session ID in local storage, providing direct navigation to open the matching client screen in a paired window.

### 2. Customer Mobile Web Flow, Visual Focus Ring & Signature (FR-03, FR-04, FR-05, FR-06) — `/customer/[id]`
- **Senior-Friendly, High-Contrast UI**: Designed for senior policyholders (e.g., Mdm. Tan, 58) with large typography and plain-English disclosures.
- **Visual Focus & Facial Clarity Ring (Edge AI / Optical Reaction)**:
  - Mirrored front-camera ring with dynamic optical feedback border (glowing emerald for attentive reading, warm pulsing amber for attention prompts, and soft blue for confusion/hesitation).
  - **Dynamic Baseline Calibration**: Calibrates resting glabella/forehead contrast over initial frames to eliminate false positives on resting faces.
  - Detects face presence, frame boundary centering, gaze alignment, corrugator brow furrowing, and puzzled head tilts (`headTilt > 0.34`).
  - **100% Client-Side Privacy**: Runs locally in memory; zero video frames or biometric images are ever recorded, stored, or transmitted to any server.
- **Speech-Time Correlated Confusion & Hesitation Timeline (FR-03, FR-04)**:
  - Automatically records timestamped confusion events with meeting elapsed time (`mm:ss`), trigger gesture, active discussion topic, the exact spoken words at that second, and plain-English statutory clarification notes.
  - Displays *"Silent self-review of policy terms (No active speech from advisor at this moment)"* when mic is idle.
- **Live Advisory Compliance Safeguard Card**: Alerts the customer if predatory claims, false return guarantees, or health omission advice are detected during the advisory pitch, explaining their legal protections under the Singapore Insurance Act and MAS Fair Dealing.
- **Real-Time Dynamic Clause Highlighting**: Mirrors the advisor's active discussion topic in real time, applying gold glow highlights and badges to matching policy clauses.
- **Running Conversation Summary & Customer Raised Concerns Feed (FR-04)**: Dynamic real-time feed recording and displaying every question or objection raised by the customer, pairing each with the advisor's confirmed answer and MAS compliance status before digital signing.
- **Simplified Policy Disclosures**: Displays guaranteed protection amounts (SGD), regular premium schedules, and 3–4 simplified summary bullets.
- **Consumer Safeguards Callouts**: Highlights statutory protections including the 14-day Free-Look refund window, the 12-month pre-existing illness moratorium, and early surrender deductions.
- **HTML5 Touch & Mouse Signature Pad**: Responsive digital signature canvas supporting touch, stylus, and mouse input with clear/undo controls.
- **Instant Branching Outcome Screen**:
  - **Fast-Track Approval (1 Business Day SLA)**: Issued when advisory audio audit is clean and informed consent is verified.
  - **Queued for Compliance Review (3–4 Business Days SLA)**: Triggered if audio audit warnings or confusion events were recorded, providing clear customer reassurance that funds are not deducted until review completes.

### 3. Gen-AI Policy Summarizer (FR-04) — `/policy`
- **Clause Simplification**: Condenses complex legal insurance clauses into 3–4 ultra-clear English bullet points using Google Gemini adhering to MAS clear product disclosure standards.
- **Interactive Playground**: Test predefined Singapore policies (RetireSafe Annuity, FutureCare Elite in SGD) or paste custom raw legal clauses to test distillation.

### 4. Privacy Disclosure Gate (FR-05)
- **Agent Mandatory Disclosure Script (`/copilot`)**: A structured compliance card with the mandatory script the agent must read aloud to the customer at the start of the meeting, confirming real-time audio auditing and guaranteeing client-side video privacy.
- **Customer Privacy Onboarding Gate (`/customer/[id]`)**: A pre-session onboarding screen on the customer's phone explicitly guaranteeing under Singapore PDPA that *"Video is processed on your device and never saved"* before granting camera access for the visual focus ring.

### 5. Cross-Device QR Hand-Off (FR-01, FR-03)
- Generates secure, time-boxed QR codes on the Advisor's screen (`/copilot`) to hand off the session directly to the customer's personal mobile device.
- Includes persistent disk caching (`.sessions-cache.json`) and on-demand session auto-recovery so links never expire unexpectedly.

### 6. Progressive Web App (PWA) Foundation (FR-01)
- **Installable Web App**: Configured with Web App Manifest (`/manifest.webmanifest`) and standard icon sizes.
- **Service Worker (`/sw.js`)**: Static asset caching with network-first strategies.
- **Automatic Offline Mode**: Displays an interactive offline notification when network connectivity drops.

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
GEMINI_TRANSCRIBE_MODEL=gemini-3.5-flash

# App Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server Port
PORT=3000
```
> Note: If `GEMINI_API_KEY` is not set or offline, Vera automatically falls back to deterministic rule-based mock heuristics so all features remain functional for local testing.

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
| `POST` | `/api/session` | FR-03 (QR Hand-off) | Creates session & generates base64 QR code data URL |
| `GET` | `/api/session` | FR-03 | Lists all active sessions |
| `GET` | `/api/session/[id]` | FR-03 | Fetches session state and linked policy details with auto-recovery |
| `PATCH` | `/api/session/[id]` | FR-03, FR-04 | Syncs live dialogue buffer and liveness/confusion telemetry in real time |
| `PATCH` | `/api/session/[id]/status` | FR-01, FR-03 | Updates session workflow state (`HANDED_OFF`, `CONSENT_SIGNED`, etc.) |
| `POST` | `/api/copilot/transcribe` | FR-01, FR-02 | Multimodal audio speech-to-text transcription endpoint |
| `POST` | `/api/copilot/analyze` | FR-02 (AI Copilot) | Analyzes dialogue and speaker-turn Q&A for MAS compliance |
| `POST` | `/api/policy/summarize` | FR-04 (Summarizer) | Distills raw policy clauses or custom text into simplified bullets |
| `POST` | `/api/consent/submit` | FR-05, FR-06 | Submits signature & telemetry to trigger branching evaluation |

---

## Project Structure

```
vera/
├── public/
│   ├── icons/                  # PWA icons (192x192, 512x512, SVG)
│   └── sw.js                   # PWA Service Worker (Offline caching)
├── src/
│   ├── app/
│   │   ├── api/                # Backend API Route Handlers
│   │   │   ├── consent/        # Consent submission & branching logic
│   │   │   ├── copilot/        # AI Copilot dialogue analysis & transcription
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── policy/         # Policy summarization API
│   │   │   └── session/        # Session manager & QR generator
│   │   ├── copilot/            # AI Copilot speech & Q&A playground (/copilot)
│   │   ├── customer/           # Customer Mobile Web Flow & Signature (/customer/[id])
│   │   ├── policy/             # Policy Summarizer test page (/policy)
│   │   ├── manifest.ts         # Next.js Web App Manifest generator
│   │   ├── layout.tsx          # Root layout with PWA meta & viewport
│   │   ├── page.tsx            # Main developer dashboard
│   │   └── globals.css         # Tailwind CSS styling
│   ├── components/
│   │   ├── copilot/            # SpeechListener with continuous Web Audio PCM
│   │   ├── customer/           # VisualFocusRing with dynamic optical feedback
│   │   └── pwa/                # PWA Service Worker registration component
│   ├── lib/
│   │   ├── branching-engine.ts # Compliance evaluation engine (MAS Fair Dealing)
│   │   ├── dummy-data.ts       # Static Singapore insurance policies (SGD)
│   │   ├── gemini.ts           # Google Gemini Multimodal STT & Audit service
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
