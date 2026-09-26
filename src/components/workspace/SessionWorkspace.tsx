"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CameraOff,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  FileText,
  LockKeyhole,
  MessageCircle,
  Mic,
  Pause,
  Play,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SessionHistory } from "./SessionHistory";
import { LiveConversation } from "./LiveConversation";
import { Brand } from "./Brand";
import { Modal, Status } from "./Workspace";
import { useDemoSession } from "./useDemoSession";
import { DUMMY_POLICIES } from "@/lib/dummy-data";
import { downloadText } from "@/lib/frontend-demo";

export function SessionWorkspace({ id }: { id: string }) {
  const { session, ready, update, error, live, busy, refresh } =
    useDemoSession(id);
  const [presentation,setPresentation]=useState(false);
  const [presentationPhase,setPresentationPhase]=useState("conversation");
  useEffect(()=>{setPresentation(new URLSearchParams(window.location.search).get("presentation") === "1");},[]);
  const [qr, setQr] = useState("");
  const [invite, setInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab] = useState("Conversation");
  const [url, setUrl] = useState("");
  const [copyError, setCopyError] = useState("");
  useEffect(() => {
    const link = `${window.location.origin}/client/${encodeURIComponent(id)}`;
    setUrl(link);
    QRCode.toDataURL(link, {
      width: 240,
      margin: 2,
      color: { dark: "#2459d3", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() =>
        setCopyError("QR preview unavailable. Use the client link below."),
      );
  }, [id]);
  useEffect(() => {
    if (!playing || session?.phase !== "conversation") return;
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [playing, session?.phase]);
  if (!ready)
    return (
      <div className="session-app loading-state">
        Opening your conversation…
      </div>
    );
  if (!session)
    return (
      <div className="session-app missing-session">
        <Brand />
        <h1>We couldn’t find this demo session.</h1>
        <p>Open the link in the browser where the session was created.</p>
        <Link className="v-button primary" href="/">
          Back to invitation
        </Link>
      </div>
    );
  const policy =
    session.policyData ||
    DUMMY_POLICIES.find((p) => p.name.startsWith(session.policy)) ||
    DUMMY_POLICIES[0];
  const analysis = session.backend?.copilotEvents.at(-1);
  const ended = session.phase === "signed";
  if (ended && !presentation) return <SessionHistory session={session} />;
  if (
    presentation || (live || session.isExample) &&
    (session.phase === "conversation" || session.phase === "review")
  ) {
    const cleanBackend: import("@/types").Session = session.backend || {
      id: session.id,
      agentId:
        session.advisor?.id ||
        (typeof window !== "undefined"
          ? localStorage.getItem("vera_active_agent_id")
          : null) ||
        "agt_andi_01",
      customerName: session.name,
      policyId: policy.id,
      status: (presentation ? presentationPhase : session.phase) === "review" ? "CUSTOMER_REVIEWING" : "HANDED_OFF",
      recordingConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conversationSummary: session.conversationSummary ? session.conversationSummary.split("\n") : [],
      clientQuestions: [],
      copilotEvents: [],
    };
    return (
      <LiveConversation
        key={id}
        session={cleanBackend}
        demo={false}
        onRefresh={refresh}
        onReset={async () => {
          if (presentation) {
            setPresentationPhase("conversation");
            return true;
          }
          return update({ phase: "conversation" });
        }}
        onEnd={async () => {
          if (presentation) {
            setPresentationPhase("review");
            return true;
          }
          return update({ phase: "review" });
        }}
      />
    );
  }
  const messages = [
    {
      who: "Andi",
      text: `Let’s take our time with ${session.policy}. I’ll walk you through the benefits, costs, and things to keep in mind.`,
    },
    {
      who: session.name.split(" ")[0],
      text: "I’d like to understand what happens if I need to stop paying later.",
    },
    {
      who: "Andi",
      text: "That’s a good question. Let’s look at the cancellation terms together before you decide.",
    },
    {
      who: session.name.split(" ")[0],
      text: "Thank you. I want to make sure I understand all of the costs.",
    },
    {
      who: "Andi",
      text: `The sample premium is S$${policy.premiumAmount} ${policy.premiumFrequency}. We can go through each of the policy conditions at your pace.`,
    },
  ];
  const visible = messages.slice(
    0,
    Math.min(messages.length, 3 + Math.floor(elapsed / 10)),
  );
  return (
    <div className="session-app">
      <header className="session-topbar">
        <Link href="/">
          <Brand small />
        </Link>
        <span className="session-breadcrumb">
          <Link href={`/agent/${id}/invite`}>Session invitation</Link>
          <ChevronRight size={14} />
          {id}
        </span>
        <span className="demo-label">
          <span />
          {live ? "Connected session" : "Interactive demo"}
        </span>
      </header>
      <main className="session-main">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} />
          Back to invitation
        </Link>
        <div className="session-heading">
          <div>
            <span className="eyebrow">A CONVERSATION WITH</span>
            <h1>{session.name}</h1>
            <p>{session.policy}</p>
          </div>
          <div className="session-heading-actions">
            <Status value={session.status} />
            <button
              className="v-button secondary"
              onClick={() => setInvite(true)}
            >
              <QrCode size={16} />
              Invite client
            </button>
          </div>
        </div>
        <div className="session-progress">
          {[
            "Welcome & identity",
            "Conversation",
            "Review & consent",
            "Submitted",
          ].map((s, i) => {
            const phaseIndex = [
              "welcome",
              "conversation",
              "review",
              "signed",
            ].indexOf(session.phase);
            return (
              <div
                className={
                  i === phaseIndex ? "current" : i < phaseIndex ? "done" : ""
                }
                key={s}
              >
                <span>{i < phaseIndex ? <Check size={13} /> : i + 1}</span>
                {s}
              </div>
            );
          })}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {session.phase === "welcome" ? (
          <section className="welcome-session-card">
            <span className="large-leaf-icon">
              <Users size={34} />
            </span>
            <Link className="v-button primary" href={`/session/${id}?presentation=1`} onClick={()=>setPresentation(true)}>Preview conversation <ArrowRight size={16}/></Link>
            <span className="eyebrow">SESSION SETUP</span>
            <h2>Invite your client to begin.</h2>
            <p>
              Invite {session.name.split(" ")[0]} to follow along. Their welcome
              screens explain recording, camera use, and the opening identity
              check one step at a time.
            </p>
            <div className="disclosure-script">
              <strong>Before you begin, explain:</strong>
              <p>
                “We’ll record the audio of our conversation so we can give you
                an accurate summary. Your camera is used briefly at the
                beginning and during your final review. Face snapshots are sent
                to our server and Google Gemini for identity comparison.”
              </p>
            </div>
            <p className="fixture-note">
              {live
                ? "The client must finish the opening steps before recording begins."
                : "In this frontend demo, no recording or real identity verification takes place."}
            </p>
            <Link
              className="v-button primary"
              href={`/client/${id}`}
              target="_blank"
            >
              Open client welcome <ArrowUpRight size={16} />
            </Link>
            <button
              className="v-button secondary"
              onClick={() => setInvite(true)}
            >
              <QrCode size={16} />
              Show invitation
            </button>
          </section>
        ) : (
          <div className="session-grid">
            <section className="conversation-panel">
              <div className="conversation-toolbar">
                <div className="conversation-tabs">
                  {["Conversation", "Policy summary"].map((t) => (
                    <button
                      className={tab === t ? "selected" : ""}
                      onClick={() => setTab(t)}
                      key={t}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <span className="sample-tag">
                  {live ? "LIVE SESSION" : "SAMPLE CONTENT"}
                </span>
              </div>
              {live && session.backend && (
                <div hidden={tab !== "Conversation"}>
                  <LiveConversation
                    session={session.backend}
                    onRefresh={refresh}
                  />
                </div>
              )}
              {tab === "Conversation" ? (
                live ? null : (
                  <>
                    <div className="transcript-meta">
                      <Mic size={15} />
                      <span>Sample transcript</span>
                      <span className="transcript-time">
                        {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
                        {String(elapsed % 60).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="transcript-list">
                      {visible.map((m, i) => (
                        <div className="transcript-item" key={i}>
                          <span
                            className={`avatar ${i % 2 ? "client-avatar" : "agent-avatar"}`}
                          >
                            {i % 2 ? session.initials : "AW"}
                          </span>
                          <div>
                            <div className="transcript-speaker">
                              <strong>{m.who}</strong>
                              <span>{i % 2 ? "Client" : "You"}</span>
                              <time>00:{String(i * 10).padStart(2, "0")}</time>
                            </div>
                            <p>{m.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {session.phase === "conversation" && (
                      <div className="transcript-controls">
                        <button
                          className="v-button secondary"
                          onClick={() => {
                            if (!playing)
                              update({
                                conversationSummary:
                                  "You asked about stopping payments and possible cancellation costs. Andi is explaining the conditions before you decide.",
                              });
                            setPlaying(!playing);
                          }}
                        >
                          {playing ? <Pause size={15} /> : <Play size={15} />}
                          {playing ? "Pause demo" : "Play sample conversation"}
                        </button>
                        <span>No microphone is being recorded</span>
                      </div>
                    )}
                  </>
                )
              ) : (
                <div className="session-policy">
                  <span className="eyebrow">ILLUSTRATIVE POLICY</span>
                  <h2>{policy.name.split(" (")[0]}</h2>
                  <div className="policy-facts">
                    <span>
                      Premium
                      <strong>
                        S${policy.premiumAmount} /{" "}
                        {policy.premiumFrequency === "monthly"
                          ? "month"
                          : "year"}
                      </strong>
                    </span>
                    <span>
                      Coverage
                      <strong>
                        S${policy.coverageAmount.toLocaleString("en-US")}
                      </strong>
                    </span>
                  </div>
                  <ul className="summary-list">
                    {policy.simplifiedSummary.map((s, index) => (
                      <li key={s}>
                        <Check size={17} />
                        {s}
                        {session.phase === "conversation" && (
                          <button
                            className="text-button"
                            onClick={() =>
                              update({ presentedTopic: index + 1 })
                            }
                          >
                            {session.presentedTopic === index + 1
                              ? "Shown to client"
                              : "Show to client"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
            <aside className="copilot-aside">
              <section className="copilot-card">
                <div className="copilot-heading">
                  <FileText size={19} />
                  <h2>Session guidance</h2>
                </div>
                <p className="copilot-caption">
                  {live
                    ? `Private to you · ${analysis?.auditEngine || "Waiting for analysis"}`
                    : "Private to you · Sample guidance"}
                </p>
                {live ? (
                  <div className="copilot-advice">
                    <h3>
                      {analysis
                        ? `${analysis.warningFlags} · Session guidance`
                        : "Ready to listen"}
                    </h3>
                    <p>
                      {analysis?.suggestedAnswers?.[0]?.suggestedResponse ||
                        analysis?.detectedIssues?.[0]?.explanation ||
                        "Start recording or enter a transcript. Contextual feedback appears after analysis."}
                    </p>
                    {analysis?.auditedQnAs?.map((q, i) => (
                      <p key={i}>
                        <strong>{q.clientQuestion}</strong>
                        <br />
                        {q.compliantScript}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="copilot-advice">
                    <span className="eyebrow">
                      {elapsed >= 60
                        ? "DEMO FEEDBACK UPDATED"
                        : "A HELPFUL NEXT STEP"}
                    </span>
                    <h3>
                      {elapsed >= 60
                        ? "Check client understanding"
                        : "Explain cancellation costs"}
                    </h3>
                    <p>
                      {elapsed >= 60
                        ? "Ask your client to explain the key terms in their own words. Leave time for clarification before the summary."
                        : "Your client asked about stopping payments. Explain any early cancellation charges with a simple, practical example."}
                    </p>
                  </div>
                )}
                <span className="feedback-timing">
                  <ClockIcon />
                  {live
                    ? "Context analysis every 60 seconds while recording"
                    : playing
                      ? `Next sample feedback in ${60 - (elapsed % 60)}s`
                      : "Feedback designed for 1-minute intervals"}
                </span>
              </section>
              <section className="client-status-card">
                <h3>
                  <Users size={17} />
                  Client experience
                </h3>
                <div className="camera-state">
                  <CameraOff size={18} />
                  <div>
                    <strong>
                      {session.phase === "conversation"
                        ? "Camera off during conversation"
                        : ended
                          ? "Client review finished"
                          : "Final review in progress"}
                    </strong>
                    <p>
                      {session.phase === "conversation"
                        ? "Camera checks resume during the final review."
                        : live
                          ? "Client camera verification runs during final review."
                          : "Identity and gesture checks are simulated in this demo."}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/client/${id}`}
                  target="_blank"
                  className="text-button"
                >
                  Open client preview <ArrowUpRight size={14} />
                </Link>
              </section>
              {session.question && (
                <section className="client-status-card question-card">
                  <h3>
                    <MessageCircle size={17} />A question from your client
                  </h3>
                  <p>{session.question}</p>
                  <button
                    className="text-button"
                    onClick={() => update({ question: undefined })}
                  >
                    Mark as discussed <Check size={15} />
                  </button>
                </section>
              )}
              <section className="next-step-card">
                {ended ? (
                  <>
                    <span className="eyebrow">AGENT-ONLY OUTCOME · DEMO</span>
                    <h3>
                      {session.status === "Fast-track"
                        ? "Ready to proceed"
                        : "Manual review required"}
                    </h3>
                    <Status value={session.status} />
                    <p>
                      {session.status === "Fast-track"
                        ? "This session is marked fast-track. Share the next steps with your client."
                        : "This session requires manual review. Check the audit notes before explaining next steps."}
                    </p>
                    {live &&
                      session.backend?.consentResult?.internalAuditNotes.map(
                        (note, i) => <p key={i}>{note}</p>,
                      )}
                    <button
                      className="v-button secondary full"
                      onClick={() =>
                        downloadText(
                          `${id}-summary.txt`,
                          `VERA SESSION SUMMARY\n${session.name}\n${session.policy}\n\n${policy.simplifiedSummary.join("\n")}\n\nAgent outcome: ${session.status}`,
                        )
                      }
                    >
                      <Download size={15} />
                      Download session summary
                    </button>
                  </>
                ) : (
                  <>
                    <span className="eyebrow">WHEN YOU’RE BOTH READY</span>
                    <h3>Client review</h3>
                    <p>
                      Give your client time to read the summary, ask questions,
                      and make their own decision.
                    </p>
                    <button
                      className="v-button primary full"
                      disabled={busy || session.phase === "review"}
                      onClick={async () => {
                        if (await update({ phase: "review" }))
                          setPlaying(false);
                      }}
                    >
                      {session.phase === "review"
                        ? "Waiting for client review"
                        : "Move to client review"}
                      <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </section>
            </aside>
          </div>
        )}
        <div className="session-bottom-note">
          <LockKeyhole size={14} />
          {live
            ? "Connected to the session backend. Camera verification uses MediaPipe and the configured face-verification service."
            : "Frontend preview. No audio analysis or approval decisions are connected."}
        </div>
      </main>
      {invite && (
        <Modal title="Invite your client" close={() => setInvite(false)}>
          <p className="modal-description">
            Open the client experience to follow along with this session.
          </p>
          {qr && (
            <img
              className="invite-qr"
              src={qr}
              alt="QR code linking to this demo client experience"
              width={220}
              height={220}
            />
          )}
          <p className="fixture-note">
            New demo sessions sync between tabs in this browser only.
            Cross-device pairing will use the backend during integration.
          </p>
          <label className="form-field">
            Client preview link
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
          </label>
          {copyError && (
            <p role="alert" className="form-error">
              {copyError}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="v-button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setCopyError("");
                } catch {
                  setCopyError(
                    "Copy unavailable. Select and copy the link above.",
                  );
                }
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              className="v-button primary"
              href={`/client/${id}`}
              target="_blank"
            >
              Open preview <ArrowUpRight size={15} />
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ClockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
