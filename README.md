# Vera — AI-Powered Insurance Consent & Mis-selling Prevention

> **Project ID:** VERA-MVP-2026  
> **Regulatory Standards:** Monetary Authority of Singapore (MAS) Guidelines on Fair Dealing • Financial Advisers Act (FAA) • Insurance Act (Section 25(5)) • Singapore PDPA  
> **Tech Stack:** Next.js 15 (App Router) • React 19 • TypeScript • Tailwind CSS • Google Gemini 3.5 Flash-Lite / 3.5 Transcribe Live • Progressive Web App (PWA)

---

## About Vera

Vera is a B2B SaaS compliance platform designed to eliminate predatory insurance sales tactics and guarantee genuine "Informed Consent" in financial advisory meetings under Singapore regulatory standards (MAS Fair Dealing Guidelines).

By pairing a real-time AI Sales Copilot for financial advisors with an accessible, high-contrast Customer Mobile Interface for senior and vulnerable consumers (e.g., Mdm. Tan), Vera bridges the transparency gap without slowing down advisory closing workflows.

---

## Implemented Modules & Features

### 1. AI Sales Copilot & Speech Mis-selling Detector (FR-02) — `/copilot`
- **Advisor Real-Time HUD**: Real-time compliance monitoring interface designed for field financial advisors (Advisor Andi, FC-1092).
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
- **Senior-Friendly, High-Contrast UI**: Designed for senior policyholders (e.g., Mdm. Tan, 58) with large typography and plain-English disclosures.
- **Multi-Stage Customer Journey with Bidirectional Navigation**:
  - **Stage 1 (Overview & Consent)**: Policy high-level summary and privacy agreement.
  - **Stage 2 (Face Calibration)**: Camera alignment and baseline calibration with back-navigation to Stage 1.
  - **Stage 3 (Live Conversation)**: Real-time discussion tracker and active clause highlighting with back-navigation to Stage 2.
  - **Stage 4 (Review Before Sign)**: Comprehensive pre-signature review dashboard with back-navigation to Stage 3.
- **Visual Focus & Optical Agreement Ring (Edge AI / Frame Differencing)**:
  - Mirrored front-camera ring with dynamic optical feedback border (glowing emerald for attentive reading, warm pulsing amber for attention prompts, and soft blue for confusion/hesitation).
  - **Optical Motion Differencing (Cross-Browser)**: Frame-by-frame canvas differencing calculating centroid oscillation:
    - **Head Nod (Vertical Oscillation)**: Automatically confirms agreement (`"Agreement Confirmed"`).
    - **Head Shake (Horizontal Oscillation)**: Automatically detects hesitation/objection (`"Disagreement Noted"`).
  - **Interactive Fallback Toggles**: Click/touch buttons (`✓ Agree / Confirm` and `✗ Object / Disagree`) for instant user control.
  - **100% Client-Side Privacy**: Runs locally in memory; zero video frames or biometric images are ever recorded, stored, or transmitted to any server.
- **Comprehensive Stage 4 Pre-Signature Review Dashboard**:
  - **Key Figures Grid**: Sum Assured, Regular Premium, 14-Day Free-Look statutory rights (100% full refund guarantee), and Capital Protection classification.
  - **Plain-Language 4-Pillar Breakdown**: All 4 contract pillars with green checkmark status badges indicating covered topics.
  - **Live Conversation Recap**: AI-generated summary bullet points captured during the advisory session.
  - **Client Questions Addressed**: Questions raised during the meeting along with confirmed answers.
- **Speech-Time Correlated Confusion & Hesitation Timeline (FR-03, FR-04)**:
  - Automatically records timestamped confusion events with meeting elapsed time (`mm:ss`), trigger gesture, active discussion topic, the exact spoken words at that second, and plain-English statutory clarification notes.
- **Live Advisory Compliance Safeguard Card**: Alerts the customer if predatory claims, false return guarantees, or health omission advice are detected during the advisory pitch.
- **HTML5 Touch & Mouse Signature Pad**: Responsive digital signature canvas supporting touch, stylus, and mouse input with clear/undo controls.
- **Instant Branching Outcome Screen**:
  - **Fast-Track Approval (1 Business Day SLA)**: Issued when advisory audio audit is clean and informed consent is verified.
  - **Queued for Compliance Review (3–4 Business Days SLA)**: Triggered if audio audit warnings or confusion events were recorded, providing clear customer reassurance that funds are not deducted until review completes.

### 3. MAS Representative Registry & Admin Management — `/admin` & `/api/agents`
- **MAS Representative Verification**: Strict format validation ensuring representative numbers adhere to the `MAS-REP-XXXXXX` statutory standard.
- **Agent Roster**: Provisioning and management of certified financial advisers with disk persistence (`.agents-cache.json`).

### 4. Dynamic Multi-Policy Catalog & Policy Builder — `/policy` & `/api/policies`
- **4 Pre-Configured MAS Regulated Products**:
  1. *RetireSafe Golden Shield* (Annuity & Life Protection - Endowment)
  2. *WealthBuilder Horizon* (Unit-Linked Investment Plan - ILP)
  3. *PruLife Term Protect 2026* (Pure Protection Term Life)
  4. *FutureCare Elite* (Comprehensive Hospital & Surgical)
- **Gen-AI Policy Summarizer (FR-04)**: Condenses complex legal insurance clauses into 3–4 ultra-clear English bullet points using Google Gemini adhering to MAS clear product disclosure standards.

### 5. MAS Digital Disclosure & Consent Receipt — `/api/session/[id]/receipt`
- **Tamper-Evident Audit Record**: Generates an official MAS-compliant digital confirmation receipt containing customer signature, advisor MAS rep number, policy summary, full speech audit transcript, and branching approval status.

### 6. Privacy Disclosure Gate (FR-05)
- **Agent Mandatory Disclosure Script (`/copilot`)**: Compliance card with the mandatory script the agent must read aloud to the customer at session start.
- **Customer Privacy Onboarding Gate (`/customer/[id]`)**: Pre-session onboarding screen explicitly guaranteeing under Singapore PDPA that video is processed exclusively on-device.

### 7. Cross-Device QR Hand-Off (FR-01, FR-03)
- Generates secure, time-boxed QR codes on the Advisor's screen (`/copilot`) to hand off the session directly to the customer's personal mobile device.
- Includes persistent disk caching (`.sessions-cache.json`) and on-demand session auto-recovery.

### 8. Progressive Web App (PWA) Foundation (FR-01)
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
│   │   ├── admin/              # MAS Advisor registry management (/admin)
│   │   ├── api/                # Backend API Route Handlers
│   │   │   ├── agents/         # MAS Representative registration & listing
│   │   │   ├── consent/        # Consent submission & branching logic
│   │   │   ├── copilot/        # AI Copilot dialogue analysis & live config
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
│   │   ├── customer/           # VisualFocusRing with optical motion differencing
│   │   └── pwa/                # PWA Service Worker registration component
│   ├── lib/
│   │   ├── agent-store.ts      # MAS Representative registry persistence
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
