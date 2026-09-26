"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  LoaderCircle,
  Monitor,
  QrCode,
  RotateCcw,
} from "lucide-react";
import { Brand } from "./Brand";
import { useDemoSession } from "./useDemoSession";

export function AgentInvitation({ id }: { id: string }) {
  const { session, ready, update, error, live } = useDemoSession(id);
  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [disclosed, setDisclosed] = useState(false);
  useEffect(() => {
    let active = true;
    const url = `${window.location.origin}/client/${encodeURIComponent(id)}`;
    setLink(url);
    QRCode.toDataURL(url, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#172b4d", light: "#ffffff" },
    })
      .then((value) => {
        if (active) setQr(value);
      })
      .catch(() => {
        if (active) setQrError(true);
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (!ready)
    return <div className="session-app loading-state">Loading invitation…</div>;
  if (!session)
    return (
      <div className="session-app missing-session">
        <h1>Session not found</h1>
        <Link href="/" className="v-button primary">
          Back to workspace
        </Link>
      </div>
    );
  const joined = session.phase !== "welcome";
  const advisorInitials = session.advisor?.fullName
    ? session.advisor.fullName
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AG";

  return (
    <div className="session-app invitation-app">
      <header className="invite-topbar">
        <Link href="/" aria-label="Vera workspace">
          <Brand small />
        </Link>
        <span className="invite-role">Agent workspace</span>
        <span className="invite-demo">
          {live ? "Connected session" : "Frontend preview"}
        </span>
        <span className="avatar agent-avatar">{advisorInitials}</span>
      </header>
      <main className="invite-main">
        <Link href="/sessions" className="back-link">
          <ArrowLeft size={16} />
          All sessions
        </Link>
        <div className="invite-heading">
          <div>
            <p className="invite-step">STEP 1 OF 3 · CLIENT HANDOFF</p>
            <h1>Invite your client</h1>
            <p>Open their session before you start the conversation.</p>
          </div>
          <span className="invite-reference">
            {id === "preview" ? "VR-DEMO" : id}
          </span>
        </div>
        <div className="invite-layout">
          <section className="invite-instructions" aria-label="Session setup">
            <div className="invite-client">
              <span className="avatar">{session.initials}</span>
              <div>
                <h2>{session.name}</h2>
                <p>{session.policy}</p>
              </div>
            </div>
            <h2>Before they join</h2>
            <ol className="invite-steps">
              <li>
                <span>1</span>
                <div>
                  <h3>Explain what will be recorded</h3>
                  <p>
                    Audio will be recorded. The camera is used for the opening
                    check and final review, and stays off during the
                    conversation.
                  </p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <h3>Ask them to scan the code</h3>
                  <p>
                    They can open their phone’s camera and tap the link. There’s
                    no app to install or account to create.
                  </p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <h3>Let them read and choose</h3>
                  <p>
                    The client reviews the privacy notice and completes a brief
                    identity check. Wait until they are ready.
                  </p>
                </div>
              </li>
            </ol>
            <label className="invite-disclosure">
              <input
                type="checkbox"
                checked={disclosed}
                onChange={(e) => setDisclosed(e.target.checked)}
              />
              <span>I have explained the audio recording and camera use.</span>
            </label>
            <details className="invite-script">
              <summary>Suggested explanation</summary>
              <p>
                “We’ll record our conversation to prepare your summary. There’s
                a brief face check now and again at the end. Your camera is off
                while we talk. Face snapshots are sent to our server and Google
                Gemini for identity comparison. You can ask questions or stop at
                any time.”
              </p>
            </details>
            {session.question && (
              <div className="invite-client-question" role="status">
                <h3>Client question</h3>
                <p>{session.question}</p>
                <button
                  className="text-button"
                  onClick={() => update({ question: undefined })}
                >
                  Mark as discussed <Check size={15} />
                </button>
              </div>
            )}
          </section>
          <section className="invite-qr-panel" aria-labelledby="qr-title">
            <div className="qr-panel-title">
              <QrCode size={20} />
              <h2 id="qr-title">Scan to join your session</h2>
            </div>
            <p>Use your phone’s camera to open the link.</p>
            <div className="qr-display">
              {qr ? (
                <img
                  src={qr}
                  alt="QR code for the client session"
                  width={288}
                  height={288}
                />
              ) : qrError ? (
                <p role="alert">QR unavailable. Use the link below.</p>
              ) : (
                <span role="status">Preparing QR code…</span>
              )}
            </div>
            <div
              className={`invite-connection ${joined ? "joined" : ""}`}
              role="status"
            >
              {joined ? (
                <Check size={18} />
              ) : (
                <span className="connection-dot" />
              )}
              <div>
                <strong>
                  {joined
                    ? "Client joined the session"
                    : "Waiting for your client"}
                </strong>
                <p>
                  {joined
                    ? "Their welcome steps are complete."
                    : "This updates when they complete the welcome steps."}
                </p>
              </div>
            </div>
            <div className="invite-link-row">
              <label htmlFor="invite-link">Or use the session link</label>
              <div>
                <input
                  id="invite-link"
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  aria-label="Copy client session link"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                      setCopyError("");
                    } catch {
                      setCopyError("Select the link and copy it manually.");
                    }
                  }}
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              {copyError && <p role="alert">{copyError}</p>}
            </div>
            <Link
              className="invite-preview-link"
              href={`/client/${id}`}
              target="_blank"
            >
              Open client view on this computer <ArrowUpRight size={16} />
            </Link>
          </section>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="invite-action-bar">
          <div>
            <strong>
              {joined
                ? "Client welcome complete"
                : "Enter conversation room"}
            </strong>
            <p>
              {joined
                ? "Continue to the live conversation workspace."
                : "You can enter the consultation room now while waiting for your client to connect."}
            </p>
          </div>
          <Link
            className="v-button primary"
            href={`/session/${id}`}
            onClick={() => {
              void update({ phase: "conversation" });
            }}
          >
            {joined ? "Continue to conversation" : "Enter conversation"} <ArrowRight size={17} />
          </Link>
        </div>
        <div className="invite-preview-note">
          <Monitor size={16} />
          <p>
            {live
              ? "Session state is shared through the server. For a phone camera, open the app on a reachable HTTPS address; localhost links work only on this computer."
              : "This is a local demo. Create a session to use the connected backend."}
            {!live && (
              <Link className="text-button" href="/sessions">
                Create a connected session <ArrowUpRight size={15} />
              </Link>
            )}
          </p>
          {id === "preview" && (
            <button
              onClick={async () => {
                if (
                  await update({
                    phase: "welcome",
                    status: "Ready to start",
                    question: undefined,
                    conversationSummary: undefined,
                    presentedTopic: undefined,
                  })
                )
                  setDisclosed(false);
              }}
            >
              <RotateCcw size={14} />
              Reset demo
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
