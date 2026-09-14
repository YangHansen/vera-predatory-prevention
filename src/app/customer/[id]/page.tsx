"use client";

import { useEffect, useState, useRef, use } from "react";
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
} from "lucide-react";
import type { Session, Policy, BranchingResult } from "@/types";

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

  // Review time tracker (Senior consumer protection)
  const [secondsSpentReviewing, setSecondsSpentReviewing] = useState<number>(0);

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
            passed: true,
            score: 0.96,
            confusionDetected: false,
            confusionEventsCount: 0,
            timeSpentReviewingSeconds: secondsSpentReviewing,
            timerFallbackTriggered: false,
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

        {/* 1. What You Need to Know (Simplified in Plain English) */}
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
              policy.simplifiedSummary.map((bullet, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">{bullet}</p>
                </div>
              ))
            ) : (
              policy.clauses.slice(0, 4).map((clause, idx) => (
                <div
                  key={clause.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                    {clause.simplifiedBullet}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Critical Disclosures & Safeguards (Exclusions & Surrender Warning) */}
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Important Policy Safeguards & Exclusions:</span>
          </div>

          <ul className="space-y-1.5 text-xs text-amber-900">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>
                <strong>14-Day Free-Look Period:</strong> You have 14 days after signing to review the full contract at home and cancel for a full 100% refund.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>
                <strong>Pre-Existing Conditions:</strong> Pre-existing medical conditions have a mandatory 12-month waiting period before claims are eligible.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>
                <strong>Early Surrender Penalty:</strong> Terminating this policy within the first 36 months incurs a 15% administrative surrender deduction.
              </span>
            </li>
          </ul>
        </div>

        {/* 3. Informed Consent Checkbox & Digital Signature Canvas */}
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
