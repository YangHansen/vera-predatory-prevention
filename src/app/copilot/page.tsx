"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, AlertTriangle, ShieldCheck, Sparkles, RefreshCw, Zap, Lightbulb, User, CheckCircle2 } from "lucide-react";
import { CopilotAnalysisResult } from "@/types";

const SAMPLE_SCENARIOS = [
  {
    id: "predatory_1",
    label: "🚨 High-Pressure & Deceptive Return Guarantee",
    type: "aggressive",
    text: "Mdm. Tan, this investment-linked policy is guaranteed to give you 25% returns every year with zero risk. You must sign right now before the quota closes!",
  },
  {
    id: "disclosure_2",
    label: "⚠️ Concealing Acquisition Costs & Waiting Periods",
    type: "warning",
    text: "Don't worry about the 15% surrender charge or the 12-month pre-existing condition moratorium—those are just standard legal fine print. Just sign here.",
  },
  {
    id: "compliant_3",
    label: "✅ MAS Fair Dealing Compliant Advisory Pitch",
    type: "compliant",
    text: "Mdm. Tan, this S$450 monthly premium provides peace of mind with a guaranteed annuity starting at age 62 and S$250,000 protection for your family. Please note that pre-existing medical conditions require a 12-month waiting period before full coverage takes effect.",
  },
];

export default function CopilotTestPage() {
  const [inputText, setInputText] = useState(SAMPLE_SCENARIOS[0].text);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = textToAnalyze || inputText;
    if (!text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/copilot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "sess_copilot_playground_sg",
          text: text.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze advisor speech");
      }

      setResult(data.analysis);
    } catch (err: any) {
      setError(err.message || "An error occurred during speech analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to API Dashboard</span>
        </Link>
        <span className="text-xs font-mono font-medium text-slate-400">FR-02: AI Sales Copilot Interface</span>
      </div>

      {/* Main Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                AI Sales Copilot & Mis-selling Detector
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Detects aggressive sales tactics and missing disclosures in real-time under MAS Fair Dealing and FAA standards, providing live &quot;Cheat Sheet&quot; scripts for financial advisors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white">
              <User className="w-3.5 h-3.5 text-blue-400" />
              Advisor: Andi (FC-1092)
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Advisor Speech Input vs Live Copilot Telemetry */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Advisor Speech / Dialogue Input */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Advisor Dialogue (Speech / Transcript Input)
                </h2>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Threshold: 80%
              </span>
            </div>

            {/* Quick Sample Scenario Selector */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select a Test Advisory Scenario:
              </label>
              <div className="space-y-2">
                {SAMPLE_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setInputText(s.text);
                      setResult(null);
                    }}
                    className={`w-full text-left p-3 rounded-2xl text-xs font-medium transition-all border ${
                      inputText === s.text
                        ? "bg-blue-50 border-blue-300 text-blue-900 shadow-xs"
                        : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold mb-0.5">{s.label}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{s.text}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dialogue Text (Freely Editable):
              </label>
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                placeholder="Type advisor pitch or customer objection in English..."
              />
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !inputText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm py-3 px-4 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gemini Copilot Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Audit Compliance & Show Cheat Sheet (FR-02)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Real-time Copilot Screen (Dark HUD Mode for Field Advisor) */}
        <div className="bg-slate-900 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                  Advisor Real-Time HUD
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] bg-slate-800 px-3 py-1 rounded-full text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Monitoring Active</span>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-800 rounded-2xl text-xs text-rose-300 mb-4">
                {error}
              </div>
            )}

            {result ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Status & Confidence Badge */}
                <div className="flex items-center justify-between p-4 bg-slate-800/80 rounded-2xl border border-slate-700">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider ${
                        result.warningFlags === "GREEN"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : result.warningFlags === "YELLOW"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      }`}
                    >
                      {result.warningFlags === "GREEN"
                        ? "🟢 Compliant (Green)"
                        : result.warningFlags === "YELLOW"
                        ? "🟡 Advisory Warning (Yellow)"
                        : "🔴 Severe Violation (Red)"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Confidence Score</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {Math.round((result.confidenceScore || 0.85) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Detected Issues */}
                {result.detectedIssues && result.detectedIssues.length > 0 && (
                  <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Regulatory Issues Detected:</span>
                    </div>
                    {result.detectedIssues.map((issue, idx) => (
                      <div key={idx} className="text-xs text-slate-200 pl-6 space-y-1">
                        <div className="font-semibold text-amber-200">
                          {issue.type.replace(/_/g, " ")} (Severity: {issue.severity})
                        </div>
                        <div className="text-slate-300 text-[11px] leading-relaxed">{issue.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Answer Cheat Sheet for Advisor */}
                {result.suggestedAnswers && result.suggestedAnswers.length > 0 && (
                  <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                      <Lightbulb className="w-4 h-4" />
                      <span>Compliant Advisor &quot;Cheat Sheet&quot; Script:</span>
                    </div>
                    {result.suggestedAnswers.map((ans, idx) => (
                      <div key={idx} className="bg-slate-800/90 p-3 rounded-xl border border-slate-700/80 space-y-1.5">
                        <div className="text-xs font-bold text-blue-300">{ans.questionOrObjection}</div>
                        <p className="text-xs text-slate-100 italic leading-relaxed">
                          &quot;{ans.suggestedResponse}&quot;
                        </p>
                        {ans.cheatSheetBullet && (
                          <div className="text-[11px] text-emerald-400 font-semibold pt-1 border-t border-slate-700/60 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{ans.cheatSheetBullet}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="my-12 text-center p-8 border border-dashed border-slate-800 rounded-2xl">
                <Mic className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-slate-400 font-medium">
                  Select a test scenario or type advisor speech on the left, then click &quot;Audit Compliance&quot;.
                </p>
              </div>
            )}
          </div>

          {/* Footer Badge */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Google Gemini 3.5 Flash-Lite
            </span>
            <span>MAS Fair Dealing Audit Engine</span>
          </div>
        </div>
      </div>
    </main>
  );
}
