import type { Session, Policy } from "@/types";
// Presentation-only fixtures. Never use these values as compliance evidence.
export type DemoStatus =
  | "In progress"
  | "Fast-track"
  | "Needs review"
  | "Completed"
  | "Ready to start";
export type DemoPhase = "welcome" | "conversation" | "review" | "signed";
export interface DemoSession {
  id: string;
  name: string;
  initials: string;
  policy: string;
  date: string;
  time: string;
  duration: string;
  status: DemoStatus;
  phase: DemoPhase;
  question?: string;
  conversationSummary?: string;
  presentedTopic?: number;
  isExample?: boolean;
  backend?: Session;
  policyData?: Policy;
}
export const sampleSessions: DemoSession[] = [
  {
    id: "VR-2048",
    name: "Siti Aminah",
    initials: "SA",
    policy: "RetireSafe Golden Shield",
    date: "20 Sep 2026",
    time: "09:30 AM",
    duration: "18 min",
    status: "In progress",
    phase: "conversation",
  },
  {
    id: "VR-2047",
    name: "Budi Santoso",
    initials: "BS",
    policy: "FutureCare Elite",
    date: "20 Sep 2026",
    time: "08:45 AM",
    duration: "24 min",
    status: "Fast-track",
    phase: "signed",
  },
  {
    id: "VR-2046",
    name: "Dewi Lestari",
    initials: "DL",
    policy: "WealthBuilder Horizon",
    date: "19 Sep 2026",
    time: "03:15 PM",
    duration: "32 min",
    status: "Needs review",
    phase: "signed",
  },
  {
    id: "VR-2045",
    name: "Ahmad Hidayat",
    initials: "AH",
    policy: "RetireSafe Golden Shield",
    date: "19 Sep 2026",
    time: "01:00 PM",
    duration: "21 min",
    status: "Fast-track",
    phase: "signed",
  },
  {
    id: "VR-2044",
    name: "Rina Wulandari",
    initials: "RW",
    policy: "FutureCare Elite",
    date: "19 Sep 2026",
    time: "10:30 AM",
    duration: "26 min",
    status: "Completed",
    phase: "signed",
  },
];
export const DEMO_KEY = "vera-frontend-demo-v1";
export function getDemoSessions(): DemoSession[] {
  if (typeof window === "undefined") return sampleSessions;
  try {
    const stored = JSON.parse(localStorage.getItem(DEMO_KEY) || "null");
    return Array.isArray(stored) &&
      stored.every(
        (s) => s && typeof s.id === "string" && typeof s.name === "string",
      )
      ? stored
      : sampleSessions;
  } catch {
    return sampleSessions;
  }
}
export function saveDemoSession(session: DemoSession) {
  const sessions = getDemoSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index < 0) sessions.unshift(session);
  else sessions[index] = session;
  localStorage.setItem(DEMO_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event("vera-demo-update"));
}
export function downloadText(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// A stable pair of preview URLs can be opened without creating a session first.
export const previewSession: DemoSession = {
  id: "preview",
  name: "Siti Aminah",
  initials: "SA",
  policy: "RetireSafe Golden Shield",
  date: "20 Sep 2026",
  time: "Not started",
  duration: "—",
  status: "Ready to start",
  phase: "welcome",
};

export function sessionToView(session: Session, policy?: Policy): DemoSession {
  const phase: DemoPhase =
    session.consentResult ||
    ["SUBMITTED", "CONSENT_SIGNED"].includes(session.status)
      ? "signed"
      : ["CUSTOMER_REVIEWING", "LIVENESS_CHECK"].includes(session.status)
        ? "review"
        : ["HANDED_OFF"].includes(session.status)
          ? "conversation"
          : "welcome";
  const name = session.customerName || "Client";
  return {
    id: session.id,
    name,
    initials: name
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join(""),
    policy: policy?.name || session.policyId,
    date: new Date(session.createdAt).toLocaleDateString("en-GB"),
    time: new Date(session.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    duration: `${Math.max(0, Math.round((Date.parse(session.consentResult?.submittedAt || session.updatedAt) - Date.parse(session.createdAt)) / 60000))} min`,
    phase,
    status: session.consentResult
      ? session.consentResult.fastTrackApproved
        ? "Fast-track"
        : "Needs review"
      : phase === "signed"
        ? "Completed"
        : phase === "welcome"
          ? "Ready to start"
          : "In progress",
    conversationSummary: session.conversationSummary?.join("\n"),
    question:
      session.clientQuestion ||
      session.clientQuestions?.find((q) => q.status !== "ANSWERED")?.question,
    presentedTopic:
      session.presentedTopic ??
      (policy?.clauses.findIndex(
        (c) => c.id === session.syncedHighlight?.clauseId,
      ) ?? -1) + 1,
    backend: session,
    policyData: policy,
  };
}

export const dashboardExamples: DemoSession[] = [
  {
    id: "sample-conversation",
    name: "Ibu Siti",
    initials: "IS",
    policy: "RetireSafe Golden Shield",
    date: "Sample session",
    time: "Illustrative data",
    duration: "12 min",
    status: "In progress",
    phase: "conversation",
    isExample: true,
    conversationSummary:
      "You introduced the insurance policy.\nIbu Siti asked about the cost and how to cancel.\nYou reviewed where to find costs in the policy.",
    question: "How do I cancel?",
  },
  {
    id: "sample-history",
    name: "Budi Santoso",
    initials: "BS",
    policy: "RetireSafe Golden Shield",
    date: "Sample session",
    time: "Illustrative data",
    duration: "24 min",
    status: "Fast-track",
    phase: "signed",
    isExample: true,
    conversationSummary:
      "Reviewed the premium, coverage and waiting period.\nExplained cancellation fees and the free-look period.\nThe client reviewed the summary and signed.",
    presentedTopic: 0,
  },
];
