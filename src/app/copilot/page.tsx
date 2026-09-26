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
  Building2,
  FileCheck2,
  Award,
  Download,
  Printer,
  ChevronDown,
  UserCheck,
  Scan,
  Lock,
} from "lucide-react";
import type {
  CopilotAnalysisResult,
  ConfusionEvent,
  AgentAccount,
  Policy,
  ComplianceCertificate,
  LivenessTelemetry,
} from "@/types";
import { SpeechListener } from "@/components/copilot/SpeechListener";
import { DUMMY_POLICIES } from "@/lib/dummy-data";

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
  // Dialogue buffer
  const [inputText, setInputText] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Available Agents and Policies
  const [agentsList, setAgentsList] = useState<AgentAccount[]>([]);
  const [policiesList, setPoliciesList] = useState<Policy[]>(DUMMY_POLICIES);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agt_andi_01");
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("pol_retiresafe_sg");

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

  // MAS Compliance Certificate Receipt Modal
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateData, setCertificateData] = useState<ComplianceCertificate | null>(null);
  const [certLoading, setCertLoading] = useState(false);

  // Mandatory Privacy Disclosure Script State
  const [privacyScriptRead, setPrivacyScriptRead] = useState<boolean>(false);

  // Real-time client confusion and gesture telemetry from paired screen
  const [clientConfusionEvents, setClientConfusionEvents] = useState<ConfusionEvent[]>([]);
  const [clientLiveness, setClientLiveness] = useState<LivenessTelemetry | null>(null);
  const [isSessionSigned, setIsSessionSigned] = useState<boolean>(false);

  // Ref to access current text in timer callback without stale closure
  const inputTextRef = useRef(inputText);
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Fetch agents and policies on mount & check URL params
  useEffect(() => {
    async function loadCatalogAndAgents() {
      try {
        const [agentRes, policyRes] = await Promise.all([
          fetch("/api/agents"),
          fetch("/api/policies"),
        ]);
        if (agentRes.ok) {
          const aData = await agentRes.json();
          if (aData.success && Array.isArray(aData.agents)) {
            setAgentsList(aData.agents);
          }
        }
        if (policyRes.ok) {
          const pData = await policyRes.json();
          if (pData.success && Array.isArray(pData.policies)) {
            setPoliciesList(pData.policies);
          }
        }
      } catch (e) {
        console.error("Failed to load catalog/agents:", e);
      }
    }

    loadCatalogAndAgents();

    // Check localStorage and URL params for agentId or policyId
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vera_active_agent_id");
      if (saved) setSelectedAgentId(saved);

      const params = new URLSearchParams(window.location.search);
      const urlAgent = params.get("agentId");
      const urlPolicy = params.get("policyId");
      if (urlAgent) setSelectedAgentId(urlAgent);
      if (urlPolicy) setSelectedPolicyId(urlPolicy);
    }
  }, []);

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

  // Polling to sync client screen telemetry, gesture agreement, and signed status in real-time (every 1s)
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
          if (data.session?.livenessTelemetry) {
            setClientLiveness(data.session.livenessTelemetry);
            if (data.session.livenessTelemetry.confusionEvents) {
              setClientConfusionEvents(data.session.livenessTelemetry.confusionEvents);
            }
          }
          if (data.session?.status === "CONSENT_SIGNED" || data.session?.consentResult) {
            setIsSessionSigned(true);
          }
        }
      } catch (e) {
        // ignore network blips
      }
    };

    const interval = setInterval(pollConfusion, 1000);
    return () => clearInterval(interval);
  }, [qrData?.sessionId]);

  // Auto-initialize or restore active session on mount
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
              if (data.session.policyId) setSelectedPolicyId(data.session.policyId);
              if (data.session.agentId) setSelectedAgentId(data.session.agentId);
              if (data.session.status === "CONSENT_SIGNED") setIsSessionSigned(true);
              return;
            }
          }
        }

        // Create fresh session if no saved session
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: selectedAgentId,
            customerName: "Mdm. Tan",
            customerPhone: "+65 9123 4567",
            policyId: selectedPolicyId,
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

  // Update session on server when advisor changes policy or agent
  const handlePolicyChange = async (newPolicyId: string) => {
    setSelectedPolicyId(newPolicyId);
    const activeId = qrData?.sessionId || (typeof window !== "undefined" ? localStorage.getItem("vera_copilot_session_id") : null);
    if (activeId) {
      await fetch(`/api/session/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId: newPolicyId }),
      }).catch(() => {});
    }
  };

  const handleAgentChange = async (newAgentId: string) => {
    setSelectedAgentId(newAgentId);
    const activeId = qrData?.sessionId || (typeof window !== "undefined" ? localStorage.getItem("vera_copilot_session_id") : null);
    if (activeId) {
      await fetch(`/api/session/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: newAgentId }),
      }).catch(() => {});
    }
  };

  // Main Audit function with Gemini
  const handleAnalyze = useCallback(async (textToAnalyze?: string) => {
    const text = (textToAnalyze !== undefined ? textToAnalyze : inputTextRef.current).trim();
    if (!text) return;

    setLoading(true);
    setError(null);

    const activeSessionId =
      qrData?.sessionId ||
      (typeof window !== "undefined" ? localStorage.getItem("vera_copilot_session_id") : null) ||
      "sess_copilot_playground_sg";

    try {
      const res = await fetch("/api/copilot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          text,
          context: {
            agentId: selectedAgentId,
            policyId: selectedPolicyId,
          },
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
  }, [qrData?.sessionId, selectedAgentId, selectedPolicyId]);

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

  // Handle incoming live speech transcript with trailing overlap deduplication
  const handleSpeechTranscript = useCallback((newText: string) => {
    const chunk = newText.trim();
    if (!chunk) return;

    setInputText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        syncDialogueToSession(chunk);
        return chunk;
      }

      // Check for exact duplicate tail
      if (trimmed.toLowerCase().endsWith(chunk.toLowerCase())) {
        return trimmed;
      }

      // Check for overlap of trailing words (e.g., if new chunk begins with the tail of trimmed text)
      const prevWords = trimmed.split(/\s+/);
      const chunkWords = chunk.split(/\s+/);
      const maxOverlap = Math.min(prevWords.length, chunkWords.length);
      let overlapCount = 0;

      for (let n = maxOverlap; n > 0; n--) {
        const prevTail = prevWords.slice(-n).join(" ").toLowerCase();
        const chunkHead = chunkWords.slice(0, n).join(" ").toLowerCase();
        if (prevTail === chunkHead) {
          overlapCount = n;
          break;
        }
      }

      let textToAdd = chunk;
      if (overlapCount > 0) {
        textToAdd = chunkWords.slice(overlapCount).join(" ");
      }

      if (!textToAdd.trim()) {
        return trimmed;
      }

      const updated = `${trimmed} ${textToAdd.trim()}`;
      syncDialogueToSession(updated);
      return updated;
    });
  }, [syncDialogueToSession]);

  // Open QR Hand-off Modal & Initialize Session
  const handleOpenQrModal = async () => {
    setShowQrModal(true);
    setCopiedLink(false);

    if (qrData) return;

    try {
      setQrLoading(true);
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId,
          customerName: "Mdm. Tan",
          customerPhone: "+65 9123 4567",
          policyId: selectedPolicyId,
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
          agentId: selectedAgentId,
          customerName: "Mdm. Tan",
          customerPhone: "+65 9123 4567",
          policyId: selectedPolicyId,
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
        setIsSessionSigned(false);
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

  // Load Certificate / Receipt
  const handleOpenCertificate = async () => {
    const activeId = qrData?.sessionId || (typeof window !== "undefined" ? localStorage.getItem("vera_copilot_session_id") : null);
    if (!activeId) return;

    setShowCertificateModal(true);
    setCertLoading(true);

    try {
      const res = await fetch(`/api/session/${activeId}/receipt`);
      const data = await res.json();
      if (data.success && data.certificate) {
        setCertificateData(data.certificate);
      }
    } catch (e) {
      console.error("Failed to fetch certificate:", e);
    } finally {
      setCertLoading(false);
    }
  };

  const handleSelectScenario = (scenarioText: string) => {
    setInputText(scenarioText);
    syncDialogueToSession(scenarioText);
    handleAnalyze(scenarioText);
  };

  const activeAgent = agentsList.find((a) => a.id === selectedAgentId) || {
    id: "agt_andi_01",
    fullName: "Andi Wijaya, ChFC",
    repNumber: "MAS-REP-882910",
    agencyFirm: "Vera Financial Advisory Pte Ltd",
    role: "SENIOR_ADVISOR",
    complianceRating: 98.6,
  };

  const activePolicy = policiesList.find((p) => p.id === selectedPolicyId) || policiesList[0];

  const progressPercent = ((BATCH_INTERVAL_SECONDS - secondsRemaining) / BATCH_INTERVAL_SECONDS) * 100;
  const hasDialogue = inputText.trim().length > 0;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Controls & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Client Session & Hand-off Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Certificate Action (if signed or for verification) */}
          {isSessionSigned && (
            <button
              type="button"
              onClick={handleOpenCertificate}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all hover:scale-105"
            >
              <Award className="w-4 h-4" />
              <span>MAS Audit Certificate</span>
            </button>
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
            <span>QR Hand-Off</span>
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

      {/* Main Header & Branding */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                VERA AI Sales Copilot & Speech Listener
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                MAS Aligned
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Listens to advisory speech in real-time, transcribes live into the dialogue buffer, and audits pitch & client Q&A every 60s under MAS Fair Dealing standards.
            </p>
          </div>

          {/* Active Advisor Card */}
          <div className="flex items-center gap-3 bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shrink-0">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="font-bold flex items-center gap-2">
                <span>{activeAgent.fullName}</span>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30">
                  {activeAgent.repNumber}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">{activeAgent.agencyFirm}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Selector Bar: Select Active Adviser & Target Policy */}
        <div className="grid sm:grid-cols-2 gap-4 mt-6 pt-2">
          {/* Advisor Selector */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Certified Financial Adviser</span>
              </label>
              <Link href="/dev" className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1">
                <span>Switch in /dev</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                  {activeAgent.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {activeAgent.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {activeAgent.repNumber} · {activeAgent.agencyFirm}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                <Lock className="w-2.5 h-2.5" />
                Locked
              </span>
            </div>
          </div>

          {/* Policy Catalog Selector */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active Product Pitch / Policy</span>
              </label>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {activePolicy?.code}
              </span>
            </div>
            <select
              value={selectedPolicyId}
              onChange={(e) => handlePolicyChange(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
            >
              {policiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type.replace(/_/g, " ")}) - S${p.premiumAmount}/mo
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mandatory Privacy Disclosure Gate (FR-05) */}
      <div
        className={`mb-6 rounded-3xl p-5 sm:p-6 transition-all border shadow-xs ${
          privacyScriptRead
            ? "bg-emerald-50/80 border-emerald-300"
            : "bg-blue-50/90 border-blue-300 ring-2 ring-blue-200"
        }`}
      >
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
              &ldquo;Mdm. Tan, for your consumer protection under Singapore MAS Fair Dealing guidelines, our meeting audio is analyzed by VERA AI in real time to ensure all policy disclosures are accurate. Please note that camera and facial video data on your mobile screen are processed strictly on your personal device and are <strong className="font-black text-slate-900 not-italic">never recorded, saved, or uploaded to any database</strong>.&rdquo;
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
        {/* Left Column: Advisory Speech & Control Center */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* Control Bar */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                      isListening
                        ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <Square className="w-4 h-4 fill-current" />
                        <span>Stop & Audit</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>Start Live Listening</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isListening ? "bg-emerald-400 animate-ping" : "bg-slate-500"
                      }`}
                    />
                    <span className="text-xs text-slate-300 font-mono">
                      {isListening ? "Transcribing Voice..." : "Mic Idle"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAnalyze()}
                    disabled={loading || !hasDialogue}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-xs"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Audit Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputText("");
                      setInterimTranscript("");
                      syncDialogueToSession("");
                    }}
                    title="Clear Buffer"
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Interval Progress Bar */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>60s MAS Auto-Audit Batch</span>
                  </span>
                  <span>{isListening ? `${secondsRemaining}s remaining` : "Paused"}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all duration-1000"
                    style={{ width: isListening ? `${progressPercent}%` : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Browser Speech Listener Component */}
            <SpeechListener
              isListening={isListening}
              onToggleListening={setIsListening}
              onTranscript={handleSpeechTranscript}
              interimTranscript={interimTranscript}
              setInterimTranscript={setInterimTranscript}
            />

            {/* Spoken Dialogue Buffer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Live Meeting Dialogue Buffer (Synced to Client Screen)</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {inputText.length} chars
                </span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  syncDialogueToSession(e.target.value);
                }}
                placeholder="Spoken words and client Q&A will stream here live as you talk with Mdm. Tan, or select a scenario below..."
                rows={7}
                className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed text-slate-800"
              />
              {interimTranscript && (
                <div className="mt-1.5 p-2 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-blue-700 italic">
                  Hearing: &ldquo;{interimTranscript}&rdquo;
                </div>
              )}
            </div>

            {/* Quick Test Scenarios */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Simulate Scenario Dialogue (Quick Test)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleSelectScenario(sc.text)}
                    className="text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 transition-colors font-medium flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{sc.label}</span>
                    <Sparkles className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Copilot Audit Telemetry & Cheat Sheet */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            {/* Header & Provenance */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-blue-400" />
                <h2 className="font-bold text-sm text-white">MAS Compliance Copilot HUD</h2>
              </div>
              {result?.auditEngine && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {result.auditEngine === "google-gemini-live" ? "Google Gemini 3.5 Flash-Lite" : "MAS Regulatory Fallback"}
                </span>
              )}
            </div>

            {/* Paired Client Real-Time Telemetry & Gesture Agreement */}
            {(clientLiveness || qrData?.sessionId) && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Scan className="w-4 h-4 text-blue-400" />
                    <span>Client Gesture & Biometric Telemetry</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Paired
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Calibration & Face Match */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block">Identity & Mesh</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-200 text-[11px]">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>
                        {clientLiveness?.gestureAgreement?.faceMatchScore !== undefined
                          ? `Match: ${Math.round(clientLiveness.gestureAgreement.faceMatchScore * 100)}% (${clientLiveness.gestureAgreement.faceMatchPassed ? "Verified" : "Low"})`
                          : clientLiveness?.calibratedFaceMeshAvailable
                          ? "Mesh Calibrated (Stored)"
                          : "Calibrating..."}
                      </span>
                    </div>
                  </div>

                  {/* Gesture Agreement */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block">Recap Agreement</span>
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      {clientLiveness?.gestureAgreement?.nodDetected ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Head Nod Confirmed
                        </span>
                      ) : clientLiveness?.gestureAgreement?.shakeDetected ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Disagree / Shake
                        </span>
                      ) : isSessionSigned ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Signed & Completed
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> Awaiting Gesture
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Client Confusion Events if any */}
                {clientConfusionEvents.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{clientConfusionEvents.length} confusion hesitation point(s) recorded during live discussion</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="my-4 p-3 bg-rose-950/60 border border-rose-800 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Audit Results */}
            {result ? (
              <div className="space-y-4 my-4 animate-in fade-in">
                {/* Flag & Confidence Banner */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    result.warningFlags === "GREEN"
                      ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
                      : result.warningFlags === "YELLOW"
                      ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                      : "bg-rose-950/40 border-rose-800/80 text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/10">
                      {result.warningFlags === "GREEN" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider">
                        Compliance Status: {result.warningFlags}
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {result.isCompliant
                          ? "Advisory statements satisfy MAS Fair Dealing standard."
                          : "Potential mis-selling or aggressive pitch patterns flagged."}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono opacity-70 block">Confidence</span>
                    <span className="text-sm font-black font-mono">
                      {Math.round(result.confidenceScore * 100)}%
                    </span>
                  </div>
                </div>

                {/* Audited Q&A Extraction */}
                {result.auditedQnAs && result.auditedQnAs.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Audited Client Q&A Exchanges
                    </span>
                    {result.auditedQnAs.map((qna, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-300">Client: &ldquo;{qna.clientQuestion}&rdquo;</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              qna.isCompliant
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {qna.isCompliant ? "COMPLIANT" : "FLAGGED"}
                          </span>
                        </div>
                        <div className="text-slate-300 italic pl-2 border-l-2 border-slate-600">
                          Advisor: &ldquo;{qna.advisorAnswer}&rdquo;
                        </div>
                        {qna.regulatoryNotice && (
                          <div className="text-[10px] font-mono text-amber-400 bg-amber-950/40 p-1.5 rounded-lg">
                            Regulatory Notice: {qna.regulatoryNotice}
                          </div>
                        )}
                        {!qna.isCompliant && qna.compliantScript && (
                          <div className="bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl text-[11px] text-emerald-200">
                            <strong className="block text-emerald-300 mb-0.5 font-bold">
                              Recommended Compliant Response:
                            </strong>
                            &ldquo;{qna.compliantScript}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Speaker Turn Differentiation Feed (Advisor vs Prospect Client) */}
                {result.speakerTurns && result.speakerTurns.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Dialogue Turns (Advisor vs Prospect Client)
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {result.speakerTurns.map((turn, tIdx) => (
                        <div
                          key={tIdx}
                          className={`p-2 rounded-xl text-xs flex items-start gap-2 border ${
                            turn.speaker === "CLIENT"
                              ? "bg-blue-950/40 border-blue-800/60 text-blue-200"
                              : "bg-slate-800/60 border-slate-700/60 text-slate-200"
                          }`}
                        >
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 ${
                              turn.speaker === "CLIENT"
                                ? "bg-blue-600 text-white"
                                : "bg-slate-700 text-slate-200"
                            }`}
                          >
                            {turn.speaker === "CLIENT" ? "Prospect Client" : "Advisor Andi"}
                          </span>
                          <span className="text-[11px] leading-relaxed">{turn.text}</span>
                        </div>
                      ))}
                    </div>
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
                  Click &quot;Start Live Listening&quot; to speak, or load a scenario on the left, then audit with VERA AI.
                </p>
              </div>
            )}
          </div>

          {/* Footer Badge */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              VERA AI Multi-Turn Copilot
            </span>
            <span>MAS Fair Dealing 60s Batch Engine</span>
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

      {/* MAS Compliance Audit Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    MAS Fair Dealing Compliance Certificate
                  </h3>
                  <p className="text-xs text-slate-500">Official Immutable Audit Record & Digital Signature</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {certLoading || !certificateData ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Generating cryptographic certificate...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-slate-700">
                {/* Hash & Verification Badge */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Certificate ID: {certificateData.certificateId}
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      CRYPTOGRAPHICALLY VERIFIED
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 truncate">
                    SHA-256 Digest: {certificateData.certificateHash}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Insured Customer:</span>
                    <span className="font-bold text-slate-900 text-sm">{certificateData.customer.name}</span>
                    <span className="text-[11px] text-slate-500 block">{certificateData.customer.phone}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Licensed MAS Representative:</span>
                    <span className="font-bold text-slate-900 text-sm">{certificateData.advisor.fullName}</span>
                    <span className="text-[11px] text-indigo-700 font-mono block">{certificateData.advisor.repNumber}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Policy Product:</span>
                    <span className="font-bold text-slate-900">{certificateData.policy.name}</span>
                    <span className="text-[11px] text-slate-500 block">
                      Sum Assured: S${certificateData.policy.coverageAmount.toLocaleString("en-SG")}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Audit SLA Classification:</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {certificateData.auditSummary.fastTrackApproved ? "Fast-Track (1-Day SLA)" : "Manual Review (3-4 Days)"}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Liveness Score: {certificateData.auditSummary.livenessScore}%
                    </span>
                  </div>
                </div>

                {/* Statutory Acts Audited */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-1.5">
                  <span className="font-bold text-blue-950 block text-[11px]">
                    Singapore Statutory Compliance Checklist:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-blue-900">
                    {certificateData.auditSummary.statutoryActsAudited.map((act, idx) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>

                {/* Signature View */}
                {certificateData.signatureDataUrl && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Customer Digital Signature on File:
                    </span>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={certificateData.signatureDataUrl}
                        alt="Customer Signature"
                        className="h-16 w-auto object-contain"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Timestamp: {new Date(certificateData.signedAt).toLocaleString("en-SG")}
                    </span>
                  </div>
                )}

                {/* Legal Disclaimer */}
                <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
                  {certificateData.masRegistryDisclaimer}
                </p>

                {/* Modal Actions */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
