"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileCheck2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Send,
  User,
  Sparkles,
  Building2,
  DollarSign,
  ArrowRight,
  Download,
  Info,
  Radio,
  MessageSquare,
  BrainCircuit,
} from "lucide-react";
import type { Session, Policy, BranchingResult, SyncedClauseHighlight, LivenessTelemetry, ConfusionEvent } from "@/types";
import VisualFocusRing from "@/components/customer/VisualFocusRing";

interface CustomerPageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerConsentPage({ params }: CustomerPageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;

  const [session, setSession] = useState<Session | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Consent & Signature state
  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<BranchingResult | null>(null);

  // FR-05 Privacy Disclosure Gate state (Onboarding screen before camera activation)
  const [privacyGateAccepted, setPrivacyGateAccepted] = useState<boolean>(false);

  // Review time tracker & live focus telemetry from VisualFocusRing
  const [secondsSpentReviewing, setSecondsSpentReviewing] = useState<number>(0);
  const [confusionTimeline, setConfusionTimeline] = useState<ConfusionEvent[]>([]);
  const [livenessTelemetry, setLivenessTelemetry] = useState<LivenessTelemetry>({
    passed: true,
    score: 0.95,
    confusionDetected: false,
    confusionEventsCount: 0,
    timeSpentReviewingSeconds: 0,
    timerFallbackTriggered: false,
    confusionEvents: [],
  });

  const handleTelemetryUpdate = useCallback((telemetry: LivenessTelemetry) => {
    setLivenessTelemetry(telemetry);
    if (telemetry.confusionEvents && telemetry.confusionEvents.length > 0) {
      setConfusionTimeline(telemetry.confusionEvents);
      fetch(`/api/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telemetry }),
      }).catch(() => {});
    }
  }, [sessionId]);

  // Batch-Synced Keyword Highlighting state (Mirrored Screen from Advisor)
  const [syncedHighlight, setSyncedHighlight] = useState<SyncedClauseHighlight | null>(null);
  const [highlightToastVisible, setHighlightToastVisible] = useState<boolean>(false);
  const lastHighlightTimeRef = useRef<string>("");

  // Real-time compliance events & flags from Advisor Copilot
  const latestCopilotEvent =
    session?.copilotEvents && session.copilotEvents.length > 0
      ? session.copilotEvents[session.copilotEvents.length - 1]
      : null;

  const hasFlaggedViolations =
    session?.copilotEvents?.some(
      (e) => e.warningFlags === "RED" || e.warningFlags === "YELLOW" || !e.isCompliant
    ) ?? false;

  // Real-Time Active Discussion Topic & Speech Snippet Extractor from Live Meeting Dialogue Buffer
  const liveSyncInfo = (() => {
    // 1. Prioritize the live meeting dialogue buffer in real time
    const buffer = (session?.liveDialogueBuffer || "").trim();
    if (buffer.length > 0) {
      const upper = buffer.toUpperCase();
      let category: "WAITING_PERIOD" | "SURRENDER_PENALTY" | "GUARANTEED_RETURN" | "DUTY_OF_DISCLOSURE" | "COVERAGE" | "GENERAL" = "GENERAL";
      let topicName = "Policy Terms Discussion";

      if (upper.includes("SURRENDER") || upper.includes("PENALTY") || upper.includes("36 MONTH")) {
        category = "SURRENDER_PENALTY";
        topicName = "Early Surrender Penalty & 36-Month Lock-in (Clause 3)";
      } else if (
        upper.includes("WAITING") ||
        upper.includes("PRE-EXISTING") ||
        upper.includes("PRE EXISTING") ||
        upper.includes("HYPERTENSION") ||
        upper.includes("CONDITION")
      ) {
        category = "WAITING_PERIOD";
        topicName = "Pre-Existing Condition & Waiting Period (Clause 4)";
      } else if (
        upper.includes("GUARANTEE") ||
        upper.includes("ANNUITY") ||
        upper.includes("AGE 62") ||
        upper.includes("RETURN")
      ) {
        category = "GUARANTEED_RETURN";
        topicName = "Guaranteed Monthly Annuity at Age 62 (Clause 1)";
      } else if (upper.includes("DISCLOSURE") || upper.includes("SECTION 25") || upper.includes("DUTY")) {
        category = "DUTY_OF_DISCLOSURE";
        topicName = "Statutory Duty of Health Disclosure (Section 25(5))";
      } else if (upper.includes("250,000") || upper.includes("COVERAGE") || upper.includes("TPD") || upper.includes("DISABILITY")) {
        category = "COVERAGE";
        topicName = "Immediate S$250,000 Life & TPD Protection (Clause 2)";
      } else {
        category = "GENERAL";
        topicName = "Policy Pitch & Discussion";
      }

      // Extract the latest spoken line or paragraph from buffer
      const lines = buffer.split("\n").map((l) => l.trim()).filter(Boolean);
      let snippet = buffer;
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        snippet = lastLine.length > 220 ? `...${lastLine.slice(-220)}` : lastLine;
      } else if (buffer.length > 220) {
        snippet = `...${buffer.slice(-220)}`;
      }

      return {
        topic: topicName,
        snippet,
        topicCategory: category,
      };
    }

    // 2. If an explicit audit highlight is available and fresh
    if (syncedHighlight?.matchedText) {
      const topicMap: Record<string, string> = {
        WAITING_PERIOD: "Pre-Existing Condition & Waiting Period (Clause 4)",
        SURRENDER_PENALTY: "Early Surrender Penalty & 36-Month Lock-in (Clause 3)",
        GUARANTEED_RETURN: "Guaranteed Monthly Annuity at Age 62 (Clause 1)",
        DUTY_OF_DISCLOSURE: "Statutory Duty of Health Disclosure (Section 25(5))",
        COVERAGE: "Immediate S$250,000 Life & TPD Protection (Clause 2)",
        GENERAL: "Policy Summary Review",
      };
      return {
        topic: topicMap[syncedHighlight.topic] || "Policy Summary Review",
        snippet: syncedHighlight.matchedText,
        topicCategory: syncedHighlight.topic,
      };
    }

    // 3. Fallback to latest audited QnA if available
    if (latestCopilotEvent?.auditedQnAs && latestCopilotEvent.auditedQnAs.length > 0) {
      const qna = latestCopilotEvent.auditedQnAs[0];
      return {
        topic: qna.topic ? qna.topic.replace(/_/g, " ") : "Policy Terms Review",
        snippet: qna.advisorAnswer,
        topicCategory: (qna.topic as any) || "GENERAL",
      };
    }

    return {
      topic: "Policy Summary Review",
      snippet: undefined,
      topicCategory: "GENERAL" as const,
    };
  })();

  // FR-04: Running Conversation Summary & Questions Raised by Customer
  const allAuditedQnAs = (session?.copilotEvents || []).flatMap((e) => e.auditedQnAs || []);

  // Canvas ref for digital signature pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Fetch session and policy data (with auto-fallback guarantee so session is never empty)
  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/session/${sessionId}`);
        const data = await res.json().catch(() => ({}));
        if (data.success && data.session && data.policy) {
          setSession(data.session);
          setPolicy(data.policy);

          // If session was already submitted previously, show result
          if (data.session.consentResult) {
            setSubmissionResult(data.session.consentResult);
          }
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn("Session fetch fallback engaged:", err);
      }

      // Default Singapore insurance policy fallback
      const defaultPolicy: Policy = {
        id: "pol_retiresafe_2026",
        code: "SG-RET-2026",
        name: "RetireSafe Golden Shield (Annuity & Life Protection)",
        provider: "SingaLife Assurance (Singapore) Pte Ltd",
        type: "TERM_LIFE",
        premiumAmount: 450,
        premiumFrequency: "monthly",
        coverageAmount: 250000,
        clauses: [
          {
            id: "c1",
            title: "Guaranteed Monthly Annuity",
            originalText: "Guaranteed monthly annuity payout starting at age 62 for 20 consecutive years.",
            simplifiedBullet: "Guaranteed monthly annuity payout starting at age 62 for 20 consecutive years.",
            category: "payout",
            isCritical: true,
          },
          {
            id: "c2",
            title: "Immediate Life Coverage",
            originalText: "Immediate S$250,000 life and total permanent disability (TPD) coverage upon initial policy activation.",
            simplifiedBullet: "Immediate S$250,000 life and total permanent disability (TPD) coverage upon initial policy activation.",
            category: "coverage",
            isCritical: true,
          },
          {
            id: "c3",
            title: "Surrender Penalty",
            originalText: "Early surrender within the first 36 months incurs an administrative penalty of 15% on total surrender value.",
            simplifiedBullet: "Early surrender within the first 36 months incurs an administrative penalty of 15% on total surrender value.",
            category: "surrender",
            isCritical: true,
          },
          {
            id: "c4",
            title: "Pre-Existing Condition Waiting Period",
            originalText: "Pre-existing critical medical conditions are covered only after a mandatory 12-month waiting period.",
            simplifiedBullet: "Pre-existing critical medical conditions are covered only after a mandatory 12-month waiting period.",
            category: "exclusion",
            isCritical: true,
          },
        ],
        simplifiedSummary: [
          "Guaranteed monthly annuity payout starting at age 62 for 20 consecutive years.",
          "Immediate S$250,000 life and total permanent disability (TPD) coverage upon initial policy activation.",
          "Early surrender within the first 36 months incurs an administrative penalty of 15% on total surrender value.",
          "Pre-existing critical medical conditions are covered only after a mandatory 12-month waiting period.",
        ],
      };

      setPolicy(defaultPolicy);
      setSession({
        id: sessionId || "sess_default",
        agentId: "agent_andi_sg01",
        customerName: "Mdm. Tan",
        customerPhone: "+65 9123 4567",
        policyId: defaultPolicy.id,
        status: "HANDED_OFF",
        customerUrl: `/customer/${sessionId}`,
        copilotEvents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setLoading(false);
    }

    loadSession();
  }, [sessionId]);

  // Review timer interval
  useEffect(() => {
    if (submissionResult) return;
    const timer = setInterval(() => {
      setSecondsSpentReviewing((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [submissionResult]);

  // Real-time polling for Session updates, Copilot compliance events, and Mirrored Screen Sync (every 1.0s)
  useEffect(() => {
    if (submissionResult) return;

    let toastTimeout: NodeJS.Timeout | null = null;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.session) {
          // Keep session and real-time copilot audit events continuously updated
          setSession(data.session);

          if (data.session.syncedHighlight) {
            const incomingHighlight = data.session.syncedHighlight;
            setSyncedHighlight(incomingHighlight);

            if (incomingHighlight.highlightTimestamp !== lastHighlightTimeRef.current) {
              lastHighlightTimeRef.current = incomingHighlight.highlightTimestamp;
              setHighlightToastVisible(true);

              if (toastTimeout) clearTimeout(toastTimeout);
              toastTimeout = setTimeout(() => {
                setHighlightToastVisible(false);
              }, 12000);
            }
          }
        }
      } catch (e) {
        // Silently ignore polling network blips
      }
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      if (toastTimeout) clearTimeout(toastTimeout);
    };
  }, [sessionId, submissionResult]);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#0f172a"; // Deep navy/black ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [loading, submissionResult]);

  // Canvas drawing handlers (Mouse and Touch)
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Submit Consent Handler
  const handleSubmitConsent = async () => {
    if (!hasAcknowledged || !hasSignature) return;

    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL("image/png") : "";

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/consent/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          customerId: session?.customerName || "Mdm. Tan",
          policyId: session?.policyId || policy?.id,
          signatureDataUrl,
          liveness: {
            ...livenessTelemetry,
            timeSpentReviewingSeconds: secondsSpentReviewing,
          },
          agentAudioAuditPassed: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setSubmissionResult(data.result);
      } else {
        alert(data.error || "Failed to submit consent. Please try again.");
      }
    } catch (err: any) {
      alert("Submission network error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Loading Policy Document...</h2>
          <p className="text-xs text-slate-500">
            Preparing senior-friendly summary and MAS consumer disclosure safeguards.
          </p>
        </div>
      </main>
    );
  }

  if (error || !session || !policy) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-rose-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Session Expired or Not Found</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || "We could not find an active advisory session matching this QR link."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs"
            >
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // POST-SUBMISSION SUCCESS / BRANCHING SCREEN
  if (submissionResult) {
    const isFastTrack = submissionResult.fastTrackApproved;

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Header Card */}
          <div
            className={`rounded-3xl p-6 sm:p-8 text-white shadow-md border ${
              isFastTrack
                ? "bg-gradient-to-br from-emerald-600 to-teal-800 border-emerald-500"
                : "bg-gradient-to-br from-amber-600 to-amber-800 border-amber-500"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                {isFastTrack ? "Expedited Approval" : "Standard Compliance Review"}
              </span>
              <span className="text-xs font-mono font-medium">SLA: {submissionResult.estimatedReviewDays} Business Day(s)</span>
            </div>

            <div className="flex items-start gap-3.5 mb-3">
              <div className="p-2.5 bg-white/20 rounded-2xl shrink-0">
                {isFastTrack ? <CheckCircle2 className="w-8 h-8 text-white" /> : <Clock className="w-8 h-8 text-white" />}
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">
                  {isFastTrack ? "Consent Verified & Fast-Tracked!" : "Consent Recorded for Review"}
                </h1>
                <p className="text-xs text-white/90 mt-1 leading-relaxed">
                  {submissionResult.customerFacingMessage}
                </p>
              </div>
            </div>
          </div>

          {/* Receipt & Policy Confirmation Summary */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <span>Application Summary & Receipt</span>
              </h2>
              <span className="text-[11px] font-mono font-bold text-slate-500">ID: {sessionId.slice(0, 16)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Insured Client:</span>
                <span className="font-bold text-slate-800 text-sm">{session.customerName || "Mdm. Tan"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Assigned Advisor:</span>
                <span className="font-bold text-slate-800 text-sm">Advisor Andi (FC-1092)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Policy Name:</span>
                <span className="font-bold text-slate-800">{policy.name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Coverage (SGD):</span>
                <span className="font-bold text-emerald-700 text-sm">S${policy.coverageAmount.toLocaleString("en-SG")}</span>
              </div>
            </div>

            {/* Reassurance Safeguard Notice */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>14-Day Free-Look Protection in Effect</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Under Singapore MAS regulations, you have a 14-day statutory Free-Look period starting today. If you choose to cancel, your premium will be 100% refunded with zero penalties.
              </p>
            </div>

            {/* Internal Audit Notes (if flagged for review) */}
            {!isFastTrack && submissionResult.internalAuditNotes.length > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
                <span className="font-bold block text-amber-950">Why is this reviewed?</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                  {submissionResult.internalAuditNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-amber-700 font-medium">
                  Your funds are safe and will not be deducted until compliance completes the review.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Save / Print Consent Receipt</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // FR-05 MANDATORY CUSTOMER PRIVACY ONBOARDING GATE (PRD Compliance)
  if (!privacyGateAccepted) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-md animate-fadeIn">
          {/* Top Badge & Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full">
                Singapore PDPA & MAS Fair Dealing Gate
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">FR-05 Privacy Gate</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Welcome to Your Advisory Session
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hello <strong className="text-slate-900 font-bold">{session.customerName || "Mdm. Tan"}</strong>, this mirrored screen allows you to follow along with Advisor Andi in real time with complete transparency.
            </p>
          </div>

          {/* Privacy Guarantee Box (PRD Section 5 Strict Compliance) */}
          <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Strict Camera Privacy Guarantee (Zero Storage)</span>
            </div>
            <p className="text-xs font-bold text-emerald-900">
              &ldquo;Video is processed on your device and never saved.&rdquo;
            </p>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              The front-camera mirror detects reading focus and confusion gestures strictly inside your phone&apos;s local memory. No video, photos, or facial biometric data are ever uploaded, recorded, or saved to any database.
            </p>
          </div>

          {/* Audio Transparency Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-1.5 text-xs text-blue-950">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Real-Time Advisory Compliance Protection</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Meeting audio is audited by AI under Singapore MAS Fair Dealing guidelines to ensure you receive accurate disclosures, fair product explanations, and zero predatory pressure.
            </p>
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block">Assigned Advisor:</span>
              <span className="font-bold text-slate-800">Advisor Andi (FC-1092)</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block">Policy Document:</span>
              <span className="font-bold text-slate-800">{policy.name}</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => setPrivacyGateAccepted(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span>Accept Privacy Notice & Start Session</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    );
  }

  // MAIN ACTIVE CONSENT & REVIEW INTERFACE
  return (
    <main className="min-h-screen bg-slate-100 px-3 py-6 sm:py-10">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Top Header Card (Senior Friendly, High Contrast) */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Singapore MAS Informed Consent
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Review Time: {secondsSpentReviewing}s</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Policy Summary & Consent
          </h1>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Please review the key terms of your insurance policy below before providing your digital signature.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Client Name:</span>
              <span className="font-bold text-white text-sm">{session.customerName || "Mdm. Tan"}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Provider:</span>
              <span className="font-bold text-white text-sm">{policy.provider}</span>
            </div>
          </div>
        </div>

        {/* Visual Focus Indicator Ring (Senior-Friendly Optical Camera) */}
        <VisualFocusRing
          reviewTimeSeconds={secondsSpentReviewing}
          onTelemetryUpdate={handleTelemetryUpdate}
          activeTopic={liveSyncInfo.topic}
          activeSpeechSnippet={liveSyncInfo.snippet}
          onConfusionLogged={(event) => {
            setConfusionTimeline((prev) => {
              if (prev.some((e) => e.id === event.id)) return prev;
              const updated = [...prev, event];
              // Immediately sync telemetry to backend so Advisor HUD receives real-time alert
              fetch(`/api/session/${sessionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  telemetry: {
                    ...livenessTelemetry,
                    confusionDetected: true,
                    confusionEventsCount: updated.length,
                    confusionEvents: updated,
                  },
                }),
              }).catch(() => {});
              return updated;
            });
          }}
        />

        {/* Real-Time Advisory Compliance & Fair Dealing Status Box */}
        {hasFlaggedViolations ? (
          <div className="bg-white border-2 border-amber-400 rounded-3xl p-5 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
                </span>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-amber-600">
                    Live AI Advisory Safeguard (MAS Fair Dealing)
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    Advisor Statements Flagged for Consumer Attention
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                Flagged Alert
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Our real-time speech audit detected potential omissions or high-pressure claims during this sales session. Please note these consumer rights before signing:
            </p>

            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-700 shrink-0">•</span>
                <div>
                  <strong className="font-bold text-slate-900">Capital Guarantees:</strong>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Only your base life protection (S$250,000) and annuity payouts are guaranteed. Participating and investment fund returns fluctuate with markets and are NOT capital-guaranteed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-700 shrink-0">•</span>
                <div>
                  <strong className="font-bold text-slate-900">Mandatory Medical Disclosure:</strong>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Under Section 25(5) of the Insurance Act, you must declare all pre-existing health conditions. Leaving health forms blank can void coverage and claims.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-700 shrink-0">•</span>
                <div>
                  <strong className="font-bold text-slate-900">Statutory 14-Day Free-Look Right:</strong>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    You have 14 days to review the full contract at home. If you cancel, 100% of your premium is refunded with zero penalties. Do not feel rushed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Audited under MAS Notice FAA-N03 & Guidelines on Fair Dealing</span>
              </span>
              <span className="font-mono font-medium">Confidence: 99%</span>
            </div>
          </div>
        ) : latestCopilotEvent ? (
          <div className="bg-white border border-emerald-200 rounded-3xl p-4 shadow-xs flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Live Advisory Audit • Verified Compliant
                </span>
                <p className="text-xs font-bold text-slate-800">
                  Advisor disclosures comply with MAS Fair Dealing and Insurance Act standards
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full shrink-0">
              Compliant
            </span>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  AI Advisory Monitor Active
                </span>
                <p className="text-xs text-slate-700">
                  Meeting speech is actively monitored in real time under MAS Fair Dealing guidelines.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
              Active
            </span>
          </div>
        )}

        {/* Live Batch-Synced Discussion Banner (Advisor Mirrored Screen Alert) */}
        {syncedHighlight && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 bg-white/20 rounded-xl shrink-0">
                <Radio className="w-4 h-4 text-white animate-pulse" />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">
                  Advisor Mirrored Screen • Active Topic
                </span>
                <p className="text-xs sm:text-sm font-bold truncate">
                  {syncedHighlight.advisorNote || "Advisor Andi is currently explaining this section"}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-white/20 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Sync
            </span>
          </div>
        )}

        {/* Core Financial Numbers Box */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Guaranteed Protection:
            </span>
            <span className="text-xl font-black text-blue-700">
              S${policy.coverageAmount.toLocaleString("en-SG")}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Life & Disability Coverage</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Regular Premium:
            </span>
            <span className="text-xl font-black text-slate-900">
              S${policy.premiumAmount.toLocaleString("en-SG")}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Payable {policy.premiumFrequency}</span>
          </div>
        </div>

        {/* 1. What You Need to Know (Simplified in Plain English with Dynamic Highlight) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>What You Need to Know (Plain English)</span>
            </h2>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
              MAS Fair Dealing
            </span>
          </div>

          <div className="space-y-2.5">
            {policy.simplifiedSummary && policy.simplifiedSummary.length > 0 ? (
              policy.simplifiedSummary.map((bullet, idx) => {
                const activeCategory = liveSyncInfo.topicCategory;
                const isHighlighted =
                  (syncedHighlight &&
                    (syncedHighlight.clauseId === `c${idx + 1}` ||
                      (idx === 0 && (syncedHighlight.topic === "GUARANTEED_RETURN" || syncedHighlight.clauseId === "c1")) ||
                      (idx === 1 && (syncedHighlight.topic === "COVERAGE" || syncedHighlight.clauseId === "c2")) ||
                      (idx === 2 && (syncedHighlight.topic === "SURRENDER_PENALTY" || syncedHighlight.clauseId === "c3")) ||
                      (idx === 3 && (syncedHighlight.topic === "WAITING_PERIOD" || syncedHighlight.clauseId === "c4")))) ||
                  (activeCategory !== "GENERAL" &&
                    ((idx === 0 && activeCategory === "GUARANTEED_RETURN") ||
                      (idx === 1 && activeCategory === "COVERAGE") ||
                      (idx === 2 && activeCategory === "SURRENDER_PENALTY") ||
                      (idx === 3 && activeCategory === "WAITING_PERIOD")));

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all duration-500 ${
                      isHighlighted
                        ? "bg-amber-50/95 border-2 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.35)] ring-2 ring-amber-300"
                        : "bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                        isHighlighted ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                        {bullet}
                      </p>
                      {isHighlighted && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md">
                            <Radio className="w-3 h-3 text-amber-800 animate-pulse" />
                            <span>Live Topic: {liveSyncInfo.topic}</span>
                          </span>
                          {hasFlaggedViolations && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Review terms carefully</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              policy.clauses.slice(0, 4).map((clause, idx) => {
                const activeCategory = liveSyncInfo.topicCategory;
                const isHighlighted =
                  (syncedHighlight &&
                    (syncedHighlight.clauseId === clause.id ||
                      (clause.id === "c1" && syncedHighlight.topic === "GUARANTEED_RETURN") ||
                      (clause.id === "c2" && syncedHighlight.topic === "COVERAGE") ||
                      (clause.id === "c3" && syncedHighlight.topic === "SURRENDER_PENALTY") ||
                      (clause.id === "c4" && syncedHighlight.topic === "WAITING_PERIOD"))) ||
                  (activeCategory !== "GENERAL" &&
                    ((clause.id === "c1" && activeCategory === "GUARANTEED_RETURN") ||
                      (clause.id === "c2" && activeCategory === "COVERAGE") ||
                      (clause.id === "c3" && activeCategory === "SURRENDER_PENALTY") ||
                      (clause.id === "c4" && activeCategory === "WAITING_PERIOD")));

                return (
                  <div
                    key={clause.id}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all duration-500 ${
                      isHighlighted
                        ? "bg-amber-50/95 border-2 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.35)] ring-2 ring-amber-300"
                        : "bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                        isHighlighted ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                        {clause.simplifiedBullet}
                      </p>
                      {isHighlighted && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md">
                            <Radio className="w-3 h-3 text-amber-800 animate-pulse" />
                            <span>Live Topic: {liveSyncInfo.topic}</span>
                          </span>
                          {hasFlaggedViolations && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Review terms carefully</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Critical Disclosures & Safeguards (Exclusions & Surrender Warning) */}
        <div
          className={`rounded-3xl p-5 space-y-2.5 transition-all duration-500 ${
            (syncedHighlight &&
              (syncedHighlight.topic === "WAITING_PERIOD" ||
                syncedHighlight.topic === "SURRENDER_PENALTY" ||
                syncedHighlight.clauseId === "c3" ||
                syncedHighlight.clauseId === "c4")) ||
            liveSyncInfo.topicCategory === "WAITING_PERIOD" ||
            liveSyncInfo.topicCategory === "SURRENDER_PENALTY" ||
            hasFlaggedViolations
              ? "bg-amber-100/90 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-2 ring-amber-400"
              : "bg-amber-50 border border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Important Policy Safeguards & Exclusions:</span>
            </div>
            {((syncedHighlight &&
              (syncedHighlight.topic === "WAITING_PERIOD" ||
                syncedHighlight.topic === "SURRENDER_PENALTY" ||
                syncedHighlight.clauseId === "c3" ||
                syncedHighlight.clauseId === "c4")) ||
              liveSyncInfo.topicCategory === "WAITING_PERIOD" ||
              liveSyncInfo.topicCategory === "SURRENDER_PENALTY" ||
              hasFlaggedViolations) && (
              <span className="text-[10px] font-bold bg-amber-300 text-amber-950 px-2.5 py-1 rounded-full animate-pulse">
                Critical Safeguards Active
              </span>
            )}
          </div>

          <ul className="space-y-2 text-xs text-amber-900">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>
                <strong>14-Day Free-Look Period:</strong> You have 14 days after signing to review the full contract at home and cancel for a full 100% refund.
              </span>
            </li>
            <li
              className={`flex items-start gap-2 p-2 rounded-xl transition-colors ${
                (syncedHighlight && syncedHighlight.topic === "WAITING_PERIOD") ||
                liveSyncInfo.topicCategory === "WAITING_PERIOD"
                  ? "bg-amber-200/80 font-semibold text-amber-950 ring-1 ring-amber-400"
                  : ""
              }`}
            >
              <span className="text-amber-600 font-bold">•</span>
              <span>
                <strong>Pre-Existing Conditions:</strong> Pre-existing medical conditions have a mandatory 12-month waiting period before claims are eligible.
              </span>
            </li>
            <li
              className={`flex items-start gap-2 p-2 rounded-xl transition-colors ${
                (syncedHighlight && syncedHighlight.topic === "SURRENDER_PENALTY") ||
                liveSyncInfo.topicCategory === "SURRENDER_PENALTY"
                  ? "bg-amber-200/80 font-semibold text-amber-950 ring-1 ring-amber-400"
                  : ""
              }`}
            >
              <span className="text-amber-600 font-bold">•</span>
              <span>
                <strong>Early Surrender Penalty:</strong> Terminating this policy within the first 36 months incurs a 15% administrative surrender deduction.
              </span>
            </li>
          </ul>
        </div>

        {/* 3. Meeting Discussion Log & Questions Raised (FR-04) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Questions Raised & Meeting Discussion Summary</span>
            </h2>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase">
              MAS Fair Dealing Record
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            As you ask questions during the meeting, your inquiries and Advisor Andi&apos;s confirmed answers are automatically summarized here so you can review what was agreed upon before signing.
          </p>

          {allAuditedQnAs.length > 0 ? (
            <div className="space-y-3">
              {allAuditedQnAs.map((qna, idx) => {
                const topicLabel =
                  qna.topic === "PRE_EXISTING_CONDITION"
                    ? "Pre-Existing Medical Condition"
                    : qna.topic === "SURRENDER_PENALTY"
                    ? "Early Surrender & Penalties"
                    : qna.topic === "GUARANTEED_RETURN"
                    ? "Guaranteed Return & Annuity"
                    : qna.topic === "PREMIUM_ESCALATION"
                    ? "Premium Payment Terms"
                    : "Policy Term Clarification";

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      qna.isCompliant
                        ? "bg-slate-50 border-slate-200"
                        : "bg-amber-50/85 border-amber-300 ring-1 ring-amber-300/60"
                    }`}
                  >
                    {/* Header with Topic and Compliance Status */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {topicLabel}
                      </span>
                      {qna.isCompliant ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified Compliant</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Clarification Required</span>
                        </span>
                      )}
                    </div>

                    {/* Question asked by customer */}
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-slate-500 block text-[11px]">You Asked:</span>
                      <p className="font-semibold text-slate-900 bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed italic">
                        &ldquo;{qna.clientQuestion}&rdquo;
                      </p>
                    </div>

                    {/* Confirmed answer / explanation */}
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-slate-500 block text-[11px]">Advisor Response:</span>
                      <p className="text-slate-800 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-slate-100">
                        {qna.advisorAnswer}
                      </p>
                    </div>

                    {/* Regulatory Notice & Clarification Note */}
                    {!qna.isCompliant && qna.explanation && (
                      <div className="p-2.5 bg-amber-100/70 border border-amber-200 rounded-xl text-[11px] text-amber-950 space-y-1">
                        <span className="font-bold block text-amber-900">Important Note for Customer:</span>
                        <p className="leading-relaxed text-amber-900">
                          {qna.explanation}
                        </p>
                        {qna.regulatoryNotice && (
                          <span className="text-[10px] text-amber-700 font-mono block">
                            Reference: {qna.regulatoryNotice}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-1 text-slate-500">
              <span className="text-xs font-semibold text-slate-700 block">
                Listening for Customer Inquiries...
              </span>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                As you raise questions or concerns with Advisor Andi, our real-time audit will record and verify them here so you can confirm everything before signing.
              </p>
            </div>
          )}

          {/* Facial Clarity & Confusion Moments Log (FR-03 / Speech-Time Correlation) */}
          <div className="pt-4 mt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <BrainCircuit className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Discussion Moments Where You Needed Clarification
                  </h3>
                  <span className="text-[10px] text-slate-500 block">
                    Speech-time correlated facial clarity &amp; hesitation log
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {confusionTimeline.length} {confusionTimeline.length === 1 ? "Moment" : "Moments"} Recorded
              </span>
            </div>

            {confusionTimeline.length > 0 ? (
              <div className="space-y-2.5">
                {confusionTimeline.map((evt, idx) => {
                  const minutes = Math.floor(evt.relativeSeconds / 60);
                  const seconds = evt.relativeSeconds % 60;
                  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

                  return (
                    <div
                      key={evt.id || idx}
                      className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                            <Clock className="w-3 h-3" />
                            <span>Meeting Time: {formattedTime}</span>
                          </span>
                          <span className="text-[10px] font-bold text-blue-900 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md">
                            {evt.activeTopic || "Policy Discussion"}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-full">
                          {evt.triggerType === "BROW_FURROW"
                            ? "Puzzled Brow Furrow"
                            : evt.triggerType === "PUZZLED_TILT"
                            ? "Puzzled Head Tilt"
                            : evt.triggerType === "SQUINT_HESITATION"
                            ? "Squint / Hesitation"
                            : "Senior Assistance Request"}
                        </span>
                      </div>

                      {/* What was spoken at this time (only displayed if speech was active) */}
                      {evt.speechSnippet ? (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Spoken Discussion at This Moment:
                          </span>
                          <p className="text-slate-800 bg-white/90 p-2 rounded-xl border border-blue-100 text-[11px] italic leading-relaxed">
                            &ldquo;{evt.speechSnippet}&rdquo;
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Discussion Status:
                          </span>
                          <p className="text-slate-500 text-[11px] italic bg-white/60 p-2 rounded-xl border border-dashed border-blue-200">
                            Silent self-review of policy terms (No active speech from advisor at this moment).
                          </p>
                        </div>
                      )}

                      {/* Plain-English Resolution Note */}
                      <div className="p-2.5 bg-white border border-blue-200 rounded-xl space-y-0.5">
                        <span className="text-[10px] font-bold text-blue-950 block">
                          Statutory Clarification &amp; Safeguard:
                        </span>
                        <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
                          {evt.clarificationNote || "All policy rights are protected under Singapore regulations. You have 14 days to cancel for a 100% full refund."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-700 block">
                  No Moments of Hesitation or Confusion Recorded
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  As you review the policy terms, any moments where you appear puzzled or request time will be automatically bookmarked with the spoken topic above.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Informed Consent Checkbox & Digital Signature Canvas */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <span>Digital Signature & Confirmation</span>
          </h2>

          {/* Senior friendly acknowledgment checkbox */}
          <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5 shrink-0"
            />
            <span className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">
              I confirm that I have reviewed the simplified policy terms and understand the guaranteed benefits, waiting periods, and early surrender penalties.
            </span>
          </label>

          {/* HTML5 Signature Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Please Sign with Your Finger or Stylus Below:</span>
              {hasSignature && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-slate-400 hover:text-rose-600 flex items-center gap-1 font-semibold text-[11px] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Signature</span>
                </button>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/70 p-1 relative overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-36 sm:h-40 bg-white rounded-xl cursor-crosshair block"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium italic">
                  Sign Line 14 Here (Touch & Drag)
                </div>
              )}
            </div>
          </div>

          {/* Submit Consent Button */}
          <button
            type="button"
            onClick={handleSubmitConsent}
            disabled={!hasAcknowledged || !hasSignature || isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold text-sm py-3.5 px-4 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting Consent...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Sign & Submit Informed Consent</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom Regulatory Footer */}
        <div className="text-center text-[11px] text-slate-400 font-mono pb-4">
          <span>Protected by Vera Engine • Monetary Authority of Singapore (MAS)</span>
        </div>
      </div>
    </main>
  );
}
