"use client";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Clock3,
  FileText,
} from "lucide-react";
import { DemoSession, downloadText } from "@/lib/frontend-demo";
export function SessionHistory({ session }: { session: DemoSession }) {
  const result = session.backend?.consentResult;
  const summary =
    session.conversationSummary?.split("\n").filter(Boolean) || [];
  const questions =
    session.backend?.clientQuestions ||
    (session.isExample
      ? [
          {
            id: "q1",
            question: "What happens if I cancel early?",
            advisorAnswer:
              "We explained the surrender charges and free-look period.",
            statusLabel: "Reviewed",
          },
        ]
      : []);
  const events = session.backend?.copilotEvents || [];
  return (
    <div className="session-app conversation-room">
      <main className="conversation-room-main">
        <Link href="/sessions?view=completed" className="back-link">
          <ArrowLeft size={15} />
          Completed sessions
        </Link>
        <header className="room-heading">
          <div>
            <h1>Session history</h1>
            <p>
              {session.name} · {session.policy}
              {session.isExample && (
                <span className="room-example">Sample · illustrative data</span>
              )}
            </p>
          </div>
          <button
            className="v-button secondary"
            onClick={() =>
              downloadText(
                `${session.id}-history.txt`,
                `${session.isExample ? "SAMPLE HISTORY — NOT A REAL APPLICATION" : "VERA SESSION HISTORY"}\n${session.name}\n${session.policy}\n${summary.join("\n")}\nOutcome: ${session.status}`,
              )
            }
          >
            <Download size={16} />
            Download summary
          </button>
        </header>
        <div className="history-facts">
          <div>
            <CheckCircle2 size={19} />
            <span>
              Session status<strong>Completed</strong>
            </span>
          </div>
          <div>
            <Clock3 size={19} />
            <span>
              Duration<strong>{session.duration}</strong>
            </span>
          </div>
          <div>
            <FileText size={19} />
            <span>
              Agent outcome<strong>{result?.flag || session.status}</strong>
            </span>
          </div>
          <div>
            <span>
              Completed on
              <strong>
                {session.isExample
                  ? "23 September 2026 · 14:24"
                  : result
                    ? new Date(result.submittedAt).toLocaleString()
                    : session.date}
              </strong>
            </span>
          </div>
        </div>
        <div className="room-columns">
          <section className="room-card">
            <header>
              <h2>Final conversation summary</h2>
              <span className="room-chip">Read only</span>
            </header>
            <div className="room-card-body">
              <ul className="room-summary">
                {summary.length ? (
                  summary.map((line, i) => <li key={i}>{line}</li>)
                ) : (
                  <li>No conversation summary was saved.</li>
                )}
              </ul>
              <div className="room-questions">
                <h3>QUESTIONS DISCUSSED</h3>
                {questions.length ? (
                  questions.map((q) => (
                    <div className="history-question" key={q.id}>
                      <strong>{q.question}</strong>
                      <p>{q.advisorAnswer || q.statusLabel}</p>
                    </div>
                  ))
                ) : (
                  <p>No questions were recorded.</p>
                )}
              </div>
            </div>
          </section>
          <section className="room-card">
            <header>
              <h2>Session timeline</h2>
            </header>
            <div className="room-card-body">
              <ol className="history-timeline">
                <li>
                  <strong>Session opened</strong>
                  <p>Client hand-off and recording disclosure.</p>
                </li>
                <li>
                  <strong>Conversation reviewed</strong>
                  <p>
                    {session.isExample
                      ? "Three audio batches reviewed. Cancellation question explained."
                      : `${events.length} analysis batches saved.`}
                  </p>
                </li>
                <li>
                  <strong>Final review & consent</strong>
                  <p>
                    {session.isExample
                      ? "Client reviewed the summary and completed the signature."
                      : session.backend?.signatureDataUrl
                        ? "Signature received."
                        : "Submission recorded."}
                  </p>
                </li>
                <li>
                  <strong>{session.status}</strong>
                  <p>
                    {result?.internalAuditNotes.join(" ") ||
                      (session.isExample
                        ? "Sample outcome for the history design. No real application was assessed."
                        : "See the recorded agent outcome.")}
                  </p>
                </li>
              </ol>
            </div>
          </section>
        </div>
        {!session.isExample && (
          <details className="room-transcript">
            <summary>Saved transcript</summary>
            <p className="history-transcript">
              {session.backend?.liveDialogueBuffer ||
                "No transcript was saved."}
            </p>
          </details>
        )}
        <div className="room-notice">
          <CheckCircle2 size={17} />
          This conversation has ended. Its history is available here for
          reference.
        </div>
      </main>
    </div>
  );
}
