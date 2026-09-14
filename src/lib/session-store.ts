import fs from "fs";
import path from "path";
import type { Session, SessionStatus, CopilotAnalysisResult, LivenessTelemetry, BranchingResult } from "@/types";
import { getDefaultPolicy } from "./dummy-data";

const CACHE_FILE = path.join(process.cwd(), ".sessions-cache.json");

function loadFromDisk(): Map<string, Session> {
  const map = new Map<string, Session>();
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const s of list) {
          if (s && s.id) map.set(s.id, s);
        }
      }
    }
  } catch (e) {
    // Ignore cache load failure
  }
  return map;
}

function saveToDisk(sessionsMap: Map<string, Session>) {
  try {
    const list = Array.from(sessionsMap.values());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    // Ignore cache save failure
  }
}

// Global in-memory map to preserve session state across Next.js dev server hot-reloads
const globalSessions = globalThis as unknown as {
  __VERA_SESSIONS__?: Map<string, Session>;
};

if (!globalSessions.__VERA_SESSIONS__) {
  // Prime memory with disk cache
  globalSessions.__VERA_SESSIONS__ = loadFromDisk();
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
    saveToDisk(sessions);
    return session;
  }

  static getSession(id: string): Session | undefined {
    let session = sessions.get(id);
    if (!session) {
      // Try reloading from disk cache
      const diskMap = loadFromDisk();
      session = diskMap.get(id);
      if (session) {
        sessions.set(id, session);
      }
    }
    return session;
  }

  /**
   * Guarantees a session is always returned even across dev server reloads or direct links
   */
  static getOrCreateSession(id: string, baseUrl?: string): Session {
    let session = this.getSession(id);
    if (!session) {
      const now = new Date().toISOString();
      const policy = getDefaultPolicy();
      const host = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      session = {
        id,
        agentId: "agent_andi_sg01",
        customerName: "Mdm. Tan",
        customerPhone: "+65 9123 4567",
        policyId: policy.id,
        status: "HANDED_OFF",
        customerUrl: `${host}/customer/${id}`,
        copilotEvents: [],
        createdAt: now,
        updatedAt: now,
      };
      sessions.set(id, session);
      saveToDisk(sessions);
    }
    return session;
  }

  static updateSessionStatus(id: string, status: SessionStatus): Session | undefined {
    const session = this.getSession(id);
    if (!session) return undefined;

    session.status = status;
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    saveToDisk(sessions);
    return session;
  }

  static addCopilotEvent(id: string, event: CopilotAnalysisResult): Session | undefined {
    const session = this.getSession(id);
    if (!session) return undefined;

    session.copilotEvents.push(event);
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    saveToDisk(sessions);
    return session;
  }

  static recordLivenessTelemetry(id: string, telemetry: LivenessTelemetry): Session | undefined {
    const session = this.getSession(id);
    if (!session) return undefined;

    session.livenessTelemetry = telemetry;
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    saveToDisk(sessions);
    return session;
  }

  static recordConsentSubmission(
    id: string,
    signatureDataUrl: string,
    consentResult: BranchingResult
  ): Session | undefined {
    const session = this.getSession(id);
    if (!session) return undefined;

    session.signatureDataUrl = signatureDataUrl;
    session.consentResult = consentResult;
    session.status = "CONSENT_SIGNED";
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    saveToDisk(sessions);
    return session;
  }

  static listSessions(): Session[] {
    // Merge memory and disk
    const diskMap = loadFromDisk();
    for (const [k, v] of diskMap.entries()) {
      if (!sessions.has(k)) sessions.set(k, v);
    }
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
