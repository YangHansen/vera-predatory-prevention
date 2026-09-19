"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, Shield, CheckCircle, FileText, RefreshCw, AlertCircle, UserCheck } from "lucide-react";
import { DUMMY_POLICIES } from "@/lib/dummy-data";

export default function PolicySummarizerTestPage() {
  const [selectedPolicyId, setSelectedPolicyId] = useState(DUMMY_POLICIES[0].id);
  const [isCustomMode, setIsCustomMode] = useState(false);
  
  const [customTitle, setCustomTitle] = useState("Supplementary Clause: Early Surrender & Pre-existing Illness");
  const [customRawText, setCustomRawText] = useState(
    "The policyholder terminating or surrendering the insurance agreement within an operational period of fewer than thirty-six (36) continuous calendar months shall be assessed an administrative surrender penalty deduction of 15% of aggregate paid premiums. Furthermore, any critical cardiovascular or oncological conditions manifested prior to the expiration of the 365-day exclusionary moratorium shall not be eligible for indemnification or in-patient cash benefits."
  );

  const [loading, setLoading] = useState(false);
  const [summaryBullets, setSummaryBullets] = useState<string[]>([]);
  const [isLiveGemini, setIsLiveGemini] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activePolicy = DUMMY_POLICIES.find((p) => p.id === selectedPolicyId) || DUMMY_POLICIES[0];

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = isCustomMode
        ? { customTitle, customText: customRawText }
        : { policyId: selectedPolicyId };

      const res = await fetch("/api/policy/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate policy summary");
      }

      setSummaryBullets(data.bullets || []);
      setIsLiveGemini(data.isLiveGemini);
    } catch (err: any) {
      setError(err.message || "An error occurred while generating the policy summary.");
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
        <span className="text-xs font-mono font-medium text-slate-400">FR-04: VERA AI Policy Summarizer</span>
      </div>

      {/* Main Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                VERA AI Policy Summarizer (Customer Interface)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Transforms complex insurance legal jargon into 3–4 ultra-clear, concise English points for consumers (e.g., Mdm. Tan) under MAS Fair Dealing guidelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setIsCustomMode(false);
                setSelectedPolicyId(DUMMY_POLICIES[0].id);
                setSummaryBullets([]);
              }}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ${
                !isCustomMode
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Preset Policies
            </button>
            <button
              onClick={() => {
                setIsCustomMode(true);
                setSummaryBullets([]);
              }}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ${
                isCustomMode
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ✍️ Custom Raw Text Input
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Raw Input vs Simplified Customer Preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Raw Legal Text */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {isCustomMode ? "Custom Raw Legal Clauses" : "Original Policy Clauses"}
                </h2>
              </div>
              {!isCustomMode && (
                <select
                  value={selectedPolicyId}
                  onChange={(e) => {
                    setSelectedPolicyId(e.target.value);
                    setSummaryBullets([]);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
                >
                  {DUMMY_POLICIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {isCustomMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clause / Schedule Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Raw Policy Text (Complex Legal Wording)
                  </label>
                  <textarea
                    rows={9}
                    value={customRawText}
                    onChange={(e) => setCustomRawText(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                    placeholder="Paste complex insurance clauses or terms here..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{activePolicy.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Code: {activePolicy.code} • {activePolicy.provider}</div>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {activePolicy.clauses.map((c, i) => (
                    <div key={c.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800">{i + 1}. {c.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600">
                          {c.category}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-600 leading-relaxed">{c.originalText}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={handleSummarize}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm py-3 px-4 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Summarize Policy with Gemini AI (FR-04)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Customer UI Preview (WCAG High-Contrast / Friendly for Mdm. Tan) */}
        <div className="bg-slate-900 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                  Customer Interface Preview
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-300">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Persona: Mdm. Tan</span>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-xs font-medium text-blue-400 tracking-wide uppercase">Informed Policy Consent</span>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                {isCustomMode ? customTitle : activePolicy.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Review these key 3–4 terms and conditions before providing your digital signature:
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-2xl text-xs text-rose-300 flex items-start gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Bullets List */}
            {summaryBullets.length > 0 ? (
              <div className="space-y-3 my-6 animate-in fade-in duration-300">
                {summaryBullets.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-800/70 border border-slate-700/70 rounded-2xl flex items-start gap-3.5 hover:border-blue-500/50 transition-colors"
                  >
                    <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed">
                      {bullet}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="my-12 text-center p-8 border border-dashed border-slate-800 rounded-2xl">
                <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-slate-400 font-medium">
                  Click &quot;Summarize Policy with Gemini AI&quot; on the left to see the simplified customer-friendly summary.
                </p>
              </div>
            )}
          </div>

          {/* Footer Badge */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {isLiveGemini ? "Google Gemini 2.5 Live" : "VERA AI Statutory Engine"}
            </span>
            <span>MAS Fair Dealing & Singapore PDPA Compliant</span>
          </div>
        </div>
      </div>
    </main>
  );
}
