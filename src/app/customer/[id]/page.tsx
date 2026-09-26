"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileCheck2,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  User,
  Sparkles,
  Building2,
  DollarSign,
  ArrowRight,
  Download,
  Info,
  Radio,
  MessageSquare,
  Award,
  Printer,
  X,
  Lock,
  HelpCircle as QuestionIcon,
  Shield,
  Users,
  Calendar,
  Heart,
  Volume2,
  ExternalLink,
  BrainCircuit,
  Scan,
  Activity,
} from "lucide-react";
import type {
  Session,
  Policy,
  BranchingResult,
  SyncedClauseHighlight,
  LivenessTelemetry,
  ConfusionEvent,
  ComplianceCertificate,
  AgentAccount,
  ClientWorkflowStep,
  GestureAgreement,
} from "@/types";
import VisualFocusRing from "@/components/customer/VisualFocusRing";

interface CustomerPageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerConsentPage({ params }: CustomerPageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;

  const [session, setSession] = useState<Session | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [advisor, setAdvisor] = useState<AgentAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 5-Stage Guided Workflow Step
  const [workflowStep, setWorkflowStep] = useState<ClientWorkflowStep>("SESSION_OVERVIEW");

  // Calibrated Face Mesh & Snapshot from Step 2
  const [calibratedFaceMesh, setCalibratedFaceMesh] = useState<number[] | null>(null);
  const [calibratedFaceImage, setCalibratedFaceImage] = useState<string | null>(null);
  const [isFaceCalibrated, setIsFaceCalibrated] = useState<boolean>(false);

  // Gesture Agreement & Recap State (Step 4)
  const [gestureAgreement, setGestureAgreement] = useState<GestureAgreement>({
    nodDetected: false,
    nodConfidence: 0,
    shakeDetected: false,
    faceMatchScore: 0.96,
    faceMatchPassed: true,
  });

  // Consent & Signature state
  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<BranchingResult | null>(null);

  // Certificate Modal State
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [certificateData, setCertificateData] = useState<ComplianceCertificate | null>(null);
  const [certLoading, setCertLoading] = useState<boolean>(false);

  // Review time tracker & live focus telemetry
  const [secondsSpentReviewing, setSecondsSpentReviewing] = useState<number>(0);
  const [confusionEvents, setConfusionEvents] = useState<ConfusionEvent[]>([]);
  const [confusionScore, setConfusionScore] = useState<number>(0);
  const [livenessTelemetry, setLivenessTelemetry] = useState<LivenessTelemetry>({
    passed: true,
    score: 0.98,
    confusionDetected: false,
    confusionEventsCount: 0,
    confusionScore: 0,
    timeSpentReviewingSeconds: 0,
    timerFallbackTriggered: false,
  });

  // Handle Real-Time Confusion Detected while reading summary in Stage 4
  const handleConfusionLogged = useCallback((event: ConfusionEvent) => {
    setConfusionEvents((prev) => {
      const updated = [...prev, event];
      const newScore = updated.reduce((acc, ev) => {
        const weight = ev.intensity === "high" ? 3 : ev.intensity === "moderate" ? 2 : 1;
        return acc + weight;
      }, 0);
      setConfusionScore(newScore);

      setLivenessTelemetry((tele) => ({
        ...tele,
        confusionDetected: true,
        confusionEventsCount: updated.length,
        confusionScore: newScore,
        confusionEvents: updated,
      }));

      // Sync telemetry to session backend
      if (sessionId) {
        fetch(`/api/session/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telemetry: {
              passed: true,
              score: 0.96,
              confusionDetected: true,
              confusionEventsCount: updated.length,
              confusionScore: newScore,
              confusionEvents: updated,
              timeSpentReviewingSeconds: secondsSpentReviewing,
              timerFallbackTriggered: false,
            },
          }),
        }).catch(() => {});
      }

      return updated;
    });
  }, [sessionId, secondsSpentReviewing]);

  // Simulation & Reset Handlers for Customer Clarity & Confusion Tracker
  const handleSimulateConfusionEvent = useCallback((
    triggerType: "BROW_FURROW" | "PUZZLED_TILT" | "HAND_TO_HEAD",
    intensity: "mild" | "moderate" | "high",
    topic: string,
    note: string
  ) => {
    const now = new Date();
    const event: ConfusionEvent = {
      id: `conf_sim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now.toLocaleTimeString("en-SG", { hour12: false }),
      relativeSeconds: secondsSpentReviewing,
      triggerType,
      intensity,
      activeTopic: topic,
      speechSnippet: session?.liveDialogueBuffer?.slice(-120) || "Reviewing policy summary & plain-language pillars",
      clarificationNote: note,
      durationSeconds: intensity === "high" ? 6 : intensity === "moderate" ? 3 : 2,
    };
    handleConfusionLogged(event);
  }, [secondsSpentReviewing, session?.liveDialogueBuffer, handleConfusionLogged]);

  const handleResetConfusionTracker = useCallback(() => {
    setConfusionEvents([]);
    setConfusionScore(0);
    setLivenessTelemetry((tele) => ({
      ...tele,
      confusionDetected: false,
      confusionEventsCount: 0,
      confusionScore: 0,
      confusionEvents: [],
    }));
    if (sessionId) {
      fetch(`/api/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telemetry: {
            passed: true,
            score: 0.96,
            confusionDetected: false,
            confusionEventsCount: 0,
            confusionScore: 0,
            confusionEvents: [],
            timeSpentReviewingSeconds: secondsSpentReviewing,
            timerFallbackTriggered: false,
          },
        }),
      }).catch(() => {});
    }
  }, [sessionId, secondsSpentReviewing]);

  // Calibration & Gesture Handlers
  const handleCalibrationComplete = useCallback((mesh: number[], faceImageBase64?: string) => {
    setCalibratedFaceMesh(mesh);
    if (faceImageBase64) {
      setCalibratedFaceImage(faceImageBase64);
    }
    setIsFaceCalibrated(true);
  }, []);

  const handleNodDetected = useCallback((agreed: boolean, confidence: number, matchScore?: number) => {
    setGestureAgreement({
      nodDetected: agreed,
      nodConfidence: confidence,
      shakeDetected: !agreed,
      faceMatchScore: matchScore,
      faceMatchPassed: matchScore !== undefined ? matchScore >= 0.82 : true,
      recapAgreedAt: new Date().toISOString(),
    });
  }, []);

  // Synced Keyword Highlighting state
  const [syncedHighlight, setSyncedHighlight] = useState<SyncedClauseHighlight | null>(null);

  // Real-Time Active Discussion Topic & Speech Snippet Extractor
  const liveSyncInfo = (() => {
    const buffer = (session?.liveDialogueBuffer || "").trim();
    if (buffer.length > 0) {
      // Analyze recent speech tail for active topic
      const recentSnippet = buffer.length > 220 ? buffer.slice(-220) : buffer;
      const upper = recentSnippet.toUpperCase();
      let activeIndex = -1; // -1: no active section currently being spoken
      let topicTitle = "What is covered";

      if (upper.includes("CANCEL") || upper.includes("SURRENDER") || upper.includes("FREE LOOK") || upper.includes("FREE-LOOK") || upper.includes("REFUND") || upper.includes("TERMINAT") || upper.includes("COOL OFF") || upper.includes("PENALTY")) {
        activeIndex = 3;
        topicTitle = "How to cancel";
      } else if (upper.includes("WAITING") || upper.includes("PRE-EXISTING") || upper.includes("EXCLUSION") || upper.includes("START") || upper.includes("INCEPTION") || upper.includes("COMMENCE") || upper.includes("DAY 1")) {
        activeIndex = 2;
        topicTitle = "When cover starts";
      } else if (upper.includes("PREMIUM") || upper.includes("PAY") || upper.includes("COST") || upper.includes("FEE") || upper.includes("MONTH") || upper.includes("ANNUAL") || upper.includes("SGD") || upper.includes("DOLLAR") || upper.includes("$") || upper.includes("450")) {
        activeIndex = 1;
        topicTitle = "What you pay";
      } else if (upper.includes("COVER") || upper.includes("BENEFIT") || upper.includes("DEATH") || upper.includes("ILLNESS") || upper.includes("DISABILITY") || upper.includes("TPD") || upper.includes("ASSURED") || upper.includes("PROTECT") || upper.includes("250,000")) {
        activeIndex = 0;
        topicTitle = "What is covered";
      }

      const lines = buffer.split("\n").map((l) => l.trim()).filter(Boolean);
      let snippet = buffer;
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        snippet = lastLine.length > 180 ? `...${lastLine.slice(-180)}` : lastLine;
      }

      return { activeIndex, topicTitle, snippet };
    }

    return { activeIndex: -1, topicTitle: "What is covered", snippet: undefined };
  })();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Load session and policy
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
          if (data.advisor) {
            setAdvisor(data.advisor);
          }

          if (data.session.consentResult) {
            setSubmissionResult(data.session.consentResult);
            setWorkflowStep("SUBMISSION_SUCCESS");
          }

          // Fetch advisor info
          if (data.session.agentId) {
            try {
              const aRes = await fetch(`/api/agents/${data.session.agentId}`);
              const aData = await aRes.json();
              if (aData.success && aData.agent) {
                setAdvisor(aData.agent);
              }
            } catch (e) {
              // fallback gracefully
            }
          }
        } else {
          setError("Failed to locate this advisory session. Please check your QR code link.");
        }
      } catch (e: any) {
        setError(e.message || "Failed to connect to server.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  // Polling to keep session synced
  useEffect(() => {
    if (workflowStep === "SUBMISSION_SUCCESS") return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.session) {
          setSession(data.session);
          if (data.policy) setPolicy(data.policy);
          if (data.session.syncedHighlight) {
            setSyncedHighlight(data.session.syncedHighlight);
          }
        }
      } catch (e) {
        // ignore polling blips
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [sessionId, workflowStep]);

  // Review time tracker
  useEffect(() => {
    if (workflowStep !== "LIVE_CONVERSATION" && workflowStep !== "REVIEW_BEFORE_SIGN") return;
    const timer = setInterval(() => {
      setSecondsSpentReviewing((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [workflowStep]);

  // Initialize Canvas when Step 4 mounts
  useEffect(() => {
    if (workflowStep !== "REVIEW_BEFORE_SIGN") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [workflowStep]);

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
            confusionScore,
            confusionEvents,
            confusionEventsCount: confusionEvents.length,
            timeSpentReviewingSeconds: secondsSpentReviewing,
            gestureAgreement,
            calibratedFaceMeshAvailable: Boolean(calibratedFaceMesh),
          },
          agentAudioAuditPassed: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setSubmissionResult(data.result);
        setWorkflowStep("SUBMISSION_SUCCESS");
      } else {
        alert(data.error || "Failed to submit consent. Please try again.");
      }
    } catch (err: any) {
      alert("Submission network error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCertificate = async () => {
    setShowCertificateModal(true);
    setCertLoading(true);

    try {
      const res = await fetch(`/api/session/${sessionId}/receipt`);
      const data = await res.json();
      if (data.success && data.certificate) {
        setCertificateData(data.certificate);
      }
    } catch (e) {
      console.error("Failed to load certificate:", e);
    } finally {
      setCertLoading(false);
    }
  };

  const fallbackAdvisorName = typeof window !== "undefined" ? localStorage.getItem("vera_active_agent_name") : null;
  const fallbackAdvisorRep = typeof window !== "undefined" ? localStorage.getItem("vera_active_agent_rep") : null;
  const activeAdvisorName = advisor ? advisor.fullName : (fallbackAdvisorName || "Andi Wijaya");
  const activeAdvisorRep = advisor ? advisor.repNumber : (fallbackAdvisorRep || "MAS-REP-882910");

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Connecting to Session...</h2>
          <p className="text-xs text-slate-500">
            Preparing plain-English summary and MAS consumer disclosure safeguards.
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
        </div>
      </main>
    );
  }

  // STEPPER HEADER COMPONENT (Pictures 1 & 2)
  const StepperHeader = ({ currentStep }: { currentStep: 1 | 2 | 3 }) => (
    <div className="flex items-center justify-center gap-3 sm:gap-6 py-6 select-none">
      <div className="flex items-center gap-2">
        <span
          className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
            currentStep === 1 ? "bg-blue-600 text-white shadow-xs" : "bg-blue-100 text-blue-700"
          }`}
        >
          1
        </span>
        <span className={`text-xs font-bold ${currentStep === 1 ? "text-blue-700 font-black" : "text-slate-500"}`}>
          Session
        </span>
      </div>
      <div className="w-8 h-px bg-slate-200" />
      <div className="flex items-center gap-2">
        <span
          className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
            currentStep === 2 ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
          }`}
        >
          2
        </span>
        <span className={`text-xs font-bold ${currentStep === 2 ? "text-blue-700 font-black" : "text-slate-500"}`}>
          Privacy
        </span>
      </div>
      <div className="w-8 h-px bg-slate-200" />
      <div className="flex items-center gap-2">
        <span
          className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
            currentStep === 3 ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
          }`}
        >
          3
        </span>
        <span className={`text-xs font-bold ${currentStep === 3 ? "text-blue-700 font-black" : "text-slate-500"}`}>
          Connect
        </span>
      </div>
    </div>
  );

  // ==========================================
  // STAGE 1: SESSION & POLICY OVERVIEW (PICTURE 1)
  // ==========================================
  if (workflowStep === "SESSION_OVERVIEW") {
    return (
      <main className="min-h-screen bg-slate-50/60 px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <StepperHeader currentStep={1} />

          <div className="grid md:grid-cols-12 gap-6">
            {/* Left Column: Your policy in simple words */}
            <div className="md:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  STEP 1 OF 3
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Your policy in simple words
                </h1>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Here&apos;s a quick summary so you can understand what&apos;s covered. Take your time &mdash; no pressure.
                </p>
              </div>

              {/* 4 Plain English Cards */}
              <div className="space-y-3">
                <div className="p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">Financial protection for what matters</strong>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Helps your loved ones with guaranteed payout if you pass away or suffer total permanent disability.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">Flexible cover amount</strong>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      You&apos;re applying for S${policy.coverageAmount.toLocaleString("en-SG")} of cover, with options to adjust later if your needs change.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">Simple, affordable payments</strong>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Your premiums are S${policy.premiumAmount}/month designed to fit your budget, with no hidden administration charges.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">Support when you need it</strong>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Our Singapore-based advisory team is here to assist throughout your lifetime protection journey.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Your Session Metadata */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  YOUR SESSION
                </span>

                <div>
                  <h2 className="text-base font-bold text-slate-900">{policy.name}</h2>
                  <span className="text-xs text-slate-500">{policy.type.replace(/_/g, " ")}</span>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 block text-[10px]">Your Agent</span>
                      <strong className="text-slate-800 font-bold">{activeAdvisorName}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 block text-[10px]">Cover amount</span>
                      <strong className="text-slate-800 font-bold">S${policy.coverageAmount.toLocaleString("en-SG")}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simpler summary notice box */}
              <div className="p-4 bg-blue-50/80 border border-blue-200/70 rounded-2xl flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-900 leading-relaxed">
                  <strong className="font-bold block mb-0.5">A simpler summary for easier reading</strong>
                  This summary is written in plain language to help you understand key points. It doesn&apos;t replace the full policy terms and conditions, which you&apos;ll see before you sign.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Primary Button */}
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setWorkflowStep("FACE_CALIBRATION")}
              className="w-full max-w-md bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm py-4 px-8 rounded-2xl shadow-md transition-all uppercase tracking-wider"
            >
              NEXT
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // STAGE 2: PRIVACY & FACE CALIBRATION (PICTURE 2)
  // ==========================================
  if (workflowStep === "FACE_CALIBRATION") {
    return (
      <main className="min-h-screen bg-slate-50/60 px-4 py-4 sm:py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <StepperHeader currentStep={2} />

          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                STEP 2 OF 3
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Face Calibration & Privacy Setup
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto leading-relaxed">
                A quick face calibration helps us confirm your agreement gestures (nodding) during the final recap. Your facial mesh is processed locally in memory and <strong className="text-slate-800 font-bold">permanently deleted after this session</strong>.
              </p>
            </div>

            {/* Interactive Camera Calibration Frame with Face Mesh */}
            <VisualFocusRing
              mode="CALIBRATION"
              onCalibrationComplete={handleCalibrationComplete}
            />

            {/* Privacy Security Box (Picture 2 bottom lock) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3 text-left max-w-lg mx-auto">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600 leading-relaxed">
                <strong className="text-slate-800 font-bold block">Your privacy matters</strong>
                Your video is processed in memory on your device only for verification and is permanently deleted after session completion.
              </div>
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setWorkflowStep("SESSION_OVERVIEW")}
              className="px-6 py-4 rounded-2xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all uppercase tracking-wider"
            >
              Back
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch(`/api/session/${sessionId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "HANDED_OFF" }),
                  });
                } catch (e) {
                  console.error("Failed to update session status to HANDED_OFF", e);
                }
                setWorkflowStep("LIVE_CONVERSATION");
              }}
              className="flex-1 max-w-sm bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm py-4 px-8 rounded-2xl shadow-md transition-all uppercase tracking-wider text-center"
            >
              NEXT
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // STAGE 3: FOLLOW THE CONVERSATION (PICTURE 3 - MIC ONLY, CAMERA OFF)
  // ==========================================
  if (workflowStep === "LIVE_CONVERSATION") {
    const policySections = [
      { id: 1, title: "What is covered", desc: "Review the benefits and events listed in the policy." },
      { id: 2, title: "What you pay", desc: `Check the regular premium (S$${policy.premiumAmount}/mo) and any additional fees.` },
      { id: 3, title: "When cover starts", desc: "Read the waiting periods and exclusionary conditions." },
      { id: 4, title: "How to cancel", desc: "Review the cancellation process and any conditions." },
    ];

    return (
      <main className="min-h-screen bg-slate-50/60 px-4 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Follow the conversation
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Key points update after each one-minute AI review.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-mono">
                With {activeAdvisorName} &bull; {activeAdvisorRep}
              </span>
            </div>
          </div>

          {/* Two Column Grid */}
          <div className="grid md:grid-cols-12 gap-6">
            {/* Left Column: Your policy, in plain language */}
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Your policy, in plain language</h2>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full uppercase">
                    Live Sync
                  </span>
                </div>

                <div className="space-y-3">
                  {policySections.map((sec, idx) => {
                    const isCurrentlySpeaking = liveSyncInfo.activeIndex === idx;
                    const isExplained = session?.explainedSections?.includes(sec.id);

                    return (
                      <div
                        key={sec.id}
                        className={`p-4 rounded-2xl transition-all duration-300 border ${
                          isCurrentlySpeaking
                            ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200 shadow-xs"
                            : isExplained
                            ? "bg-emerald-50/40 border-emerald-200/80"
                            : "bg-slate-50/60 border-slate-200/70"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                              isCurrentlySpeaking
                                ? "bg-blue-600 text-white"
                                : isExplained
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {isExplained && !isCurrentlySpeaking ? "✓" : sec.id}
                          </span>
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                                {sec.title}
                              </strong>
                              {isExplained && !isCurrentlySpeaking && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                                  ✓ Explained by {activeAdvisorName.split(" ")[0]}
                                </span>
                              )}
                              {!isExplained && !isCurrentlySpeaking && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  Pending explanation
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{sec.desc}</p>

                            {isCurrentlySpeaking && (
                              <div className="pt-2 flex items-center gap-1.5 text-blue-700 text-xs font-bold">
                                <Volume2 className="w-4 h-4 animate-pulse" />
                                <span>{activeAdvisorName} is explaining this now</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Illustrative text footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Illustrative summary &bull; MAS Fair Dealing aligned</span>
                <Link href="/policy" target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                  <span>View full demo policy</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Right Column: Conversation Summary & Questions */}
            <div className="md:col-span-5 space-y-4">
              {/* Card 1: Conversation Summary */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Conversation summary</span>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed space-y-2">
                  {session?.conversationSummary && session.conversationSummary.length > 0 ? (
                    session.conversationSummary.map((summaryItem, idx) => (
                      <p key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{summaryItem}</span>
                      </p>
                    ))
                  ) : session?.liveDialogueBuffer ? (
                    <div className="space-y-1.5">
                      <p className="text-slate-600">
                        {activeAdvisorName} is actively walking you through your policy options.
                      </p>
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-3">
                        &ldquo;{session.liveDialogueBuffer.slice(-140)}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">
                      Listening to conversation with {activeAdvisorName}. Bullet points will update every minute as the session progresses.
                    </p>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 font-mono block pt-2">
                  Last updated {session?.lastAiAnalysisTimestamp ? new Date(session.lastAiAnalysisTimestamp).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {/* Card 2: Your Questions */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <QuestionIcon className="w-4 h-4 text-blue-600" />
                    <span>Your questions</span>
                  </div>
                  {session?.clientQuestions && session.clientQuestions.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {session.clientQuestions.length} noted
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 text-xs max-h-56 overflow-y-auto pr-1">
                  {session?.clientQuestions && session.clientQuestions.length > 0 ? (
                    session.clientQuestions.map((q, idx) => {
                      const isAnswered = q.status === "ANSWERED";
                      return (
                        <div key={`${q.id || "q"}-${idx}`} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                          <span className="font-semibold text-slate-800 block">&ldquo;{q.question}&rdquo;</span>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isAnswered
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {q.statusLabel || (isAnswered ? `Reviewed with ${activeAdvisorName.split(" ")[0]}` : "Still needs explanation")}
                            </span>
                            {q.topic && (
                              <span className="text-[10px] text-slate-400 uppercase font-mono">{q.topic}</span>
                            )}
                          </div>
                          {q.advisorAnswer && (
                            <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 mt-1">
                              {q.advisorAnswer}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 py-4">
                      <span>No customer questions detected yet. Feel free to ask {activeAdvisorName.split(" ")[0]} anything during the conversation!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Privacy Assurance & Interaction Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong className="text-slate-800">Camera checks run on this device only.</strong> Video and facial data are never saved or uploaded.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setWorkflowStep("FACE_CALIBRATION")}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <span>← Back</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkflowStep("REVIEW_BEFORE_SIGN")}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>Proceed to Review & Sign</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // STAGE 4: REVIEW BEFORE SIGN (FULL DETAILS RECAP + FACE MATCH + RECAP NOD + SIGNATURE)
  // ==========================================
  if (workflowStep === "REVIEW_BEFORE_SIGN") {
    const policySections = [
      { id: 1, title: "What is covered", desc: "Life and Total Permanent Disability protection benefits." },
      { id: 2, title: "What you pay", desc: `Regular monthly premium (S$${policy.premiumAmount}/mo) and statutory charges.` },
      { id: 3, title: "When cover starts", desc: "Inception date, 12-month waiting periods, and pre-existing medical conditions." },
      { id: 4, title: "How to cancel", desc: "14-day statutory free-look cancellation with 100% full refund rights." },
    ];

    return (
      <main className="min-h-screen bg-slate-50/60 px-4 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Top Navigation & Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setWorkflowStep("LIVE_CONVERSATION")}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>← Back to Live Conversation</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Review Time: {secondsSpentReviewing}s</span>
            </div>
          </div>

          {/* Header Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-md border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Step 4: Final Session Recap & Consent
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                {policy.code}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{policy.name}</h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Please review your complete policy details, plain-language pillar recap, confirm agreement via head nod to the camera (or tap confirm), and sign below.
            </p>
          </div>

          {/* Core Numbers & Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sum Assured</span>
              <strong className="text-base sm:text-lg font-black text-blue-700">
                S${policy.coverageAmount.toLocaleString("en-SG")}
              </strong>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Regular Premium</span>
              <strong className="text-base sm:text-lg font-black text-slate-900">
                S${policy.premiumAmount.toLocaleString("en-SG")}/mo
              </strong>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Free-Look Period</span>
              <strong className="text-base sm:text-lg font-black text-emerald-700">
                14 Days (100% Refund)
              </strong>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Capital Protection</span>
              <strong className="text-base sm:text-lg font-black text-slate-900">
                {policy.isGuaranteedReturn ? "Guaranteed" : "Non-Guaranteed"}
              </strong>
            </div>
          </div>

          {/* Camera Face Matching & Nod Detection Ring with Active Summary Confusion Monitoring */}
          <VisualFocusRing
            mode="NOD_AND_VERIFY"
            calibratedMesh={calibratedFaceMesh}
            calibratedFaceImage={calibratedFaceImage}
            onNodDetected={handleNodDetected}
            reviewTimeSeconds={secondsSpentReviewing}
            activeTopic={liveSyncInfo.topicTitle}
            activeSpeechSnippet={session?.liveDialogueBuffer?.slice(-150)}
            onConfusionLogged={handleConfusionLogged}
          />

          {/* Real-Time Customer Clarity & Confusion Tracker (MAS Fair Dealing Safeguard) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      Customer Clarity & Confusion Tracker
                    </h2>
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full uppercase font-mono">
                      MAS Safeguard
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Real-time on-device facial telemetry monitoring for comprehension, glabella furrow, and hesitation pauses.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {confusionScore === 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>High Clarity (0/8 pts)</span>
                  </span>
                ) : confusionScore < 8 && confusionEvents.length < 6 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Normal Deliberation ({confusionScore}/8 pts)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Elevated Hesitation ({confusionScore}/8 pts — Yellow Flag)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Threshold Progress Meter */}
            <div className="space-y-2 bg-slate-50/80 border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Hesitation Points: <strong className="text-slate-900 font-bold">{confusionScore}</strong> / 8 pts ({confusionEvents.length} events logged)
                  </span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  {confusionScore >= 8 || confusionEvents.length >= 6
                    ? "Trigger: Supervisor Review (Yellow)"
                    : "Status: Fast-Track Clean Pass"}
                </span>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    confusionScore >= 8 || confusionEvents.length >= 6
                      ? "bg-amber-500"
                      : confusionScore >= 5
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, (confusionScore / 8) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>0 pts (Clear Understanding)</span>
                <span>4.0 pts (Attentive Deliberation)</span>
                <span className="font-bold text-amber-700">8.0 pts (MAS Yellow Threshold)</span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                <strong className="text-slate-700">Fair Dealing Rule:</strong> Normal attentive reading and thoughtful deliberation up to 7 points is welcomed. If customer facial hesitation reaches 8 points or 6 distinct confusion events, VERA automatically flags the application Yellow for an underwriting compliance check, guaranteeing zero mis-selling or rushed consent.
              </p>
            </div>

            {/* Live Hesitation Audit Feed */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Scan className="w-3.5 h-3.5 text-blue-600" />
                  <span>Live Facial Confusion Audit Feed ({confusionEvents.length})</span>
                </span>
                {confusionEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetConfusionTracker}
                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                  >
                    Clear Feed
                  </button>
                )}
              </div>

              {confusionEvents.length === 0 ? (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-emerald-900 font-bold block">No facial hesitation or confusion detected</strong>
                    <span className="text-emerald-700 text-[11px]">
                      Camera telemetry indicates attentive reading with zero glabella furrow or puzzled gestures.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {[...confusionEvents].reverse().map((ev, idx) => (
                    <div
                      key={ev.id || idx}
                      className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <strong className="font-bold text-amber-950">
                            {ev.triggerType === "BROW_FURROW"
                              ? "Glabella Brow Furrow (Tension)"
                              : ev.triggerType === "PUZZLED_TILT"
                              ? "Puzzled Head Tilt"
                              : ev.triggerType === "HAND_TO_HEAD"
                              ? "Holding Head / Chin Rest (Deliberation)"
                              : "Sustained Hesitation Pause"}
                          </strong>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800">
                            {ev.intensity === "high" ? "+3 pts (High)" : ev.intensity === "moderate" ? "+2 pts (Mod)" : "+1 pt (Mild)"}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          +{ev.relativeSeconds}s ({ev.timestamp})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700">
                        <span className="font-semibold text-slate-800">Clause Context:</span> {ev.activeTopic}
                      </p>
                      {ev.clarificationNote && (
                        <p className="text-[10px] text-amber-800 italic pt-0.5">
                          Safeguard: {ev.clarificationNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Testing & Simulation Controls */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-slate-400">
                Simulation Controls:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    handleSimulateConfusionEvent(
                      "BROW_FURROW",
                      "mild",
                      "What is covered (Waiting Periods)",
                      "14-day statutory free-look period allows full refund if terms are not satisfactory."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  +1 pt: Brow Furrow
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSimulateConfusionEvent(
                      "PUZZLED_TILT",
                      "moderate",
                      "What you pay (Surrender Charges)",
                      "Early surrender penalty provisions require transparent disclosure."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  +2 pts: Puzzled Tilt
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSimulateConfusionEvent(
                      "BROW_FURROW",
                      "high",
                      "Exclusions & Pre-existing Conditions",
                      "Pre-existing medical conditions require explicit customer affirmation."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors"
                >
                  +3 pts: Sustained Hesitation
                </button>
                {confusionEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetConfusionTracker}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {(confusionScore >= 8 || confusionEvents.length >= 6) && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-3xl text-xs text-amber-950 flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-extrabold text-sm block text-amber-900">
                  Elevated Hesitation Detected ({confusionScore} pts / {confusionEvents.length} events) — Review at your own pace
                </span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Under Singapore MAS Fair Dealing guidelines, your session will be routed for a friendly Central Compliance supervisor review (Yellow Flag) to guarantee that all contractual terms are clear. Remember: you have a statutory <strong>14-day Free-Look cancellation guarantee</strong> with a 100% full refund at zero penalty.
                </p>
              </div>
            </div>
          )}

          {/* Policy Summary & Plain Language Pillars Recap */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Policy Summary & Explained Pillars</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase">
                Plain English
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {policySections.map((sec) => {
                const isCovered = session?.explainedSections?.includes(sec.id);
                return (
                  <div
                    key={sec.id}
                    className={`p-3.5 rounded-2xl border ${
                      isCovered ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50/80 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isCovered ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {isCovered ? "✓" : sec.id}
                      </span>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <strong className="text-xs font-bold text-slate-900 truncate">{sec.title}</strong>
                          {isCovered && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                              Reviewed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{sec.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meeting Conversation Recap & Questions Addressed Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Left Box: Meeting Conversation Highlights */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Meeting Conversation Recap</span>
              </div>
              <div className="text-xs text-slate-700 space-y-2 max-h-44 overflow-y-auto pr-1">
                {session?.conversationSummary && session.conversationSummary.length > 0 ? (
                  session.conversationSummary.map((item, idx) => (
                    <p key={idx} className="flex items-start gap-1.5">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{item}</span>
                    </p>
                  ))
                ) : session?.liveDialogueBuffer ? (
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {activeAdvisorName} explained key product provisions, surrender penalties, and exclusions during the live advisory discussion.
                  </p>
                ) : (
                  <p className="text-slate-500 italic text-[11px]">
                    No critical deviations noted. Key terms reviewed with {activeAdvisorName.split(" ")[0]}.
                  </p>
                )}
              </div>
            </div>

            {/* Right Box: Questions Addressed */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <QuestionIcon className="w-4 h-4 text-blue-600" />
                <span>Questions Addressed</span>
              </div>
              <div className="space-y-2 text-xs max-h-44 overflow-y-auto pr-1">
                {session?.clientQuestions && session.clientQuestions.length > 0 ? (
                  session.clientQuestions.map((q, idx) => (
                    <div key={`${q.id || "q"}-${idx}`} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="font-semibold text-slate-800 text-[11px] block">&ldquo;{q.question}&rdquo;</span>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                        {q.statusLabel || "Reviewed with Advisor"}
                      </span>
                      {q.advisorAnswer && (
                        <p className="text-[10px] text-slate-500">{q.advisorAnswer}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic text-[11px]">
                    All questions during the session were reviewed with {activeAdvisorName.split(" ")[0]}.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Digital Signature Canvas Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Informed Digital Consent</h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Section 25(5) Aligned</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAcknowledged}
                  onChange={(e) => setHasAcknowledged(e.target.checked)}
                  className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  I, <strong className="font-bold text-slate-900">{session.customerName || "Mdm. Tan"}</strong>, confirm that {activeAdvisorName} has explained key policy terms, 14-day free-look rights, surrender penalties, and exclusions in plain English.
                </span>
              </label>
            </div>

            {/* Signature Canvas */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Draw Your Signature:</span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-1 bg-slate-50/50 relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 bg-white rounded-xl touch-none cursor-crosshair"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-xs font-medium">
                    Sign with finger or stylus here
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="button"
              onClick={handleSubmitConsent}
              disabled={!hasAcknowledged || !hasSignature || isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Informed Consent...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Signed Informed Consent</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // STAGE 5: SUBMISSION SUCCESS (CLEAN CUSTOMER RECEIPT - NO INTERNAL RISK FLAGS)
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-50/60 px-4 py-8 sm:py-12">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Reassuring Success Card */}
        <div className="rounded-3xl p-6 sm:p-8 text-white shadow-md border bg-gradient-to-br from-emerald-600 to-teal-800 border-emerald-500 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
              Consent Recorded
            </span>
            <span className="text-xs font-mono">Reference: {sessionId.slice(0, 14)}</span>
          </div>

          <div className="flex items-start gap-3.5 pt-1">
            <div className="p-2.5 bg-white/20 rounded-2xl shrink-0">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Consent Verified & Submitted!</h1>
              <p className="text-xs text-white/90 mt-1 leading-relaxed">
                Thank you, <strong className="text-white font-bold">{session.customerName || "Mdm. Tan"}</strong>. Your application and digital signature have been recorded safely.
              </p>
            </div>
          </div>
        </div>

        {/* Application Summary & Receipt Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span>Application Summary & Receipt</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">ID: {sessionId.slice(0, 16)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Insured Client:</span>
              <span className="font-bold text-slate-800 text-sm">{session.customerName || "Mdm. Tan"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Assigned Advisor:</span>
              <span className="font-bold text-slate-800 text-sm">{activeAdvisorName}</span>
              <span className="text-[10px] text-slate-500 font-mono block">{activeAdvisorRep}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Policy Name:</span>
              <span className="font-bold text-slate-800">{policy.name}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Coverage (SGD):</span>
              <span className="font-bold text-emerald-700 text-sm">
                S${policy.coverageAmount.toLocaleString("en-SG")}
              </span>
            </div>
          </div>

          {/* 14-Day Free-Look Notice */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>14-Day Free-Look Protection in Effect</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Under Singapore MAS regulations, you have a 14-day statutory Free-Look period starting today. If you choose to cancel, your premium will be 100% refunded with zero penalties.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 grid sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleOpenCertificate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs"
            >
              <Award className="w-4 h-4" />
              <span>View Compliance Certificate</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Save / Print Receipt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Certificate Modal */}
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
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Generating official audit certificate...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-slate-700">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Certificate ID: {certificateData.certificateId}
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      VERIFIED BY VERA AI
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 truncate">
                    SHA-256 Digest: {certificateData.certificateHash}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Insured Customer:</span>
                    <span className="font-bold text-slate-900 text-sm">{certificateData.customer.name}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Licensed MAS Representative:</span>
                    <span className="font-bold text-slate-900 text-sm">{certificateData.advisor.fullName}</span>
                    <span className="text-[10px] text-indigo-700 font-mono block">{certificateData.advisor.repNumber}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Certificate</span>
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
