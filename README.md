# Vera — AI-Powered Insurance Consent & Mis-selling Prevention

> **Regulatory Standards:** Monetary Authority of Singapore (MAS) Guidelines on Fair Dealing • Financial Advisers Act (FAA) • Singapore PDPA  
> **Tech Stack:** Next.js 15 (App Router) • React 19 • TypeScript • Tailwind CSS • Google Gemini 3.5 Flash-Lite • Progressive Web App (PWA)

---

## About Vera

**Vera** is a B2B SaaS platform designed to eradicate predatory sales practices and guarantee genuine **"Informed Consent"** in the insurance and wealth advisory industry under Singapore regulatory standards (**MAS Fair Dealing Guidelines**). 

By providing a real-time **AI Sales Copilot** for financial advisors and a simplified, protective **Customer Interface** for vulnerable and senior consumers (such as *Mdm. Tan*), Vera bridges the transparency gap without sacrificing advisory closing speed.

---

## Currently Available Features & Testing Playgrounds

The foundation environment, backend API engine, and interactive testing interfaces are ready:

### 1. Gen-AI Policy Summarizer (FR-04) — `/policy`
- **Customer Interface Preview**: High-contrast, WCAG-accessible view tailored for senior consumers (*Mdm. Tan*).
- **Clause Simplification**: Condenses complex legal insurance clauses into **3–4 ultra-simple English bullet points** using **Google Gemini 3.5 Flash-Lite** adhering to MAS clear product disclosure standards.
- **Interactive Playground**:
  - Test predefined Singapore insurance policies (*RetireSafe Golden Shield* & *FutureCare Elite* in SGD).
  - **Custom Raw Text Mode**: Paste or type any arbitrary raw legal clauses with complex jargon and watch Gemini distill it in real-time.

### 2. AI Sales Copilot & Mis-selling Detector (FR-02) — `/copilot`
- **Advisor HUD Screen**: Designed for field financial advisors (*Advisor Andi, FC-1092*).
- **Real-time Mis-selling Detection**: Evaluates advisor dialogue with an **80% confidence threshold** according to MAS Notice FAA-N03 and Market Conduct standards.
- **Compliance Status**: Flags conversation as 🟢 **Green** (Compliant), 🟡 **Yellow** (Warning / Missing Disclosure / Surrender Penalty Omission), or 🔴 **Red** (Severe Predatory Tactic / Deceptive Returns).
- **Advisor Cheat Sheet**: Generates immediate, AI-crafted objection-handling scripts to guide the advisor in keeping the sale compliant without losing the client.

### 3. Progressive Web App (PWA) Foundation (FR-01)
- **Installable Web App**: Configured with Web App Manifest (`/manifest.webmanifest`), 192x192 / 512x512 icons, and standalone display mode.
- **Service Worker (`/sw.js`)**: Static asset caching with network-first and stale-while-revalidate strategies.
- **Automatic Offline Mode (FR-01)**: Listens for connectivity drops and presents an interactive offline banner, keeping draft session data securely cached locally.

### 4. Branching Logic & Cross-Device Session Coordinator (FR-03, FR-06)
- **Cross-Device QR Hand-off**: Generates secure, time-boxed QR code data URLs to transition from the Advisor's device to the Customer's personal phone.
- **Branching Engine**:
  - 🟢 **Fast-Track Approval (1 business day SLA)**: Clean audio audit + Verified liveness + Valid electronic signature.
  - 🟡 **Standard Manual Review (3–4 business days SLA)**: Triggered if confusion is detected, timer fallback delay engaged, or advisory warning flags recorded.

---

## Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or `v24.x`
- **npm**: `v10.x` or `v11.x`

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Environment Variables
Configure your `.env.local` file:
```env
# Google Gemini API Key (Free tier supported)
GEMINI_API_KEY=your_gemini_api_key_here

# Gemini Model (Defaults to gemini-3.5-flash-lite)
GEMINI_MODEL=gemini-3.5-flash-lite

# App Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server Port
PORT=3000
```
> **Note:** If `GEMINI_API_KEY` is not set or offline, Vera automatically falls back to deterministic rule-based mock heuristics so the app remains 100% functional for local testing.

### 4. Running the Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

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
| `GET` | `/api/session/[id]` | FR-03 | Fetches session state and linked policy details |
| `PATCH` | `/api/session/[id]/status` | FR-01, FR-03 | Updates session workflow state (`HANDED_OFF`, `CONSENT_SIGNED`, etc.) |
| `POST` | `/api/copilot/analyze` | FR-02 (AI Copilot) | Analyzes dialogue for aggressive tactics & returns cheat sheet scripts |
| `POST` | `/api/policy/summarize` | FR-04 (Summarizer) | Distills raw policy clauses or custom text into 3–4 simplified English bullets |
| `POST` | `/api/consent/submit` | FR-05, FR-06 | Submits signature & liveness telemetry to trigger branching evaluation |

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
│   │   │   ├── copilot/        # AI Copilot dialogue analysis
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── policy/         # Policy summarization API
│   │   │   └── session/        # Session manager & QR generator
│   │   ├── copilot/            # AI Copilot interactive test page (/copilot)
│   │   ├── policy/             # Policy Summarizer test page (/policy)
│   │   ├── manifest.ts         # Next.js Web App Manifest generator
│   │   ├── layout.tsx          # Root layout with PWA meta & viewport
│   │   ├── page.tsx            # Main developer & testing dashboard
│   │   └── globals.css         # Tailwind CSS styling
│   ├── components/
│   │   └── pwa/                # PWA Service Worker registration component
│   ├── lib/
│   │   ├── branching-engine.ts # Compliance evaluation engine (MAS Fair Dealing)
│   │   ├── dummy-data.ts       # Static Singapore insurance policies (SGD)
│   │   ├── gemini.ts           # Google Gemini 3.5 Flash-Lite service layer
│   │   └── session-store.ts    # In-memory session & QR URL coordinator
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
Designed in alignment with the **Monetary Authority of Singapore (MAS)** Guidelines on Fair Dealing, **Financial Advisers Act (FAA)**, and **Personal Data Protection Act (PDPA)**.
