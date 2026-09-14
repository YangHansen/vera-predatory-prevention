"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  MicOff,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Zap,
  Lightbulb,
  User,
  CheckCircle2,
  Clock,
  Trash2,
  Play,
  Pause,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import { CopilotAnalysisResult } from "@/types";
import { SpeechListener } from "@/components/copilot/SpeechListener";

const BATCH_INTERVAL_SECONDS = 60;

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
  // Dialogue buffer starts EMPTY by default so no placeholder is sent repeatedly
  const [inputText, setInputText] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1-Minute Interval Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(BATCH_INTERVAL_SECONDS);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [lastAuditTime, setLastAuditTime] = useState<string | null>(null);

  // Ref to access current text in timer callback without stale closure
  const inputTextRef = useRef(inputText);
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Main Audit function with Gemini
  const handleAnalyze = useCallback(async (textToAnalyze?: string) => {
    const text = (textToAnalyze !== undefined ? textToAnalyze : inputTextRef.current).trim();
    if (!text) return; // Never send empty text or placeholders

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/copilot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "sess_copilot_playground_sg",
          text,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze advisor speech");
      }

      setResult(data.analysis);
      setLastAuditTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || "An error occurred during speech analysis.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Stop Listening and Send Immediately
  const handleStopAndSend = useCallback(() => {
    let textToSend = inputTextRef.current.trim();
    if (interimTranscript.trim().length > 0) {
      textToSend = textToSend ? `${textToSend} ${interimTranscript.trim()}` : interimTranscript.trim();
      setInputText(textToSend);
      setInterimTranscript("");
    }

    setIsListening(false);
    setSecondsRemaining(BATCH_INTERVAL_SECONDS);

    if (textToSend.length > 0) {
      handleAnalyze(textToSend);
    }
  }, [interimTranscript, handleAnalyze]);

  // 60-Second Batch Interval Effect (ONLY counts down when microphone is actively listening)
  useEffect(() => {
    if (!isListening || !isTimerActive) {
      setSecondsRemaining(BATCH_INTERVAL_SECONDS);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (inputTextRef.current.trim().length > 0) {
            handleAnalyze(inputTextRef.current);
          }
          return BATCH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isListening, isTimerActive, handleAnalyze]);

  // Handle incoming live speech transcript (appends directly to text buffer)
  const handleSpeechTranscript = useCallback((newText: string) => {
    setInputText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return newText;
      return `${trimmed} ${newText}`;
    });
  }, []);

  // Load a quick sample scenario into the dialogue buffer
  const handleSelectScenario = (scenarioText: string) => {
    setInputText(scenarioText);
    setResult(null);
  };

  // Calculate percentage of 60s elapsed for progress bar
  const progressPercent = ((BATCH_INTERVAL_SECONDS - secondsRemaining) / BATCH_INTERVAL_SECONDS) * 100;
  const hasDialogue = inputText.trim().length > 0;

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
                AI Sales Copilot & Speech Listener
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Listens to meeting speech via Google Cloud / Web Speech STT, transcribes live into the dialogue buffer, and audits compliance every 60s with Google Gemini.
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
        {/* Left Column: Unified Advisory Speech & Control Center */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* 1. Unified Control Bar (Aligned Mic Button + 60s Timer + Send Button) */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Single Aligned Mic Toggle Button */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        handleStopAndSend();
                      } else {
                        setIsListening(true);
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                      isListening
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md animate-pulse ring-2 ring-rose-400/40"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:scale-105"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <Square className="w-4 h-4 fill-white" />
                        <span>Stop & Audit</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>Start Live Listening</span>
                      </>
                    )}
                  </button>

                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">
                      {isListening ? "Listening to Speech..." : "Mic Idle"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isListening ? "Speech appends live below" : "Click to speak into mic"}
                    </span>
                  </div>
                </div>

                {/* Send & Audit Now Button */}
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={loading || !hasDialogue}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Auditing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send & Audit Now</span>
                    </>
                  )}
                </button>
              </div>

              {/* 60s Batch Timer Progress Bar (Only advances actively when there is text or listening) */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>60-Second Auto-Audit Batch Timer:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] bg-slate-800 px-2 py-0.5 rounded text-blue-300">
                      {isListening
                        ? `${secondsRemaining}s remaining`
                        : "Mic idle (Timer reset to 60s)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTimerActive(!isTimerActive)}
                      className="text-slate-400 hover:text-white"
                      title={isTimerActive ? "Pause timer" : "Resume timer"}
                    >
                      {isTimerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
                    </button>
                  </div>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${isListening ? progressPercent : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. SpeechListener Audio Level Visualizer & Interim Speech Bubble */}
            <SpeechListener
              onTranscript={handleSpeechTranscript}
              isListening={isListening}
              onToggleListening={setIsListening}
              interimTranscript={interimTranscript}
              setInterimTranscript={setInterimTranscript}
            />

            {/* 3. Meeting Dialogue Textarea (Actual Transcribed Text Appears Here) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Meeting Dialogue Buffer (Transcribed Text):
                </label>
                {hasDialogue && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText("");
                      setResult(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear buffer</span>
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                placeholder="Spoken words from your microphone will transcribe and appear here directly..."
              />
            </div>

            {/* 4. Quick Sample Scenarios (Click to Load) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Or Load a Test Scenario:
              </label>
              <div className="space-y-1.5">
                {SAMPLE_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectScenario(s.text)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all border ${
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
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Language: English (Singapore - en-SG)</span>
            <span className="font-mono">{lastAuditTime ? `Last audit: ${lastAuditTime}` : "No audit run yet"}</span>
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
                <span>MAS Monitoring Active</span>
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
                  Click &quot;Start Live Listening&quot; to speak, or load a scenario on the left, then audit with Gemini.
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
            <span>MAS Fair Dealing 60s Batch Audit</span>
          </div>
        </div>
      </div>
    </main>
  );
}
