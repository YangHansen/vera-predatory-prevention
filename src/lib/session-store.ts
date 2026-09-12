import type { Session, SessionStatus, CopilotAnalysisResult, LivenessTelemetry, BranchingResult } from "@/types";
import { getDefaultPolicy } from "./dummy-data";

// Global in-memory map to preserve session state in Next.js development/runtime
const globalSessions = globalThis as unknown as {
  __VERA_SESSIONS__?: Map<string, Session>;
};

if (!globalSessions.__VERA_SESSIONS__) {
  globalSessions.__VERA_SESSIONS__ = new Map<string, Session>();
}

const sessions = globalSessions.__VERA_SESSIONS__;

export class SessionStore {
  static createSession(params: {
    agentId: string;
    customerName?: string;
    customerPhone?: string;
    policyId?: string;
    baseUrl?: string;
  }): Session {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const policy = getDefaultPolicy();

    const baseUrl = params.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const customerUrl = `${baseUrl}/customer/${id}`;

    const session: Session = {
      id,
      agentId: params.agentId || "agent_andi_sg01",
      customerName: params.customerName || "Mdm. Tan",
      customerPhone: params.customerPhone || "+65 9123 4567",
      policyId: params.policyId || policy.id,
      status: "AGENT_ACTIVE",
      customerUrl,
      copilotEvents: [],
      createdAt: now,
      updatedAt: now,
    };

    sessions.set(id, session);
    return session;
  }

  static getSession(id: string): Session | undefined {
    return sessions.get(id);
  }

  static updateSessionStatus(id: string, status: SessionStatus): Session | undefined {
    const session = sessions.get(id);
    if (!session) return undefined;

    session.status = status;
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    return session;
  }

  static addCopilotEvent(id: string, event: CopilotAnalysisResult): Session | undefined {
    const session = sessions.get(id);
    if (!session) return undefined;

    session.copilotEvents.push(event);
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    return session;
  }

  static recordLivenessTelemetry(id: string, telemetry: LivenessTelemetry): Session | undefined {
    const session = sessions.get(id);
    if (!session) return undefined;

    session.livenessTelemetry = telemetry;
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    return session;
  }

  static recordConsentSubmission(
    id: string,
    signatureDataUrl: string,
    consentResult: BranchingResult
  ): Session | undefined {
    const session = sessions.get(id);
    if (!session) return undefined;

    session.signatureDataUrl = signatureDataUrl;
    session.consentResult = consentResult;
    session.status = "CONSENT_SIGNED";
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    return session;
  }

  static listSessions(): Session[] {
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
