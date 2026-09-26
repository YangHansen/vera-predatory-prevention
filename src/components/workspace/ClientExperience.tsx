"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  Download,
  LockKeyhole,
  MessageCircle,
  Mic,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Brand } from "./Brand";
import VisualFocusRing from "@/components/customer/VisualFocusRing";
import type { LivenessTelemetry, ConfusionEvent } from "@/types";
import { CameraPreview } from "./CameraPreview";
import { useDemoSession } from "./useDemoSession";
import { DUMMY_POLICIES } from "@/lib/dummy-data";
import { downloadText } from "@/lib/frontend-demo";

export function ClientExperience({ id }: { id: string }) {
  const { session, ready, update, error, live, busy, refresh } =
    useDemoSession(id);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mesh, setMesh] = useState<number[] | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.backend?.calibratedMesh && !mesh) {
      setMesh(session.backend.calibratedMesh);
      setFaceChecked(true);
    }
    if (session?.backend?.calibratedFaceImage && !faceImage) {
      setFaceImage(session.backend.calibratedFaceImage);
    }
  }, [session?.backend?.calibratedMesh, session?.backend?.calibratedFaceImage, mesh, faceImage]);
  const telemetry = useRef<LivenessTelemetry>({
    passed: false,
    score: 0,
    confusionDetected: false,
    confusionEventsCount: 0,
    timeSpentReviewingSeconds: 0,
    timerFallbackTriggered: false,
  });
  const confusion = useRef<ConfusionEvent[]>([]);
  const reviewStarted = useRef(0);
  const [welcomeStep, setWelcomeStep] = useState(0);
  const [reviewStep, setReviewStep] = useState(0);
  const [audioConsent, setAudioConsent] = useState(false);
  const [cameraConsent, setCameraConsent] = useState(false);
  const [faceChecked, setFaceChecked] = useState(false);
  const [finalChecked, setFinalChecked] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [topic, setTopic] = useState(0);
  const [help, setHelp] = useState(false);
  const [question, setQuestion] = useState("");
  const [questionSent, setQuestionSent] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureMode, setSignatureMode] = useState<"type" | "draw">("type");
  const [drawnSignature, setDrawnSignature] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousPhase = useRef(session?.phase);
  const policy =
    session?.policyData ||
    DUMMY_POLICIES.find((p) =>
      p.name.startsWith(session?.policy || "missing"),
    ) ||
    DUMMY_POLICIES[0];
  const terms = [
    {
      title: "Your premium",
      body: `You pay S$${policy.premiumAmount} ${policy.premiumFrequency}.`,
      detail: "Make sure this amount fits your budget before agreeing.",
    },
    ...policy.simplifiedSummary.map((body, i) => ({
      title: policy.clauses[i]?.title || `Policy detail ${i + 1}`,
      body,
      detail: `Ask ${session?.advisor?.fullName?.split(" ")[0] || "your advisor"} if you would like this explained.`,
    })),
    ...(session?.phase === "review"
      ? (
          session.conversationSummary?.split("\n").filter(Boolean) || [
            "Review the points discussed with your advisor before signing.",
          ]
        ).map((body) => ({
          title: "Conversation summary",
          body,
          detail: "Ask your advisor to clarify anything before you agree.",
        }))
      : []),
  ];
  const nodStep = terms.length + 1;
  const consentStep = nodStep + 1;
  const signatureStep = consentStep + 1;
  const reviewTotal = signatureStep + 1;
  const phase = session?.phase;
  useEffect(() => {
    if (!live || phase !== "review") return;
    const timer = setInterval(() => {
      fetch(`/api/session/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telemetry: {
            ...telemetry.current,
            confusionEvents: confusion.current,
            confusionEventsCount: confusion.current.length,
            timeSpentReviewingSeconds: Math.floor(
              (Date.now() - reviewStarted.current) / 1000,
            ),
          },
        }),
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [id, live, phase]);
  useEffect(() => {
    setTopic(
      Math.min(
        Math.max(session?.presentedTopic ?? 0, 0),
        policy.simplifiedSummary.length,
      ),
    );
  }, [session?.presentedTopic]);
  useEffect(() => {
    if (previousPhase.current !== phase) {
      if (phase === "review") reviewStarted.current = Date.now();
      setReviewStep(0);
      setFinalChecked(false);
      setAcknowledged(false);
      setTypedSignature("");
      setDrawnSignature("");
      if (phase === "welcome") {
        setWelcomeStep(0);
        setAudioConsent(false);
        setCameraConsent(false);
        setFaceChecked(false);
      }
      previousPhase.current = phase;
    }
  }, [phase]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [welcomeStep, reviewStep, phase, help, topic]);
  useEffect(() => {
    if (signatureMode !== "draw" || !canvas.current || !drawnSignature) return;
    const image = new Image();
    image.onload = () =>
      canvas.current?.getContext("2d")?.drawImage(image, 0, 0);
    image.src = drawnSignature;
  }, [signatureMode, reviewStep, drawnSignature]);
  function pointer(e: PointerEvent<HTMLCanvasElement>, start: boolean) {
    const node = canvas.current,
      context = node?.getContext("2d");
    if (!node || !context) return;
    const rect = node.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * node.width) / rect.width,
      y = ((e.clientY - rect.top) * node.height) / rect.height;
    if (start) {
      hasStroke.current = false;
      drawing.current = true;
      node.setPointerCapture(e.pointerId);
      context.beginPath();
      context.moveTo(x, y);
    } else if (drawing.current) {
      hasStroke.current = true;
      context.lineWidth = 3;
      context.strokeStyle = "#2459d3";
      context.lineCap = "round";
      context.lineTo(x, y);
      context.stroke();
    }
  }
  function finishDrawing() {
    if (drawing.current && hasStroke.current)
      setDrawnSignature(canvas.current?.toDataURL() || "");
    drawing.current = false;
  }
  if (!ready)
    return (
      <div className="client-app loading-state">Opening your session…</div>
    );
  if (!session)
    return (
      <div className="client-app missing-session">
        <Brand />
        <h1>Session unavailable</h1>
        <p>{error || "Ask your advisor for a valid session link."}</p>
        <p className="wizard-note" style={{ marginTop: 16 }}>
          Please contact your financial adviser for a valid consultation link.
        </p>
      </div>
    );
  const welcome = phase === "welcome",
    reviewing = phase === "review",
    signed = phase === "signed";
  const showCamera = !help && ((welcome && welcomeStep === 3) || reviewing);
  const minimizeCamera =
    reviewing && reviewStep !== 0 && reviewStep !== nodStep;
  const activeTerm = terms[Math.max(0, reviewStep - 1)];
  const advisorFullName = session.advisor?.fullName || "Your advisor";
  const advisorFirstName = session.advisor?.fullName
    ? session.advisor.fullName.split(" ")[0]
    : "your advisor";
  const advisorInitials = session.advisor?.fullName
    ? session.advisor.fullName
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AG";
  let title = "Following along";
  if (welcome)
    title = [
      `Welcome, ${session.name.split(" ")[0]}.`,
      "Audio recording",
      "When we use your camera",
      "Check your camera",
    ][welcomeStep];
  if (reviewing)
    title =
      reviewStep === 0
        ? "Before your final review"
        : reviewStep <= terms.length
          ? activeTerm.title
          : reviewStep === nodStep
            ? "Confirm it’s still you"
            : reviewStep === consentStep
              ? "Confirm understanding"
              : "Add your signature";
  if (signed) title = `Thank you, ${session.name.split(" ")[0]}.`;
  if (help) title = questionSent ? "Question sent" : "Ask your advisor";
  const stageLabel = welcome
    ? "Before we start"
    : reviewing
      ? "Summary & consent"
      : signed
        ? "Complete"
        : "Conversation";
  const step = welcome ? welcomeStep + 1 : reviewing ? reviewStep + 1 : 1;
  const total = welcome ? 4 : reviewing ? reviewTotal : 1;
  async function next() {
    if (submitting || busy) return;
    if (welcome) {
      if (welcomeStep < 3) setWelcomeStep((s) => s + 1);
      else {
        if (live) {
          try {
            const response = await fetch(`/api/session/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recordingConsent: audioConsent,
                cameraConsent: cameraConsent,
              }),
            });
            if (!response.ok) throw new Error("Could not save permissions.");
          } catch {
            setSubmitError("Could not save permissions. Try again.");
            return;
          }
        } else setFaceChecked(true);
        await update({ phase: "conversation", status: "In progress" });
      }
    } else if (reviewing) {
      if (reviewStep === nodStep && !live) setFinalChecked(true);
      if (reviewStep < signatureStep) setReviewStep((s) => s + 1);
      else if (finalChecked && acknowledged && !session?.question) {
        if (!live) {
          await update({ phase: "signed", status: "Needs review" });
          return;
        }
        setSubmitting(true);
        setSubmitError("");
        try {
          let signatureDataUrl = drawnSignature;
          if (signatureMode === "type") {
            const signature = document.createElement("canvas");
            signature.width = 600;
            signature.height = 150;
            const context = signature.getContext("2d");
            if (!context) throw new Error("Signature unavailable");
            context.font = "italic 40px serif";
            context.fillStyle = "#172b4d";
            context.fillText(typedSignature.trim(), 20, 85, 560);
            signatureDataUrl = signature.toDataURL("image/png");
          }
          const response = await fetch("/api/consent/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: id,
              customerId: session?.name,
              policyId: policy.id,
              signatureDataUrl,
              liveness: {
                ...telemetry.current,
                confusionEvents: confusion.current,
                confusionEventsCount: confusion.current.length,
                confusionDetected: confusion.current.length > 0,
                timeSpentReviewingSeconds: Math.floor(
                  (Date.now() - reviewStarted.current) / 1000,
                ),
                calibratedFaceMeshAvailable: Boolean(mesh),
              },
              agentAudioAuditPassed: !session?.backend?.copilotEvents.some(
                (e) => e.warningFlags !== "GREEN",
              ),
            }),
          });
          const data = await response.json();
          if (!response.ok || !data.success)
            throw new Error(data.error || "Submission failed");
          setFaceImage(null);
          setMesh(null);
          await refresh();
        } catch (e) {
          setSubmitError(
            e instanceof Error ? e.message : "Submission failed. Try again.",
          );
        } finally {
          setSubmitting(false);
        }
      }
    } else if (phase === "conversation") update({ phase: "review" });
  }
  const signatureValid =
    signatureMode === "type"
      ? typedSignature.trim().length > 1
      : Boolean(drawnSignature);
  const disabled =
    (live && reviewing && !mesh) ||
    submitting ||
    busy ||
    (live && welcome && welcomeStep === 3 && !faceChecked) ||
    (live && reviewing && reviewStep === nodStep && !finalChecked) ||
    (welcome
      ? (welcomeStep === 1 && !audioConsent) ||
        (welcomeStep === 2 && !cameraConsent)
      : reviewing
        ? (reviewStep === consentStep &&
            (!acknowledged || Boolean(session.question))) ||
          (reviewStep === signatureStep &&
            (!signatureValid ||
              !finalChecked ||
              !acknowledged ||
              Boolean(session.question)))
        : false);
  const action = welcome
    ? [
        "Get started",
        "Agree and continue",
        "Agree and continue",
        live ? "Join conversation" : "Simulate identity check & join",
      ][welcomeStep]
    : reviewing
      ? reviewStep === 0
        ? "Start reading"
        : reviewStep < terms.length
          ? "Next detail"
          : reviewStep === terms.length
            ? "Continue to identity check"
            : reviewStep === nodStep
              ? live
                ? "Confirm and continue"
                : "Simulate face match & nod"
              : reviewStep === consentStep
                ? "Continue to signature"
                : live
                  ? "Submit consent"
                  : "Submit demo consent"
      : live
        ? "Begin final review"
        : "Preview final review";
  const canBack = welcome
    ? welcomeStep > 0
    : reviewing
      ? reviewStep > 0
      : false;
  function back() {
    if (welcome) setWelcomeStep((s) => s - 1);
    else if (reviewing) setReviewStep((s) => s - 1);
  }
  return (
    <div className="client-app client-wizard">
      <div className="wizard-shell">
        <header className="wizard-header">
          <Brand small />
          <span>
            <LockKeyhole size={13} />
            Client session
          </span>
        </header>
        <div className="wizard-demo">
          {live
            ? "Connected session"
            : "Preview · no recording or real application"}
        </div>
        <main className="wizard-main">
          <div className="wizard-progress">
            <span>{help ? "Help" : stageLabel}</span>
            <span>{!help && !signed && `${step} of ${total}`}</span>
            <div>
              <i style={{ width: `${(step / total) * 100}%` }} />
            </div>
          </div>
          <div
            className={`wizard-body ${showCamera ? "with-camera" : ""} ${showCamera && !minimizeCamera ? "camera-screen" : ""}`}
          >
            <h1 ref={heading} tabIndex={-1}>
              {title}
            </h1>
            {(error || submitError) && (
              <p className="wizard-error" role="alert">
                {submitError || error}
              </p>
            )}
            {help ? (
              questionSent ? (
                <>
                  <div className="wizard-symbol">
                    <Check size={30} />
                  </div>
                  <p>
                    {advisorFirstName} can now see your question. Talk it through together
                    before continuing.
                  </p>
                  <blockquote className="wizard-question">
                    {question}
                  </blockquote>
                </>
              ) : (
                <>
                  <p>What would you like {advisorFirstName} to explain?</p>
                  <label className="wizard-field">
                    Your question
                    <textarea
                      rows={3}
                      maxLength={350}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="For example: what if I need to cancel?"
                    />
                  </label>
                  <p className="wizard-note">
                    Your question appears in your advisor’s session.
                  </p>
                </>
              )
            ) : (
              <>
                {welcome && welcomeStep === 0 && (
                  <>
                    <p>
                      Follow your policy with {advisorFirstName}. First, we’ll explain
                      recording and check your camera.
                    </p>
                    <div className="wizard-session">
                      <span className="avatar agent-avatar">{advisorInitials}</span>
                      <div>
                        <strong>{advisorFullName}</strong>
                        <span>Your advisor</span>
                      </div>
                    </div>
                    <div className="wizard-policy">
                      <span>Policy to discuss</span>
                      <strong>{session.policy}</strong>
                    </div>
                    <p className="wizard-note">
                      Joining the conversation does not mean buying a policy.
                    </p>
                  </>
                )}
                {welcome && welcomeStep === 1 && (
                  <>
                    <div className="wizard-symbol">
                      <Mic size={30} />
                    </div>
                    <p>
                      Audio from your conversation will be recorded to prepare
                      an accurate summary.
                    </p>
                    <p>You can ask {advisorFirstName} to pause or stop at any time.</p>
                    <label className="wizard-check">
                      <input
                        type="checkbox"
                        checked={audioConsent}
                        onChange={(e) => setAudioConsent(e.target.checked)}
                      />
                      <span>I agree to the audio recording.</span>
                    </label>
                    <p className="wizard-note">
                      {live
                        ? "Your advisor controls when recording starts and stops."
                        : "This preview does not record audio."}
                    </p>
                  </>
                )}
                {welcome && welcomeStep === 2 && (
                  <>
                    <div className="wizard-symbol">
                      <Camera size={30} />
                    </div>
                    <ul className="wizard-camera-facts">
                      <li>
                        <strong>At the start</strong>
                        <span>A brief identity check.</span>
                      </li>
                      <li>
                        <strong>At the final review</strong>
                        <span>
                          While you read the summary and confirm it’s you.
                        </span>
                      </li>
                      <li>
                        <strong>During the conversation</strong>
                        <span>Your camera stays off.</span>
                      </li>
                    </ul>
                    <label className="wizard-check">
                      <input
                        type="checkbox"
                        checked={cameraConsent}
                        onChange={(e) => setCameraConsent(e.target.checked)}
                      />
                      <span>I agree to this camera use.</span>
                    </label>
                    <p className="wizard-note">
                      {live
                        ? "Face snapshots are sent to our server and Google Gemini for identity comparison."
                        : "Face images stay on your device. Nothing is saved or uploaded."}
                    </p>
                  </>
                )}
                {welcome && welcomeStep === 3 && (
                  <p>
                    {live
                      ? "Position your face in the frame for the opening check."
                      : "Position your face in the frame. Identity matching is simulated in this preview."}
                  </p>
                )}
                {phase === "conversation" && (
                  <>
                    <div className="wizard-camera-off">
                      <CameraOff size={17} />
                      Camera off while you talk
                    </div>
                    <article className="wizard-topic">
                      <span>
                        POLICY DETAIL {topic + 1} OF {terms.length}
                      </span>
                      <h2>{terms[topic].title}</h2>
                      <p>{terms[topic].body}</p>
                    </article>
                    <div className="wizard-topic-nav">
                      <button
                        aria-label="Previous policy detail"
                        disabled={topic === 0}
                        onClick={() => setTopic((t) => t - 1)}
                      >
                        <ArrowLeft size={17} />
                        Previous
                      </button>
                      <button
                        aria-label="Next policy detail"
                        disabled={topic === terms.length - 1}
                        onClick={() => setTopic((t) => t + 1)}
                      >
                        Next
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </>
                )}
                {reviewing && reviewStep === 0 && (
                  <p>
                    Your camera is used again during the summary and final
                    identity check. You control when it turns on.
                  </p>
                )}
                {reviewing && reviewStep > 0 && reviewStep <= terms.length && (
                  <>
                    <p className="wizard-term-number">
                      SUMMARY {reviewStep} OF {terms.length}
                    </p>
                    <p className="wizard-term">{activeTerm.body}</p>
                    <p className="wizard-note">{activeTerm.detail}</p>
                  </>
                )}
                {reviewing && reviewStep === nodStep && (
                  <p>
                    {live
                      ? "Look at the camera and give a small nod. Wait for the face and gesture check to complete."
                      : "Look at the camera and give a small nod. This preview simulates the check."}
                  </p>
                )}
                {reviewing &&
                  reviewStep === consentStep &&
                  (session.question ? (
                    <>
                      <p className="wizard-error" role="status">
                        Your question is still open. Talk it through with {advisorFirstName}
                        before agreeing.
                      </p>
                      <p>
                        {advisorFirstName} needs to mark it as discussed. You can then confirm
                        your understanding here.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>Have all your questions been answered?</p>
                      <label className="wizard-check">
                        <input
                          type="checkbox"
                          checked={acknowledged}
                          onChange={(e) => setAcknowledged(e.target.checked)}
                        />
                        <span>
                          I understand the policy, its costs and conditions, and
                          have had my questions answered.
                        </span>
                      </label>
                      <p className="wizard-note">
                        Use Back to review a detail.
                      </p>
                    </>
                  ))}
                {reviewing && reviewStep === signatureStep && (
                  <>
                    <div
                      className="wizard-signature-tabs"
                      role="group"
                      aria-label="Signature method"
                    >
                      <button
                        aria-pressed={signatureMode === "type"}
                        onClick={() => setSignatureMode("type")}
                      >
                        Type name
                      </button>
                      <button
                        aria-pressed={signatureMode === "draw"}
                        onClick={() => setSignatureMode("draw")}
                      >
                        Draw signature
                      </button>
                    </div>
                    {signatureMode === "type" ? (
                      <label className="wizard-field">
                        Your full name
                        <input
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          autoComplete="name"
                          placeholder="Type your full name"
                        />
                      </label>
                    ) : (
                      <>
                        <div className="wizard-signature-label">
                          <span>Sign inside the box</span>
                          <button
                            onClick={() => {
                              canvas.current
                                ?.getContext("2d")
                                ?.clearRect(0, 0, 600, 180);
                              setDrawnSignature("");
                            }}
                          >
                            <Trash2 size={14} />
                            Clear
                          </button>
                        </div>
                        <canvas
                          className="wizard-signature-canvas"
                          ref={canvas}
                          width={600}
                          height={180}
                          onPointerDown={(e) => pointer(e, true)}
                          onPointerMove={(e) => pointer(e, false)}
                          onPointerUp={finishDrawing}
                          onPointerCancel={finishDrawing}
                          aria-label="Draw your demo signature"
                        />
                      </>
                    )}
                    <p className="wizard-note">
                      Demo only. Your signature is not saved.
                    </p>
                  </>
                )}
                {signed && (
                  <>
                    <div className="wizard-symbol">
                      <Check size={32} />
                    </div>
                    <p>
                      Your consent has been received. {session.advisor?.fullName?.split(" ")[0] || "Your advisor"} will explain what
                      happens next.
                    </p>
                    <dl className="wizard-receipt">
                      <div>
                        <dt>Policy</dt>
                        <dd>{session.policy}</dd>
                      </div>
                      <div>
                        <dt>Reference</dt>
                        <dd>{id === "preview" ? "VR-DEMO" : id}</dd>
                      </div>
                      <div>
                        <dt>Your advisor</dt>
                        <dd>{advisorFullName}</dd>
                      </div>
                    </dl>
                  </>
                )}
              </>
            )}
            {live && reviewing && !mesh && (
              <p className="wizard-error">
                Opening camera data is unavailable after reloading.{" "}
                <button
                  className="text-button"
                  onClick={() => void update({ phase: "welcome" })}
                >
                  Restart opening check
                </button>
              </p>
            )}
            {showCamera && live && (!reviewing || mesh) && (
              <VisualFocusRing
                compact
                minimized={minimizeCamera}
                mode={
                  welcome
                    ? "CALIBRATION"
                    : reviewStep === nodStep
                      ? "NOD_AND_VERIFY"
                      : "FOCUS_MONITOR"
                }
                activeTopic={
                  reviewing && reviewStep > 0 && reviewStep <= terms.length
                    ? activeTerm.title
                    : "Policy review"
                }
                calibratedMesh={mesh}
                calibratedFaceImage={faceImage}
                onCalibrationComplete={(vector, image) => {
                  setMesh(vector);
                  setFaceImage(image || null);
                  setFaceChecked(true);
                  if (live) {
                    fetch(`/api/session/${id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        calibratedMesh: vector,
                        calibratedFaceImage: image || null,
                      }),
                    }).catch(() => {});
                  }
                }}
                onTelemetryUpdate={(value) => {
                  telemetry.current = { ...telemetry.current, ...value };
                }}
                onConfusionLogged={(event) => {
                  if (!confusion.current.some((e) => e.id === event.id))
                    confusion.current.push(event);
                }}
                onNodDetected={(agreed, confidence, matchScore) => {
                  setFinalChecked(agreed);
                  telemetry.current = {
                    ...telemetry.current,
                    passed: agreed,
                    score: matchScore,
                    gestureAgreement: {
                      nodDetected: agreed,
                      nodConfidence: confidence,
                      shakeDetected: !agreed,
                      faceMatchScore: matchScore,
                      faceMatchPassed: matchScore >= 0.82,
                    },
                  };
                }}
              />
            )}
            {showCamera && !live && (
              <CameraPreview
                stage={welcome ? "opening" : "review"}
                checked={welcome ? faceChecked : finalChecked}
                onChecked={() =>
                  welcome ? setFaceChecked(true) : setFinalChecked(true)
                }
                compact
                minimized={minimizeCamera}
                hideDemoCheck
              />
            )}
          </div>
          <footer className="wizard-actions">
            {help ? (
              <>
                <button
                  className="v-button primary full"
                  disabled={!questionSent && !question.trim()}
                  onClick={async () => {
                    if (questionSent) {
                      setHelp(false);
                      return;
                    }
                    if (await update({ question: question.trim() })) {
                      setAcknowledged(false);
                      setQuestionSent(true);
                    }
                  }}
                >
                  {questionSent ? "Back to my session" : "Send question"}
                  <ArrowRight size={17} />
                </button>
                {!questionSent && (
                  <button
                    className="wizard-help"
                    onClick={() => setHelp(false)}
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : signed ? (
              <>
                <button
                  className="v-button primary full"
                  onClick={() =>
                    downloadText(
                      `${id}-client-summary.txt`,
                      `VERA SESSION SUMMARY\n${session.name}\n${session.policy}\nPremium: S$${policy.premiumAmount} ${policy.premiumFrequency}\n\n${policy.simplifiedSummary.join("\n\n")}\nYour advisor will explain next steps.`,
                    )
                  }
                >
                  <Download size={17} />
                  Save summary
                </button>
                <p className="wizard-note" style={{ textAlign: "center", marginTop: 12 }}>
                  Your consent has been securely recorded. You may safely close this page.
                </p>
              </>
            ) : (
              <>
                <div className="wizard-action-row">
                  {canBack && (
                    <button className="wizard-back" onClick={back}>
                      <ArrowLeft size={17} />
                      Back
                    </button>
                  )}
                  <button
                    className="v-button primary"
                    disabled={disabled}
                    onClick={next}
                  >
                    {submitting ? "Submitting…" : action}
                    <ArrowRight size={17} />
                  </button>
                </div>

              </>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
