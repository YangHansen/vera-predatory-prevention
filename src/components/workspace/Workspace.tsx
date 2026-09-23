"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { Brand } from "./Brand";
import {
  DemoSession,
  downloadText,
  getDemoSessions,
  sampleSessions,
  saveDemoSession,
} from "@/lib/frontend-demo";
import { DUMMY_POLICIES } from "@/lib/dummy-data";

type Section = "overview" | "sessions" | "policies" | "guide";
const navigation = [
  { id: "overview", label: "Overview", href: "/", icon: LayoutDashboard },
  {
    id: "sessions",
    label: "My sessions",
    href: "/sessions",
    icon: MessageCircle,
  },
  {
    id: "policies",
    label: "Policy library",
    href: "/policies",
    icon: BookOpen,
  },
];

export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("button, input, select")?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="v-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="v-modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="v-modal-title">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Status({ value }: { value: string }) {
  return (
    <span
      className={`status status-${value.toLowerCase().replaceAll(" ", "-")}`}
    >
      <span />
      {value}
    </span>
  );
}

export function Workspace({ section }: { section: Section }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(sampleSessions);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All sessions");
  const [period, setPeriod] = useState("Last 7 days");
  const [modal, setModal] = useState<
    "new" | "notifications" | "settings" | "help" | null
  >(null);
  const [menu, setMenu] = useState(false);
  const [name, setName] = useState("");
  const [policy, setPolicy] = useState("RetireSafe Golden Shield");
  const [formError, setFormError] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
  useEffect(() => {
    const update = () => setSessions(getDemoSessions());
    update();
    if (new URLSearchParams(window.location.search).get("status") === "review")
      setFilter("Needs review");
    window.addEventListener("storage", update);
    window.addEventListener("vera-demo-update", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("vera-demo-update", update);
    };
  }, []);
  const filtered = sessions.filter(
    (s) =>
      `${s.name} ${s.id} ${s.policy}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All sessions" || s.status === filter) &&
      (period !== "Today" || s.date === "20 Sep 2026"),
  );
  const reviewCount = sessions.filter(
    (s) => s.status === "Needs review",
  ).length;
  const active = sessions.find(
    (s) => s.phase === "conversation" || s.phase === "review",
  );
  function createSession(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Add a client name to continue.");
      return;
    }
    const session: DemoSession = {
      id: `VR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      name: name.trim(),
      initials: name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      policy,
      date: "20 Sep 2026",
      time: "Just now",
      duration: "—",
      status: "Ready to start",
      phase: "welcome",
    };
    try {
      saveDemoSession(session);
      router.push(`/agent/${session.id}/invite`);
    } catch {
      setFormError(
        "Browser storage is unavailable. Enable local storage to create a demo session.",
      );
    }
  }
  function exportSessions() {
    const quote = (v: string) => `"${v.replaceAll('"', '""')}"`;
    downloadText(
      "vera-demo-sessions.csv",
      [
        "Demo data — not compliance records",
        "Session,Client,Policy,Date,Status",
        ...filtered.map((s) =>
          [s.id, s.name, s.policy, s.date, s.status].map(quote).join(","),
        ),
      ].join("\n"),
    );
  }
  return (
    <div className="vera-app">
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`v-sidebar ${menu ? "open" : ""}`}>
        <Link href="/" className="brand-link">
          <Brand />
        </Link>
        <div className="workspace-selector">
          <span className="workspace-icon">
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>Vera Workspace</strong>
            <span>Agent portal</span>
          </div>
          <LockKeyhole size={13} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${section === item.id ? "active" : ""}`}
              aria-current={section === item.id ? "page" : undefined}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
              {item.id === "sessions" && (
                <span className="nav-count">{sessions.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/guide"
            className={`nav-item ${section === "guide" ? "active" : ""}`}
          >
            <CircleHelp size={19} strokeWidth={1.7} />
            Help & resources
          </Link>
          <button className="nav-item" onClick={() => setModal("settings")}>
            <Settings2 size={19} strokeWidth={1.7} />
            Preferences
          </button>
          <div className="agent-profile">
            <span className="avatar agent-avatar">AW</span>
            <div>
              <strong>Andi Wijaya</strong>
              <span>Insurance advisor</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="v-main">
        <header className="v-topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {section === "overview"
                ? "Overview"
                : section === "sessions"
                  ? "My sessions"
                  : section === "policies"
                    ? "Policy library"
                    : "Help & resources"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-label">
              <span />
              Demo workspace
            </span>
            <button
              className="notification-button icon-button"
              onClick={() => setModal("notifications")}
              aria-label="Notifications"
            >
              <Bell size={19} />
              {notify && <i />}
            </button>
            <span className="avatar top-avatar">AW</span>
          </div>
        </header>
        <main className="v-content">
          <div className="page-heading">
            <div>
              <div className="workspace-date">Sunday, 20 September 2026</div>
              <h1>
                {section === "overview"
                  ? "Session overview"
                  : section === "sessions"
                    ? "My sessions"
                    : section === "policies"
                      ? "Policy library"
                      : "Agent guide"}
              </h1>
              <p>
                {section === "overview"
                  ? "Manage client conversations and follow up on pending reviews."
                  : section === "sessions"
                    ? "Search, review, and continue your client sessions."
                    : section === "policies"
                      ? "Coverage, costs, exclusions, and cancellation terms."
                      : "Recording, client verification, and informed consent."}
              </p>
            </div>
            <button
              className="v-button primary"
              onClick={() => setModal("new")}
            >
              <Plus size={18} />
              New session
            </button>
          </div>
          {section === "overview" && (
            <>
              <section className="stats-grid" aria-label="Session statistics">
                <Stat
                  icon={<MessageCircle size={19} />}
                  label="Total sessions"
                  value={String(sessions.length)}
                  note="Demo workspace"
                  detail="This week"
                />
                <Stat
                  icon={<FileCheck2 size={19} />}
                  label="Fast-track ready"
                  value={String(
                    sessions.filter((s) => s.status === "Fast-track").length,
                  ).padStart(2, "0")}
                  note="Ready for next steps"
                  color="green"
                  detail="Ready to proceed"
                />
                <Stat
                  icon={<Clock3 size={19} />}
                  label="Needs review"
                  value={String(reviewCount).padStart(2, "0")}
                  note="Follow-up required"
                  color="amber"
                  detail="Awaiting review"
                />
                <Stat
                  icon={<Users size={19} />}
                  label="Active sessions"
                  value={String(
                    sessions.filter((s) => s.status === "In progress").length,
                  ).padStart(2, "0")}
                  note="Conversations in progress"
                  detail="In conversation"
                />
              </section>
              {active && (
                <section className="active-session">
                  <div className="active-session-icon">
                    <span />
                    <MessageCircle size={21} />
                  </div>
                  <div className="active-session-info">
                    <strong>
                      Your conversation with {active.name.split(" ")[0]} is in
                      progress
                    </strong>
                    <p>
                      {active.policy}
                      <span>•</span>Started at {active.time.toLowerCase()}
                    </p>
                  </div>
                  <Link
                    className="v-button subtle"
                    href={`/session/${active.id}`}
                  >
                    Continue session <ArrowRight size={16} />
                  </Link>
                </section>
              )}
            </>
          )}
          {(section === "overview" || section === "sessions") && (
            <section className="session-section">
              <div className="section-heading">
                <div>
                  <h2>
                    {section === "overview" ? "Recent sessions" : "My sessions"}
                    <span className="count-badge">{sessions.length}</span>
                  </h2>
                </div>
                <button
                  className="v-button secondary small"
                  onClick={exportSessions}
                >
                  <ArrowDownToLine size={15} />
                  Export
                </button>
              </div>
              <div className="table-card">
                <div className="table-toolbar">
                  <div
                    className="session-tabs"
                    role="group"
                    aria-label="Filter sessions"
                  >
                    {[
                      "All sessions",
                      "In progress",
                      "Needs review",
                      "Completed",
                    ].map((tab) => (
                      <button
                        key={tab}
                        className={filter === tab ? "selected" : ""}
                        onClick={() => setFilter(tab)}
                      >
                        {tab}
                        {tab === "Needs review" && <span>{reviewCount}</span>}
                      </button>
                    ))}
                  </div>
                  <label className="date-select">
                    <CalendarDays size={15} />
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      aria-label="Date range"
                    >
                      <option>Last 7 days</option>
                      <option>Today</option>
                      <option>All time</option>
                    </select>
                    <ChevronDown size={13} />
                  </label>
                </div>
                <div className="table-search-row">
                  <label className="search-input">
                    <Search size={17} />
                    <input
                      placeholder="Search by client, policy, or session ID..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Search sessions"
                    />
                    {query && (
                      <button
                        className="icon-button"
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <label className="filter-select">
                    <SlidersHorizontal size={15} />
                    <select
                      aria-label="Session status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {[
                        "All sessions",
                        "Ready to start",
                        "In progress",
                        "Fast-track",
                        "Needs review",
                        "Completed",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="table-scroll">
                  <table className="session-table">
                    <thead>
                      <tr>
                        <th>CLIENT</th>
                        <th>POLICY</th>
                        <th>DATE & TIME</th>
                        <th>DURATION</th>
                        <th>STATUS</th>
                        <th>
                          <span className="sr-only">Open session</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s, index) => (
                        <tr key={s.id}>
                          <td>
                            <Link
                              href={`/session/${s.id}`}
                              className="client-cell"
                            >
                              <span
                                className={`avatar client-avatar avatar-${index % 4}`}
                              >
                                {s.initials}
                              </span>
                              <div>
                                <strong>{s.name}</strong>
                                <span>{s.id}</span>
                              </div>
                            </Link>
                          </td>
                          <td>{s.policy}</td>
                          <td>
                            <div className="table-date">
                              {s.date}
                              <span>{s.time}</span>
                            </div>
                          </td>
                          <td className="duration-cell">{s.duration}</td>
                          <td>
                            <Status value={s.status} />
                          </td>
                          <td>
                            <Link
                              href={`/session/${s.id}`}
                              className="row-arrow"
                              aria-label={`Open ${s.name} session`}
                            >
                              <ArrowUpRight size={18} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div className="empty-state">
                      <Search size={28} />
                      <h3>No sessions found</h3>
                      <p>Try another client name or change your filters.</p>
                      <button
                        className="v-button secondary"
                        onClick={() => {
                          setQuery("");
                          setFilter("All sessions");
                          setPeriod("All time");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    Showing {filtered.length ? 1 : 0}–{filtered.length} of{" "}
                    {filtered.length} sessions
                  </span>
                  {section === "overview" ? (
                    <Link href="/sessions">
                      View all sessions <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <span className="pagination">
                      <ChevronLeft size={15} />
                      <span>1</span>
                      <ChevronRight size={15} />
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}
          {section === "policies" && (
            <>
              <label className="search-input library-search">
                <Search size={18} />
                <input
                  aria-label="Search policy library"
                  placeholder="Find a policy..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="policy-grid">
                {DUMMY_POLICIES.filter((p) =>
                  p.name.toLowerCase().includes(query.toLowerCase()),
                ).map((p) => (
                  <article className="policy-card" key={p.id}>
                    <div className="policy-icon">
                      <ShieldCheck size={25} />
                    </div>
                    <span className="eyebrow">
                      {p.type.replaceAll("_", " ")}
                    </span>
                    <h2>{p.name.split(" (")[0]}</h2>
                    <p>{p.tagline}</p>
                    <div className="policy-price">
                      S${p.premiumAmount}
                      <span>
                        {" "}
                        / {p.premiumFrequency === "monthly" ? "month" : "year"}
                      </span>
                    </div>
                    <button
                      className="v-button secondary"
                      onClick={() => setSelectedPolicy(p.id)}
                    >
                      View policy details <ArrowRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
              {!DUMMY_POLICIES.some((p) =>
                p.name.toLowerCase().includes(query.toLowerCase()),
              ) && (
                <div className="empty-state">
                  No matching policies. Try another name.
                </div>
              )}
              <p className="fixture-note">
                Illustrative policies for this prototype. Amounts are in
                Singapore dollars.
              </p>
            </>
          )}
          {section === "guide" && (
            <div className="guide-layout">
              <section className="guide-card">
                <span className="eyebrow">SESSION WORKFLOW</span>
                <h2>
                  From introduction
                  <br />
                  to informed consent.
                </h2>
                <p>
                  Your role is to guide, explain, and give each client the time
                  they need.
                </p>
                {[
                  {
                    title: "Start with transparency",
                    text: "Invite your client at the start. Explain the audio recording and the brief, on-device face check before they begin.",
                  },
                  {
                    title: "Focus on the conversation",
                    text: "The client’s camera stays off. Transcription continues, while agent feedback is designed to arrive once per minute.",
                  },
                  {
                    title: "Make time for a clear review",
                    text: "Let the client read the summary at their own pace. Camera-based understanding checks happen only during this review.",
                  },
                  {
                    title: "Confirm, then follow through",
                    text: "A final identity and gesture check accompanies consent. Review flags are private to you; explain next steps personally.",
                  },
                ].map((s, i) => (
                  <div className="guide-step" key={s.title}>
                    <span>{i + 1}</span>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </div>
                  </div>
                ))}
              </section>
              <aside className="guide-aside">
                <LifeBuoy size={27} />
                <h3>Test the client flow</h3>
                <p>
                  This workspace uses sample data. Start a session to walk
                  through the revised client experience.
                </p>
                <button
                  className="v-button primary"
                  onClick={() => setModal("new")}
                >
                  Try a new session <ArrowRight size={16} />
                </button>
                <hr />
                <h3>Frontend preview</h3>
                <p>
                  Camera checks, transcription, and consent submission are
                  simulated. Backend integration is the next development step.
                </p>
                <Link href="/copilot">
                  Open existing integration playground{" "}
                  <ArrowUpRight size={15} />
                </Link>
              </aside>
            </div>
          )}
          <footer className="v-footer">
            <span>Vera · Agent workspace</span>
            <span>
              <LockKeyhole size={12} />
              Demo environment
            </span>
          </footer>
        </main>
      </div>
      {modal === "new" && (
        <Modal title="New session" close={() => setModal(null)}>
          <p className="modal-description">
            Choose a client and policy to create a session.
          </p>
          <form onSubmit={createSession}>
            <label className="form-field">
              Client name
              <input
                autoComplete="off"
                placeholder="e.g. Siti Aminah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={70}
                required
              />
            </label>
            <label className="form-field">
              Policy to discuss
              <select
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
              >
                {DUMMY_POLICIES.map((p) => (
                  <option key={p.id}>{p.name.split(" (")[0]}</option>
                ))}
              </select>
            </label>
            <div className="info-box">
              <ShieldCheck size={20} />
              <p>
                You’ll invite your client and explain recording before the
                conversation begins. Use a sample name in this demo.
              </p>
            </div>
            {formError && (
              <p role="alert" className="form-error">
                {formError}
              </p>
            )}
            <button className="v-button primary full" type="submit">
              Create demo session <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal title="Your updates" close={() => setModal(null)}>
          <div className="notification-item">
            <span className="policy-icon">
              <Clock3 size={20} />
            </span>
            <div>
              <h3>
                {reviewCount} session{reviewCount !== 1 ? "s" : ""} needs a
                closer look
              </h3>
              <p>
                Review the session notes before discussing next steps with your
                client.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  setFilter("Needs review");
                  setModal(null);
                  router.push("/sessions?status=review");
                }}
              >
                View sessions <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <button
            className="v-button secondary full"
            onClick={() => {
              setNotify(false);
              setModal(null);
            }}
          >
            <CheckCheck size={16} />
            Mark as read
          </button>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="Workspace preferences" close={() => setModal(null)}>
          <p className="modal-description">
            This preview is configured for an existing agent account.
          </p>
          <div className="preference-row">
            <span>Workspace language</span>
            <strong>English</strong>
          </div>
          <div className="preference-row">
            <span>Policy currency</span>
            <strong>SGD</strong>
          </div>
          <div className="preference-row">
            <span>Data source</span>
            <span className="demo-label">Demo data</span>
          </div>
          <p className="fixture-note">
            Demo sessions are stored in this browser. No audio or camera data is
            collected by the new frontend.
          </p>
          <button
            className="v-button secondary full"
            onClick={() => {
              localStorage.removeItem("vera-frontend-demo-v1");
              setSessions(sampleSessions);
              setModal(null);
            }}
          >
            Reset demo workspace
          </button>
        </Modal>
      )}
      {selectedPolicy && (
        <Modal title="Policy at a glance" close={() => setSelectedPolicy(null)}>
          {DUMMY_POLICIES.filter((p) => p.id === selectedPolicy).map((p) => (
            <div key={p.id}>
              <span className="eyebrow">ILLUSTRATIVE POLICY · {p.code}</span>
              <h3 className="policy-modal-name">{p.name}</h3>
              <p className="modal-description">{p.provider}</p>
              <div className="policy-facts">
                <span>
                  Premium
                  <strong>
                    S${p.premiumAmount} /{" "}
                    {p.premiumFrequency === "monthly" ? "month" : "year"}
                  </strong>
                </span>
                <span>
                  Coverage
                  <strong>S${p.coverageAmount.toLocaleString("en-US")}</strong>
                </span>
              </div>
              <ul className="summary-list">
                {p.simplifiedSummary.map((s) => (
                  <li key={s}>
                    <Check size={17} />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <button
                className="v-button primary full"
                onClick={() => {
                  setPolicy(p.name.split(" (")[0]);
                  setSelectedPolicy(null);
                  setModal("new");
                }}
              >
                Start a session with this policy <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  note,
  detail,
  color = "",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  detail: string;
  color?: string;
}) {
  return (
    <article className={`stat-card ${color}`}>
      <div className="stat-label">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">
        {value}
        <span>
          <span />
          {detail}
        </span>
      </div>
      <p>{note}</p>
    </article>
  );
}

