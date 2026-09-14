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
- **Continuous Speech-to-Text**: Captures Web Audio in 16kHz mono PCM WAV format with Voice Activity Detection (VAD) boundary slicing, transcribing live speech via Google Gemini Multimodal Audio with automatic fallback to native Web Speech.
- **60-Second Auto-Audit Batch Timer**: Automatically audits accumulated dialogue every 60 seconds or on demand.
- **MAS Compliance Categorization**: Flags advisory conduct as Green (Compliant), Yellow (Advisory Warning / Disclosure Omission), or Red (Severe Predatory Tactic / Misleading Guarantees).
- **Way B: Conversational Speaker-Turn Q&A Audit**: Automatically isolates client questions from advisor responses to audit specific topics:
  - Duty of Disclosure for pre-existing medical conditions under Section 25(5) of the Singapore Insurance Act.
  - Concealment of early surrender charges and penalties under MAS Notice FAA-N03.
  - Deceptive capital return guarantees under Section 26 of the Financial Advisers Act (FAA).
- **Advisor Cheat Sheet**: Generates immediate, legally compliant corrective scripts for the advisor.

### 2. Customer Mobile Web Flow & Digital Signature Pad (FR-03, FR-04, FR-05, FR-06) — `/customer/[id]`
- **Senior-Friendly, High-Contrast UI**: Designed for senior policyholders (e.g., Mdm. Tan, 58) with large typography and plain-English disclosures.
- **Simplified Policy Disclosures**: Displays guaranteed protection amounts (SGD), regular premium schedules, and 3–4 simplified summary bullets.
- **Consumer Safeguards Callouts**: Highlights statutory protections including the 14-day Free-Look refund window, the 12-month pre-existing illness moratorium, and early surrender deductions.
- **HTML5 Touch & Mouse Signature Pad**: Responsive digital signature canvas supporting touch, stylus, and mouse input with clear/undo controls.
- **Instant Branching Outcome Screen**:
  - **Fast-Track Approval (1 Business Day SLA)**: Issued when advisory audio audit is clean and informed consent is verified.
  - **Queued for Compliance Review (3–4 Business Days SLA)**: Triggered if audio audit warnings or confusion events were recorded, providing clear customer reassurance that funds are not deducted until review completes.

### 3. Gen-AI Policy Summarizer (FR-04) — `/policy`
- **Clause Simplification**: Condenses complex legal insurance clauses into 3–4 ultra-clear English bullet points using Google Gemini adhering to MAS clear product disclosure standards.
- **Interactive Playground**: Test predefined Singapore policies (RetireSafe Annuity, FutureCare Elite in SGD) or paste custom raw legal clauses to test distillation.

### 4. Cross-Device QR Hand-Off (FR-03)
- Generates secure, time-boxed QR codes on the Advisor's screen (`/copilot`) to hand off the session directly to the customer's personal mobile device.
- Includes persistent disk caching (`.sessions-cache.json`) and on-demand session auto-recovery so links never expire unexpectedly.

### 5. Progressive Web App (PWA) Foundation (FR-01)
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
