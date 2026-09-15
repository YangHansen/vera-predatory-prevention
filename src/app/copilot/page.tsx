"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
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
  Send,
  Square,
  QrCode,
  MessageSquare,
  X,
  ExternalLink,
  Copy,
  Check,
  BrainCircuit,
} from "lucide-react";
import type { CopilotAnalysisResult, ConfusionEvent } from "@/types";
import { SpeechListener } from "@/components/copilot/SpeechListener";

const BATCH_INTERVAL_SECONDS = 60;

const SAMPLE_SCENARIOS = [
  {
    id: "predatory_full",
    label: "🚨 Predatory Pitch & Deceptive Return Guarantee",
    type: "aggressive",
    text: "Listen, I shouldn't even be showing you this plan today because it's technically reserved for our high net worth VIP clients, but I can tell you care deeply about your family's safety. Look around. Accidents happen in a split second, and without this specific policy, one unexpected medical diagnosis or tragedy will wipe out your life savings overnight. You don't want to leave your family broke and evicted while they're grieving, do you? That's where our Ultimate Legacy Shield comes in. This isn't just basic insurance—it is a guaranteed, risk-free wealth accelerator. While the stock market crashes, this plan builds cash value at a fixed return that outpaces inflation every single year. You are essentially getting free, total protection while building guaranteed wealth. Now, the fine print is standard legal fluff—nothing you need to worry about. We cover virtually everything. Sure, there are standard minor conditions, but trust me, everybody gets approved today. Here's the catch: this tier discount and waived sign-up fee expire the moment I walk out that door. The rate jumps by 40% tomorrow. You don't need to read through all 50 pages of boilerplate today, just sign line 14 right here.",
  },
  {
    id: "qna_pre_existing",
    label: "💬 Client Q&A: Pre-Existing Condition Non-Disclosure",
    type: "qna",
    text: `Advisor: "Mdm. Tan, this Comprehensive Health Shield will cover all your future medical treatments and hospital ward charges seamlessly."
Client: "That sounds good, but I had mild hypertension and high cholesterol diagnosed 2 years ago. Will the policy still cover that, and do I need to declare it?"
Advisor: "Don't worry about it. As long as you haven't been hospitalized overnight in the last 12 months, you don't even need to declare it on the form. Just leave that section blank so we don't delay your approval."`,
  },
  {
    id: "qna_surrender",
    label: "💬 Client Q&A: Concealing Surrender Charges",
    type: "qna",
    text: `Advisor: "This wealth builder plan will outpace fixed deposit rates easily."
Client: "What happens if my son needs money for university in year 2 or 3? Can I withdraw my savings without penalty?"
Advisor: "Yes, absolutely! You can withdraw your money anytime you want with zero penalty or deduction. It functions just like an everyday bank account with high interest."`,
  },
  {
    id: "compliant_full",
    label: "✅ Compliant MAS Pitch & Honest Q&A Disclosure",
    type: "compliant",
    text: `Advisor: "Mdm. Tan, this S$450 monthly premium provides peace of mind with a guaranteed annuity starting at age 62 and S$250,000 protection for your family. Please note that pre-existing medical conditions require a 12-month waiting period before full coverage takes effect."
Client: "I had hypertension diagnosed 2 years ago. Is that considered pre-existing?"
Advisor: "Yes, Mdm. Tan, under Section 25(5) of the Insurance Act, we must fully declare all past diagnoses on the application. The underwriter will review it, and after the 12-month waiting period, you will have legitimate coverage without any claim disputes later."`,
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

  // QR Hand-off Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState<{
    sessionId: string;
    qrCodeDataUrl?: string;
    customerUrl?: string;
    customerName?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // FR-05 Mandatory Privacy Disclosure Script State
  const [privacyScriptRead, setPrivacyScriptRead] = useState<boolean>(false);

  // Real-time client confusion telemetry from paired screen
  const [clientConfusionEvents, setClientConfusionEvents] = useState<ConfusionEvent[]>([]);

  // Ref to access current text in timer callback without stale closure
  const inputTextRef = useRef(inputText);
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Sync live dialogue buffer to server session in real-time
  const syncDialogueToSession = useCallback((text: string) => {
    const activeId =
      qrData?.sessionId ||
      (typeof window !== "undefined" ? localStorage.getItem("vera_copilot_session_id") : null);
    if (!activeId) return;

    fetch(`/api/session/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dialogueBuffer: text }),
    }).catch(() => {});
  }, [qrData?.sessionId]);

  // Sync dialogue whenever inputText or interimTranscript changes
  useEffect(() => {
    const combined = interimTranscript.trim()
      ? (inputText ? `${inputText} ${interimTranscript.trim()}` : interimTranscript.trim())
      : inputText;

    const timer = setTimeout(() => {
      syncDialogueToSession(combined);
    }, 150);

    return () => clearTimeout(timer);
  }, [inputText, interimTranscript, syncDialogueToSession]);

  // Polling to sync client screen confusion events in real-time (every 1s)
  useEffect(() => {
    const activeId =
      qrData?.sessionId ||
      (typeof window !== "undefined" ? localStorage.getItem("vera_copilot_session_id") : null);
    if (!activeId) return;

    const pollConfusion = async () => {
      try {
        const res = await fetch(`/api/session/${activeId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.session?.livenessTelemetry?.confusionEvents) {
            setClientConfusionEvents(data.session.livenessTelemetry.confusionEvents);
          }
        }
      } catch (e) {
        // ignore network blips
      }
    };

    const interval = setInterval(pollConfusion, 1000);
    return () => clearInterval(interval);
  }, [qrData?.sessionId]);

  // Auto-initialize or restore active session on mount so copilot and client screen are always paired
  useEffect(() => {
    async function initSession() {
      try {
        const savedId = typeof window !== "undefined" ? localStorage.getItem("vera_copilot_session_id") : null;
        if (savedId) {
          const checkRes = await fetch(`/api/session/${savedId}`);
          if (checkRes.ok) {
            const data = await checkRes.json();
            if (data.success && data.session) {
              setQrData({
                sessionId: data.session.id,
                qrCodeDataUrl: data.session.qrCodeDataUrl,
                customerUrl: data.session.customerUrl,
                customerName: data.session.customerName,
              });
              return;
            }
          }
        }

        // Create fresh session if no saved session
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: "agent_andi_sg01",
            customerName: "Mdm. Tan",
            customerPhone: "+65 9123 4567",
            policyId: "pol_retiresafe_2026",
            baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
          }),
        });
        const createData = await res.json();
        if (createData.success && createData.session) {
          setQrData({
            sessionId: createData.session.id,
            qrCodeDataUrl: createData.session.qrCodeDataUrl,
            customerUrl: createData.session.customerUrl,
            customerName: createData.session.customerName,
          });
          if (typeof window !== "undefined") {
            localStorage.setItem("vera_copilot_session_id", createData.session.id);
          }
        }
      } catch (e) {
        console.error("Failed to auto-init session:", e);
      }
    }

    initSession();
  }, []);

  // Main Audit function with Gemini
  const handleAnalyze = useCallback(async (textToAnalyze?: string) => {
    const text = (textToAnalyze !== undefined ? textToAnalyze : inputTextRef.current).trim();
    if (!text) return; // Never send empty text or placeholders

    setLoading(true);
    setError(null);

    const activeSessionId = qrData?.sessionId || (typeof window !== "undefined" ? localStorage.getItem("vera_copilot_session_id") : null) || "sess_copilot_playground_sg";

    try {
      const res = await fetch("/api/copilot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
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
  }, [qrData?.sessionId]);

  // Stop listening and immediately audit buffered speech
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

  // 60-Second Batch Interval Effect
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

  // Handle incoming live speech transcript
  const handleSpeechTranscript = useCallback((newText: string) => {
    setInputText((prev) => {
      const trimmed = prev.trim();
      const updated = !trimmed ? newText : `${trimmed} ${newText}`;
      syncDialogueToSession(updated);
      return updated;
    });
  }, [syncDialogueToSession]);

  // Open QR Hand-off Modal & Initialize Session
  const handleOpenQrModal = async () => {
    setShowQrModal(true);
    setCopiedLink(false);

    if (qrData) return; // Already generated

    try {
      setQrLoading(true);
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "agent_andi_sg01",
          customerName: "Mdm. Tan",
          customerPhone: "+65 9123 4567",
          policyId: "pol_retiresafe_2026",
          baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setQrData({
          sessionId: data.session.id,
          qrCodeDataUrl: data.session.qrCodeDataUrl,
          customerUrl: data.session.customerUrl,
          customerName: data.session.customerName,
        });
      }
    } catch (e) {
      console.error("Failed to generate QR session:", e);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCreateNewSession = async () => {
    try {
      setQrLoading(true);
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "agent_andi_sg01",
          customerName: "Mdm. Tan",
          customerPhone: "+65 9123 4567",
          policyId: "pol_retiresafe_2026",
          baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setQrData({
          sessionId: data.session.id,
          qrCodeDataUrl: data.session.qrCodeDataUrl,
          customerUrl: data.session.customerUrl,
          customerName: data.session.customerName,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("vera_copilot_session_id", data.session.id);
        }
        setResult(null);
      }
    } catch (e) {
      console.error("Failed to create new session:", e);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (qrData?.customerUrl) {
      navigator.clipboard.writeText(qrData.customerUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Load a quick sample scenario into the dialogue buffer and audit immediately
  const handleSelectScenario = (scenarioText: string) => {
    setInputText(scenarioText);
    syncDialogueToSession(scenarioText);
    handleAnalyze(scenarioText);
  };

  const progressPercent = ((BATCH_INTERVAL_SECONDS - secondsRemaining) / BATCH_INTERVAL_SECONDS) * 100;
  const hasDialogue = inputText.trim().length > 0;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Navigation & Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to API Dashboard</span>
        </Link>

        {/* Client Session Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {qrData?.sessionId && (
            <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2.5 py-2 rounded-xl hidden sm:inline-block shadow-xs">
              Session: <span className="font-bold text-slate-800">{qrData.sessionId.slice(0, 16)}...</span>
            </span>
          )}

          {/* Direct Open Client Screen Button */}
          {qrData?.customerUrl && (
            <a
              href={qrData.customerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all hover:scale-105"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Client Screen</span>
            </a>
          )}

          {/* Hand-off to Client Button (QR Code) */}
          <button
            type="button"
            onClick={handleOpenQrModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all hover:scale-105"
          >
            <QrCode className="w-4 h-4" />
            <span>📱 QR Code</span>
          </button>

          {/* Reset / New Session */}
          <button
            type="button"
            onClick={handleCreateNewSession}
            title="Start new linked client session"
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-semibold text-xs px-3 py-2 rounded-xl shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
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
              Listens to meeting speech via Google Gemini Multimodal STT, transcribes live into the dialogue buffer, and audits pitch & client Q&A every 60s under MAS Fair Dealing standards.
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

      {/* FR-05 Mandatory Privacy Disclosure Gate (PRD Compliance) */}
      <div className={`mb-6 rounded-3xl p-5 sm:p-6 transition-all border shadow-xs ${
        privacyScriptRead
          ? "bg-emerald-50/80 border-emerald-300"
          : "bg-blue-50/90 border-blue-300 ring-2 ring-blue-200"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-blue-100 text-blue-800 rounded-lg text-[11px] font-black uppercase tracking-wider">
                Mandatory Script (FR-05)
              </span>
              <span className="text-xs font-bold text-slate-800">
                Singapore PDPA & MAS Fair Dealing Disclosure Gate
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Read the following mandatory privacy disclosure aloud to Mdm. Tan before initiating the product pitch:
            </p>
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 italic leading-relaxed shadow-2xs font-medium">
              &ldquo;Mdm. Tan, for your consumer protection under Singapore MAS Fair Dealing guidelines, our meeting audio is analyzed by AI in real time to ensure all policy disclosures are accurate. Please note that camera and facial video data on your mobile screen are processed strictly on your personal device and are <strong className="font-black text-slate-900 not-italic">never recorded, saved, or uploaded to any database</strong>.&rdquo;
            </div>
          </div>

          <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
            <button
              type="button"
              onClick={() => setPrivacyScriptRead((prev) => !prev)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs ${
                privacyScriptRead
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white hover:scale-105"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{privacyScriptRead ? "Script Read & Confirmed" : "Mark as Read Aloud"}</span>
            </button>
            <span className="text-[10px] text-slate-500 font-mono">
              {privacyScriptRead ? "Gate Status: Passed" : "Gate Status: Pending Read"}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Advisor Speech Input vs Live Copilot Telemetry */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Unified Advisory Speech & Control Center */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* 1. Unified Control Bar */}
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

              {/* 60s Batch Timer Progress Bar */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>60-Second Auto-Audit Batch Timer:</span>
                  </div>
                  <span className="font-mono font-bold text-blue-400">
                    {isListening ? `${secondsRemaining}s remaining` : "Timer paused (Mic idle)"}
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${isListening ? progressPercent : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. SpeechListener Audio Visualizer */}
            <SpeechListener
              onTranscript={handleSpeechTranscript}
              isListening={isListening}
              onToggleListening={setIsListening}
              interimTranscript={interimTranscript}
              setInterimTranscript={setInterimTranscript}
              engineMode="browser"
            />

            {/* 3. Meeting Dialogue Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Meeting Dialogue Buffer (Pitch & Client Q&A):
                </label>
                {hasDialogue && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText("");
                      setResult(null);
                      syncDialogueToSession("");
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear buffer</span>
                  </button>
                )}
              </div>
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                placeholder="Spoken words or client Q&A will transcribe and appear here live..."
              />

              {/* Quick One-Click Speech Simulation Pills for Easy Demonstration & Real-Time Sync */}
              <div className="mt-2 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Quick Speech Simulation Pills (Live Sync to Client Screen):
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const text = 'Advisor: "Mdm. Tan, please note that pre-existing conditions like hypertension have a standard 12-month waiting period before full coverage activates."';
                      setInputText(text);
                      syncDialogueToSession(text);
                      handleAnalyze(text);
                    }}
                    className="text-[10px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    💬 Speak: Waiting Period (Clause 4)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = 'Advisor: "Terminating or surrendering this policy within the first 36 months incurs an early surrender penalty of 15% on accumulated surrender value."';
                      setInputText(text);
                      syncDialogueToSession(text);
                      handleAnalyze(text);
                    }}
                    className="text-[10px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    💬 Speak: Surrender Penalty (Clause 3)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = 'Advisor: "This policy provides a guaranteed monthly annuity payout starting at age 62 for 20 years, backed by Singapore statutory regulations."';
                      setInputText(text);
                      syncDialogueToSession(text);
                      handleAnalyze(text);
                    }}
                    className="text-[10px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    💬 Speak: Annuity at 62 (Clause 1)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = 'Advisor: "Under Section 25(5) of the Insurance Act, you have a mandatory duty of disclosure to declare all past medical conditions honestly."';
                      setInputText(text);
                      syncDialogueToSession(text);
                      handleAnalyze(text);
                    }}
                    className="text-[10px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    💬 Speak: Section 25(5) Disclosure
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputText("");
                      setResult(null);
                      syncDialogueToSession("");
                    }}
                    className="text-[10px] font-medium bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 px-2 py-1 rounded-lg transition-colors"
                  >
                    🗑️ Clear (Silent Mode)
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Quick Sample Scenarios */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Or Load Full Scenarios:
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

        {/* Right Column: Real-time Copilot Screen (Dark HUD Mode) */}
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

                {/* Engine Source Transparency Badge */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/70 border border-slate-700/60 rounded-xl text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {result.auditEngine === "google-gemini-live" ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                        <span className="font-bold text-blue-300">Audit Source:</span>
                        <span className="text-slate-200 font-mono text-[10px]">Google Gemini Cloud ({result.modelUsed || "gemini-2.5-flash"})</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-emerald-300">Audit Source:</span>
                        <span className="text-slate-200 text-[10px]">{result.modelUsed || "Vera MAS Compliance Rules Engine (Offline Fallback)"}</span>
                      </>
                    )}
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold ${
                    result.auditEngine === "google-gemini-live"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}>
                    {result.auditEngine === "google-gemini-live" ? "Live GenAI" : "Offline Rule Engine"}
                  </span>
                </div>

                {/* Mirrored Screen Sync Status Banner */}
                {qrData?.sessionId && (
                  <div className="p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl flex items-center justify-between text-xs text-blue-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                      <span className="font-semibold text-blue-100">Mirrored Screen Sync:</span>
                      <span className="text-[11px] text-blue-300">
                        {result.auditedQnAs?.[0]?.topic === "PRE_EXISTING_CONDITION"
                          ? "Synced '12-Month Waiting Period' highlight to client's phone"
                          : result.auditedQnAs?.[0]?.topic === "SURRENDER_PENALTY"
                          ? "Synced 'Early Surrender Penalty' highlight to client's phone"
                          : "Clause tags and disclosures synced to client's phone"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-md">
                      Batch-Synced
                    </span>
                  </div>
                )}

                {/* Live Client Confusion & Hesitation Telemetry Banner */}
                {clientConfusionEvents.length > 0 && (
                  <div className="p-3.5 bg-amber-500/20 border border-amber-400/40 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200 animate-fadeIn">
                    <BrainCircuit className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-amber-300">
                          Client Hesitation / Confusion Flagged at Device:
                        </span>
                        <span className="text-[10px] font-mono bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full">
                          {clientConfusionEvents.length} {clientConfusionEvents.length === 1 ? "Event" : "Events"}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-100/90 leading-relaxed">
                        Client showed confusion during discussion of{" "}
                        <strong className="text-white">
                          {clientConfusionEvents[clientConfusionEvents.length - 1].activeTopic}
                        </strong>{" "}
                        at meeting time{" "}
                        <span className="font-mono text-amber-300">
                          {String(
                            Math.floor(
                              clientConfusionEvents[clientConfusionEvents.length - 1].relativeSeconds / 60
                            )
                          ).padStart(2, "0")}
                          :
                          {String(
                            clientConfusionEvents[clientConfusionEvents.length - 1].relativeSeconds % 60
                          ).padStart(2, "0")}
                        </span>
                        . Please pause to clarify this clause before closing.
                      </p>
                    </div>
                  </div>
                )}

                {/* Way B: Conversational Q&A Audit Section */}
                {result.auditedQnAs && result.auditedQnAs.length > 0 && (
                  <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                        <MessageSquare className="w-4 h-4 text-indigo-400" />
                        <span>Client Q&A Compliance Audit:</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                          Speaker-Turn Analysis
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Mirrored to Client Screen</span>
                        </span>
                      </div>
                    </div>

                    {result.auditedQnAs.map((qna, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border space-y-2 text-xs ${
                          qna.isCompliant
                            ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-200"
                            : "bg-rose-950/40 border-rose-800/60 text-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Topic: {qna.topic || "Q&A"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              qna.isCompliant
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {qna.isCompliant ? "Compliant Advice" : "MAS Violation"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] font-semibold text-slate-300 block">💬 Client Question:</span>
                          <p className="text-white text-xs italic bg-slate-900/50 p-2 rounded-lg mt-0.5">
                            &quot;{qna.clientQuestion}&quot;
                          </p>
                        </div>

                        <div>
                          <span className="text-[11px] font-semibold text-slate-300 block">🗣️ Advisor Answer:</span>
                          <p className="text-slate-200 text-xs italic bg-slate-900/50 p-2 rounded-lg mt-0.5">
                            &quot;{qna.advisorAnswer}&quot;
                          </p>
                        </div>

                        {qna.regulatoryNotice && (
                          <div className="text-[11px] font-mono text-amber-300 bg-amber-950/40 p-1.5 rounded-md">
                            ⚠️ Reference: {qna.regulatoryNotice}
                          </div>
                        )}

                        <p className="text-[11px] text-slate-300 leading-relaxed">{qna.explanation}</p>

                        {qna.compliantScript && (
                          <div className="pt-2 border-t border-slate-700/60 space-y-1">
                            <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Required Corrective Script:</span>
                            </span>
                            <p className="text-xs text-white bg-blue-950/50 p-2 rounded-lg border border-blue-800/40 italic">
                              &quot;{qna.compliantScript}&quot;
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

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
              Google Gemini Multimodal Copilot
            </span>
            <span>MAS Fair Dealing 60s Batch Audit</span>
          </div>
        </div>
      </div>

      {/* QR Code Hand-Off Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Client QR Hand-Off</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Have Mdm. Tan scan this QR code with her personal smartphone camera to review the simplified policy and provide informed digital consent.
            </p>

            {qrLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500">Generating secure QR code...</span>
              </div>
            ) : qrData?.qrCodeDataUrl ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrData.qrCodeDataUrl}
                    alt="Customer Session QR Code"
                    className="w-48 h-48 mx-auto rounded-lg"
                  />
                </div>

                <div className="text-[11px] font-mono text-slate-600 bg-slate-100 py-1.5 px-2.5 rounded-lg truncate">
                  Session: {qrData.sessionId}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                  </button>

                  <Link
                    href={`/customer/${qrData.sessionId}`}
                    target="_blank"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Tab</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-xs text-rose-500">
                Failed to generate QR code. Please try again.
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
