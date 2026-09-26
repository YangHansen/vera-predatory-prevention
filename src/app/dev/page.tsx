import Link from "next/link";
import { DeviceAgentSwitcher } from "@/components/dev/DeviceAgentSwitcher";
import {
  ShieldCheck,
  Cpu,
  Smartphone,
  FileText,
  CheckCircle2,
  Layers,
  Sparkles,
  Zap,
  ArrowRight,
  UserPlus,
  BookOpen,
  Award,
} from "lucide-react";

export default function Home() {
  const endpoints = [
    { method: "GET", path: "/api/health", desc: "API status, engine version & Gemini connectivity" },
    { method: "POST", path: "/api/agents", desc: "Backend-only provisioning for licensed MAS financial advisers" },
    { method: "GET", path: "/api/agents", desc: "List all certified agency advisors and compliance ratings" },
    { method: "GET", path: "/api/policies", desc: "Dynamic multi-product insurance catalog with MAS disclosures" },
    { method: "POST", path: "/api/session", desc: "Initialize session & generate QR code for cross-device hand-off" },
    { method: "GET", path: "/api/session/[id]", desc: "Fetch active session & dynamic policy state" },
    { method: "PATCH", path: "/api/session/[id]", desc: "Update session policy, advisor, telemetry & dialogue buffer" },
    { method: "POST", path: "/api/copilot/analyze", desc: "Real-time NLP intent analysis & aggressive tactic detector" },
    { method: "POST", path: "/api/policy/summarize", desc: "Gen-AI policy clause summarization (3-5 simple bullets)" },
    { method: "POST", path: "/api/consent/submit", desc: "Submit digital signature + liveness telemetry -> Branching logic" },
    { method: "GET", path: "/api/session/[id]/receipt", desc: "Generate cryptographic MAS Fair Dealing Compliance Certificate" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm shadow-blue-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">VERA AI Platform & Engine</h1>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  v2.5 MVP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                AI-Powered Insurance Consent & Mis-selling Prevention (Singapore MAS & PDPA Aligned)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              PWA Ready
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-500" />
              Gemini 3.5 Flash-Lite
            </span>
          </div>
        </div>

        {/* Master Device Agent Switcher */}
        <DeviceAgentSwitcher />

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-3 gap-4 my-6">
          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1 text-sm">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>PWA Foundation</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Manifest, Service Worker, mobile viewport, and automatic offline fallback caching (FR-01) configured.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1 text-sm">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Google Gemini AI</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time multi-modal audio analysis paired with deterministic MAS Fair Dealing statutory fallback engine.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1 text-sm">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>Cross-Device QR Hand-off</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Session state coordinator with QR code generation & Fast-Track (1-Day) vs Compliance Review (3-4 Days) branching logic.
            </p>
          </div>
        </div>

        {/* Interactive Feature Playgrounds */}
        <div className="my-8">
          <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Core Platform Modules & Playgrounds
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Feature 1: Admin Agent Provisioning */}
            <div className="bg-slate-900 bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-3xl shadow-xs flex flex-col justify-between border border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Enterprise Admin
                  </span>
                  <UserPlus className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">
                  1. Adviser Provisioning Portal
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Internal enterprise management to provision licensed MAS financial advisers with verified MAS-REP numbers. Public self-signup is disabled under MAS Market Conduct Guidelines.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800">
                <Link
                  href="/admin/agents"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Open Adviser Management Portal</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Feature 2: Policy Summarizer */}
            <div className="bg-blue-600 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-3xl shadow-xs flex flex-col justify-between border border-blue-500">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white">
                    FR-04: Customer UI
                  </span>
                  <Sparkles className="w-4 h-4 text-blue-200" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">
                  2. Gen-AI Policy Summarizer
                </h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Distill complex insurance legal jargon into 3–4 ultra-clear English bullet points tailored for senior consumers under MAS Fair Dealing guidelines.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-blue-400/30">
                <Link
                  href="/policy"
                  className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Open Policy Summarizer</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Feature 3: AI Copilot & Mis-selling Detector */}
            <div className="bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-3xl shadow-xs flex flex-col justify-between border border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    FR-02: Advisor UI
                  </span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">
                  3. VERA AI Sales Copilot HUD
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Real-time detection of high-pressure sales tactics or deceptive return promises, multi-product catalog selection, and instant &quot;Cheat Sheet&quot; compliant advisory scripts.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800">
                <Link
                  href="/copilot"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Launch VERA AI Copilot HUD</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Available API Endpoints */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Backend API Endpoints Directory
          </h2>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
            {endpoints.map((ep, idx) => (
              <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                    ep.method === "GET" ? "bg-sky-100 text-sky-800 border border-sky-200" :
                    ep.method === "POST" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                    "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>
                    {ep.method}
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-semibold text-slate-800">{ep.path}</span>
                </div>
                <span className="text-xs text-slate-500">{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href="/api/health"
              target="_blank"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
            >
              GET /api/health &rarr;
            </Link>
            <Link
              href="/api/agents"
              target="_blank"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
            >
              GET /api/agents &rarr;
            </Link>
            <Link
              href="/api/policies"
              target="_blank"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
            >
              GET /api/policies &rarr;
            </Link>
          </div>
          <span className="text-xs text-slate-400 font-mono">VERA AI Platform • Next.js 15 • MAS Fair Dealing Compliance</span>
        </div>
      </div>
    </main>
  );
}
