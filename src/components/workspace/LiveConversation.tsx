"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechListener } from "@/components/copilot/SpeechListener";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Pause,
  Play,
  AudioLines,
  Clock3,
  MessageCircle,
  Sparkles,
  Info,
  FileText,
  Check,
  ArrowLeft,
} from "lucide-react";
import { DUMMY_POLICIES } from "@/lib/dummy-data";
import type { Session } from "@/types";
import { getMasStatusLabel } from "@/types";
export function LiveConversation({
  session,
  onRefresh,
  onEnd,
  onReset,
  demo = false,
}: {
  session: Session;
  onEnd?: () => Promise<boolean>;
  onReset?: () => Promise<boolean>;
  demo?: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [elapsed, setElapsed] = useState(demo ? 738 : 0);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [listening, setListening] = useState(demo);
  const [interim, setInterim] = useState("");
  const [text, setText] = useState(session.liveDialogueBuffer || "");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [remaining, setRemaining] = useState(60);
  const buffer = useRef(text);
  const inFlight = useRef(false);
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;
  const save = useCallback(
    async (value: string) => {
      if (demo) return;
      const response = await fetch(`/api/session/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialogueBuffer: value }),
      });
      if (!response.ok)
        throw new Error("Transcript could not be saved. Retry analysis.");
    },
    [session.id, demo],
  );
  const analyze = useCallback(async () => {
    if (demo) return true;
    if (inFlight.current) return false;
    if (!buffer.current.trim()) return true;
    inFlight.current = true;
    setWorking(true);
    setError("");
    try {
      await save(buffer.current);
      const response = await fetch("/api/copilot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          text: buffer.current,
          context: { agentId: session.agentId, policyId: session.policyId },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error || "Analysis failed. Try again.");
      await refresh.current();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis unavailable");
      return false;
    } finally {
      inFlight.current = false;
      setWorking(false);
    }
  }, [save, session.id, session.agentId, session.policyId, demo]);
  const receive = useCallback((chunk: string) => {
    if (!chunk.trim()) return;
    buffer.current = `${buffer.current} ${chunk.trim()}`.trim();
    setText(buffer.current);
  }, []);
  useEffect(() => {
    if (!text.trim()) return;
    const timer = setTimeout(() => {
      save(text).catch((e) => setError(e.message));
    }, 700);
    return () => clearTimeout(timer);
  }, [text, save]);
  useEffect(() => {
    if (!listening) return;
    let seconds = 60;
    const timer = setInterval(() => {
      setElapsed((value) => value + 1);
      seconds--;
      if (seconds <= 0) {
        void analyze();
        seconds = 60;
      }
      setRemaining(seconds);
    }, 1000);
    return () => clearInterval(timer);
  }, [listening, analyze]);
  useEffect(() => {
    if (session.status !== "HANDED_OFF") {
      if (listening) void analyze();
      setListening(false);
    }
  }, [session.status, listening, analyze]);

  const canRecord =
    session.status !== "CUSTOMER_REVIEWING" &&
    session.status !== "LIVENESS_CHECK" &&
    session.status !== "CONSENT_SIGNED" &&
    session.status !== "SUBMITTED";
  const policy =
    DUMMY_POLICIES.find((p) => p.id === session.policyId) || DUMMY_POLICIES[0];
  const analysis = session.copilotEvents.at(-1);
  const summaries = session.conversationSummary || [];
  const questions = session.clientQuestions || [];
  const attention = questions.find((q) => q.status !== "ANSWERED");
  const advice = analysis?.suggestedAnswers?.[0];
  const reviewing =
    session.status === "CUSTOMER_REVIEWING" ||
    session.status === "LIVENESS_CHECK";
  const stamp = analysis
    ? new Date(analysis.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Listening…";
  const clock = (value: number) =>
    `${Math.floor(value / 60)
      .toString()
      .padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
  const router = useRouter();
  async function finish() {
    setEnding(true);
    setListening(false);
    try {
      if (await analyze()) {
        await onEnd?.();
        router.push("/sessions");
      }
    } finally {
      setEnding(false);
    }
  }
  return (
    <div className="session-app conversation-room">
      <main className="conversation-room-main">
        <Link href="/sessions" className="back-link">
          <ArrowLeft size={15} /> Sessions
        </Link>
        <header className="room-heading">
          <div>
            <h1>{reviewing ? "Client final review" : "Live conversation"}</h1>
            <p>
              {session.customerName} <span>·</span>{" "}
              {policy.name.split(" (")[0]} <span>·</span>{" "}
              {reviewing
                ? "Client is reviewing independently on mobile"
                : `${clock(elapsed)} elapsed`}
            </p>
          </div>
          <div className="room-actions">
            {demo && reviewing && (
              <button
                className="v-button secondary"
                onClick={() => void onReset?.()}
              >
                Reset sample
              </button>
            )}
            <Link
              className="v-button secondary"
              href={`/client/${session.id}`}
              target="_blank"
            >
              <ArrowUpRight size={17} />
              Customer view
            </Link>
            <button
              className="v-button secondary"
              disabled={!canRecord || reviewing || ending}
              onClick={() => {
                setListening(!listening);
                if (listening) void analyze();
              }}
            >
              {listening ? <Pause size={16} /> : <Play size={16} />}{" "}
              {listening ? "Pause" : elapsed > 0 ? "Resume" : "Start recording"}
            </button>
            {reviewing ? (
              <Link className="v-button primary" href="/sessions">
                Back to sessions
              </Link>
            ) : (
              <button
                className="v-button primary"
                disabled={ending || working}
                onClick={() => void finish()}
              >
                {ending ? "Finishing…" : "End conversation"}
              </button>
            )}
          </div>
        </header>
        <div className="room-batch">
          <span>
            <AudioLines size={19} />
            <strong>Audio captured in one-minute batches</strong>
          </span>
          <span>
            <Clock3 size={16} />
            {listening ? "Next audio batch in" : "Recording paused"}{" "}
            <strong>{listening ? clock(remaining) : "—"}</strong>
          </span>
          <span>
            Last batch reviewed <strong>{stamp}</strong>
          </span>
          {analysis && (
            <span>
              MAS Live Status{" "}
              <strong
                style={{
                  color:
                    analysis.warningFlags === "GREEN"
                      ? "#15803d"
                      : analysis.warningFlags === "YELLOW"
                      ? "#b45309"
                      : "#b91c1c",
                }}
              >
                ● {getMasStatusLabel(analysis.warningFlags)}
              </strong>
            </span>
          )}
        </div>
        {!demo && canRecord && (
          <SpeechListener
            minimal
            onTranscript={receive}
            isListening={listening}
            onToggleListening={setListening}
            interimTranscript={interim}
            setInterimTranscript={setInterim}
            engineMode="cloud"
          />
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="room-columns">
          <section className="room-card">
            <header>
              <h2>
                <MessageCircle size={21} />
                Conversation so far
              </h2>
              <span className="room-chip">
                {analysis ? `Updated ${stamp}` : "Waiting for first batch"}
              </span>
            </header>
            <div className="room-card-body">
              <ul className="room-summary">
                {summaries.length ? (
                  summaries.map((line, i) => <li key={i}>{line}</li>)
                ) : (
                  <li>Key points will appear after the first audio review.</li>
                )}
              </ul>
              <div className="room-questions">
                <h3>CUSTOMER QUESTIONS</h3>
                {questions.length ? (
                  questions.map((q) => (
                    <div
                      key={q.id}
                      className={`room-question ${q.status !== "ANSWERED" ? "needs-answer" : ""}`}
                    >
                      <span>“{q.question}”</span>
                      <span
                        className={`room-chip ${q.status === "ANSWERED" ? "reviewed" : "attention"}`}
                      >
                        {q.status === "ANSWERED"
                          ? "Reviewed"
                          : "Needs explanation"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>No questions captured yet.</p>
                )}
                {session.clientQuestion && (
                  <div className="room-question needs-answer">
                    <span>“{session.clientQuestion}”</span>
                    <button
                      className="text-button"
                      onClick={async () => {
                        if (demo) return;
                        const response = await fetch(
                          `/api/session/${session.id}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ clientQuestion: "" }),
                          },
                        );
                        if (response.ok) await onRefresh();
                        else
                          setError("Could not mark the question as discussed.");
                      }}
                    >
                      Mark discussed
                    </button>
                  </div>
                )}
              </div>
              <p className="room-footnote">
                Summaries and questions update after each audio review.
              </p>
            </div>
          </section>
          <section className="room-card">
            <header>
              <h2>
                <Sparkles size={21} />
                AI Copilot
              </h2>
              <span className="room-chip blue">Guidance</span>
            </header>
            <div className="room-card-body">
              <div
                className={`room-advice ${attention || session.clientQuestion ? "attention" : ""}`}
              >
                <span>
                  <Info size={14} />
                  {attention || session.clientQuestion
                    ? "A QUESTION NEEDS ATTENTION"
                    : "NEXT STEP"}
                </span>
                <h3>
                  {attention || session.clientQuestion
                    ? "Explain the concern before continuing"
                    : "Give your client time to understand"}
                </h3>
                <p>
                  {advice?.cheatSheetBullet ||
                    analysis?.detectedIssues[0]?.explanation ||
                    "Walk through the policy in plain language. Guidance will update after each audio review."}
                </p>
              </div>
              <div className="room-wording">
                <span>SUGGESTED WORDING</span>
                <p>
                  {advice?.suggestedResponse
                    ? `“${advice.suggestedResponse}”`
                    : "Ask your client what they would like explained before moving on."}
                </p>
              </div>
              <button
                className="v-button secondary"
                onClick={() => setPolicyOpen(!policyOpen)}
              >
                <FileText size={17} />
                {policyOpen ? "Close policy" : "Open policy"}
              </button>
              {policyOpen && (
                <div className="room-policy">
                  <h3>{policy.name}</h3>
                  {policy.simplifiedSummary.map((item, i) => (
                    <div key={i}>
                      <p>{item}</p>
                      <button
                        className="text-button"
                        onClick={async () => {
                          if (demo) return;
                          const response = await fetch(
                            `/api/session/${session.id}`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ presentedTopic: i + 1 }),
                            },
                          );
                          if (!response.ok)
                            setError("Could not share policy detail.");
                        }}
                      >
                        Show to customer
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="room-footnote">
                <strong>Then</strong> Ask whether {session.customerName} has any
                remaining questions.
              </p>
            </div>
          </section>
        </div>
        <div className="room-status">
          <span>
            <Check size={15} />
            Customer connected
          </span>
          <span>
            <Check size={15} />
            {session.recordingConsent
              ? "Recording consent received"
              : "Awaiting recording consent"}
          </span>
          <p>Approval is decided after consent—not during the pitch.</p>
        </div>
        <div className="room-notice">
          <Info size={17} />
          AI guidance can be incomplete. Check the policy before answering.
        </div>
        {!demo && (
          <details className="room-transcript">
            <summary>Transcript & analysis controls</summary>
            <label className="form-field">
              Conversation transcript
              <textarea
                rows={5}
                value={text}
                onChange={(e) => {
                  buffer.current = e.target.value;
                  setText(e.target.value);
                }}
              />
            </label>
            {interim && <p>{interim}</p>}
            <button
              className="v-button secondary"
              disabled={working || !text.trim()}
              onClick={() => void analyze()}
            >
              {working ? "Analyzing…" : "Analyze now"}
            </button>
          </details>
        )}
      </main>
    </div>
  );
}
