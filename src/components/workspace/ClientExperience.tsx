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
import { CameraPreview } from "./CameraPreview";
import { useDemoSession } from "./useDemoSession";
import { DUMMY_POLICIES } from "@/lib/dummy-data";
import { downloadText } from "@/lib/frontend-demo";

export function ClientExperience({ id }: { id: string }) {
  const { session, ready, update, error } = useDemoSession(id);
  const [welcomeStep, setWelcomeStep] = useState(0);
  const [reviewStep, setReviewStep] = useState(0);
  const [audioConsent, setAudioConsent] = useState(false);
  const [cameraConsent, setCameraConsent] = useState(false);
  const [faceChecked, setFaceChecked] = useState(false);
  const [finalChecked, setFinalChecked] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [topic, setTopic] = useState(0);
  const [conversationView, setConversationView] = useState("Following along");
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
    DUMMY_POLICIES.find((p) =>
      p.name.startsWith(session?.policy || "missing"),
    ) || DUMMY_POLICIES[0];
  const terms = [
    {
      title: "Your premium",
      body: `You pay S$${policy.premiumAmount} ${policy.premiumFrequency}.`,
      detail: "Make sure this amount fits your budget before agreeing.",
    },
    ...policy.simplifiedSummary.map((body, i) => ({
      title: policy.clauses[i]?.title || `Policy detail ${i + 1}`,
      body,
      detail: "Ask Andi if you would like this explained.",
    })),
  ];
  const nodStep = terms.length + 1;
  const consentStep = nodStep + 1;
  const signatureStep = consentStep + 1;
  const reviewTotal = signatureStep + 1;
  const phase = session?.phase;
  useEffect(() => {
    setTopic(session?.presentedTopic ?? 0);
  }, [session?.presentedTopic]);
  useEffect(() => {
    if (previousPhase.current !== phase) {
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
        <p>Open this demo in the same browser as the agent workspace.</p>
        <Link href="/" className="v-button primary">
          Back to workspace
        </Link>
      </div>
    );
  const welcome = phase === "welcome",
    reviewing = phase === "review",
    signed = phase === "signed";
  const showCamera = !help && ((welcome && welcomeStep === 3) || reviewing);
  const minimizeCamera =
    reviewing && reviewStep !== 0 && reviewStep !== nodStep;
  const activeTerm = terms[Math.max(0, reviewStep - 1)];
  let title = "Your conversation";
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
      ? "Review & consent"
      : signed
        ? "Complete"
        : "Conversation";
  const step = welcome ? welcomeStep + 1 : reviewing ? reviewStep + 1 : 1;
  const total = welcome ? 4 : reviewing ? reviewTotal : 1;
  function next() {
    if (welcome) {
      if (welcomeStep < 3) setWelcomeStep((s) => s + 1);
      else {
        setFaceChecked(true);
        update({ phase: "conversation", status: "In progress" });
      }
    } else if (reviewing) {
      if (reviewStep === nodStep) setFinalChecked(true);
      if (reviewStep < signatureStep) setReviewStep((s) => s + 1);
      else if (finalChecked && acknowledged && !session?.question)
        update({ phase: "signed", status: "Needs review" });
    } else if (phase === "conversation") update({ phase: "review" });
  }
  const signatureValid =
    signatureMode === "type"
      ? typedSignature.trim().length > 1
      : Boolean(drawnSignature);
  const disabled = welcome
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
      : false;
  const action = welcome
    ? [
        "Get started",
        "Agree and continue",
        "Agree and continue",
        "Simulate identity check & join",
      ][welcomeStep]
    : reviewing
      ? reviewStep === 0
        ? "Start reading"
        : reviewStep < terms.length
          ? "Next detail"
          : reviewStep === terms.length
            ? "Continue to identity check"
            : reviewStep === nodStep
              ? "Simulate face match & nod"
              : reviewStep === consentStep
                ? "Continue to signature"
                : "Submit demo consent"
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
          Preview · no recording or real application
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
            {error && (
              <p className="wizard-error" role="alert">
                {error}
              </p>
            )}
            {help ? (
              questionSent ? (
                <>
                  <div className="wizard-symbol">
                    <Check size={30} />
                  </div>
                  <p>
                    Andi can now see your question. Talk it through together
                    before continuing.
                  </p>
                  <blockquote className="wizard-question">
                    {question}
                  </blockquote>
                </>
              ) : (
                <>
                  <p>What would you like Andi to explain?</p>
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
                    Your question appears in the agent tab in this browser.
                  </p>
                </>
              )
            ) : (
              <>
                {welcome && welcomeStep === 0 && (
                  <>
                    <p>
                      Follow your policy with Andi. First, we’ll explain
                      recording and check your camera.
                    </p>
                    <div className="wizard-session">
                      <span className="avatar agent-avatar">AW</span>
                      <div>
                        <strong>Andi Wijaya</strong>
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
                    <p>You can ask Andi to pause or stop at any time.</p>
                    <label className="wizard-check">
                      <input
                        type="checkbox"
                        checked={audioConsent}
                        onChange={(e) => setAudioConsent(e.target.checked)}
                      />
                      <span>I agree to the audio recording.</span>
                    </label>
                    <p className="wizard-note">
                      This preview does not record audio.
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
                      Face images stay on your device. Nothing is saved or
                      uploaded.
                    </p>
                  </>
                )}
                {welcome && welcomeStep === 3 && (
                  <p>
                    Position your face in the frame. Identity matching is
                    simulated in this preview.
                  </p>
                )}
                {phase === "conversation" && (
                  <>
                    <div className="wizard-camera-off">
                      <CameraOff size={17} />
                      Camera off while you talk
                    </div>
                    <div className="wizard-signature-tabs" role="group" aria-label="Conversation view">
                      {["Following along", "Summary", "My question"].map(view => <button key={view} aria-pressed={conversationView === view} onClick={() => setConversationView(view)}>{view}</button>)}
                    </div>
                    {conversationView === "Summary" ? <article className="wizard-topic"><span>CONVERSATION SUMMARY · DEMO</span><p>{session.conversationSummary || "Your summary will appear as the agent plays the sample conversation."}</p></article> : conversationView === "My question" ? <article className="wizard-topic"><span>YOUR CONCERN</span><p>{session.question || "No open questions. Use Ask your advisor whenever something is unclear."}</p></article> : <>
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
                    </>}
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
                      POLICY DETAIL {reviewStep} OF {terms.length}
                    </p>
                    <p className="wizard-term">{activeTerm.body}</p>
                    <p className="wizard-note">{activeTerm.detail}</p>
                  </>
                )}
                {reviewing && reviewStep === nodStep && (
                  <p>
                    Look at the camera and give a small nod. This preview
                    simulates the check; it does not verify your identity.
                  </p>
                )}
                {reviewing && reviewStep === consentStep && (
                  session.question ? <><p className="wizard-error" role="status">Your question is still open. Talk it through with Andi before agreeing.</p><p>Andi needs to mark it as discussed. You can then confirm your understanding here.</p></> : <><p>Have all your questions been answered?</p><label className="wizard-check"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} /><span>I understand the policy, its costs and conditions, and have had my questions answered.</span></label><p className="wizard-note">Use Back to review a detail.</p></>
                )}
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
                      Your demo consent has been received. Andi will explain
                      what happens next.
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
                        <dd>Andi Wijaya</dd>
                      </div>
                    </dl>
                  </>
                )}
              </>
            )}
            {showCamera && (
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
                  onClick={() => {
                    if (questionSent) {
                      setHelp(false);
                      return;
                    }
                    if (update({ question: question.trim() })) {
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
                      `VERA DEMO SUMMARY — NOT A REAL APPLICATION\n${session.name}\n${session.policy}\nPremium: S$${policy.premiumAmount} ${policy.premiumFrequency}\n\n${policy.simplifiedSummary.join("\n\n")}\nYour advisor will explain next steps.`,
                    )
                  }
                >
                  <Download size={17} />
                  Save summary
                </button>
                <Link className="wizard-help" href="/">
                  Return to demo workspace
                </Link>
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
                    {action}
                    <ArrowRight size={17} />
                  </button>
                </div>
                <button
                  className="wizard-help"
                  onClick={() => {
                    setHelp(true);
                    setQuestionSent(false);
                  }}
                >
                  <MessageCircle size={16} />
                  {session.question
                    ? "View or ask a question"
                    : "I have a question"}
                </button>
              </>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
