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
      agentId: params.agentId || "agt_andi_01",
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
        agentId: "agt_andi_01",
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

  static updateSession(id: string, updates: Partial<Session>): Session | undefined {
    let session = this.getSession(id);
    if (!session) {
      session = this.getOrCreateSession(id);
    }

    Object.assign(session, updates, { updatedAt: new Date().toISOString() });
    sessions.set(id, session);
    saveToDisk(sessions);
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
    let session = this.getSession(id);
    if (!session) {
      session = this.getOrCreateSession(id);
    }

    session.copilotEvents.push(event);

    if (event.conversationSummary && event.conversationSummary.length > 0) {
      session.conversationSummary = event.conversationSummary;
    }

    if (event.clientQuestions && event.clientQuestions.length > 0) {
      const existing = session.clientQuestions || [];
      const map = new Map<string, any>();
      existing.forEach((q) => map.set(q.question.toLowerCase().trim(), q));
      event.clientQuestions.forEach((q) => {
        const key = q.question.toLowerCase().trim();
        const prev = map.get(key);
        map.set(key, { ...(prev || {}), ...q });
      });
      session.clientQuestions = Array.from(map.values()).map((q, idx) => ({
        ...q,
        id: q.id ? `${q.id.replace(/_\d+$/, "")}_${idx}` : `q_${Date.now()}_${idx}`,
      }));
    }

    if (event.coveredSectionIds && event.coveredSectionIds.length > 0) {
      const current = new Set(session.explainedSections || []);
      event.coveredSectionIds.forEach((sid) => current.add(sid));
      session.explainedSections = Array.from(current);
    }

    session.lastAiAnalysisTimestamp = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    saveToDisk(sessions);
    return session;
  }

  static updateSyncedHighlight(
    id: string,
    highlight: {
      topic: "WAITING_PERIOD" | "SURRENDER_PENALTY" | "GUARANTEED_RETURN" | "DUTY_OF_DISCLOSURE" | "COVERAGE" | "GENERAL";
      clauseId?: string;
      matchedText?: string;
      advisorNote?: string;
    }
  ): Session | undefined {
    let session = this.getSession(id);
    if (!session) {
      session = this.getOrCreateSession(id);
    }

    session.syncedHighlight = {
      ...highlight,
      highlightTimestamp: new Date().toISOString(),
    };
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    saveToDisk(sessions);
    return session;
  }

  static updateLiveDialogueBuffer(id: string, text: string): Session | undefined {
    let session = this.getSession(id);
    if (!session) {
      session = this.getOrCreateSession(id);
    }

    session.liveDialogueBuffer = text;

    // Real-time keyword detection for instantaneous section checkmarks
    const lower = text.toLowerCase();
    const currentSections = new Set<number>(session.explainedSections || []);

    if (/(cover|benefit|death|illness|critical|disability|tpd|assured|payout|protection|hospital|claim|event|survive|annuity|retire|250,000)/i.test(lower)) {
      currentSections.add(1);
    }
    if (/(premium|pay|payment|cost|month|annual|dollar|\$|sgd|fee|charge|grace period|instalment|installment|deduct|pricing|rate|450)/i.test(lower)) {
      currentSections.add(2);
    }
    if (/(start|inception|commence|waiting period|effective|day 1|day one|begin|condition|exclusion|pre-existing|clause|medical|underwriting)/i.test(lower)) {
      currentSections.add(3);
    }
    if (/(cancel|free look|free-look|14 day|fourteen day|surrender|refund|terminate|penalty|cool off|cooling off|exit|cash out|36 month)/i.test(lower)) {
      currentSections.add(4);
    }

    if (currentSections.size > 0) {
      session.explainedSections = Array.from(currentSections);
    }

    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    saveToDisk(sessions);
    return session;
  }

  static recordLivenessTelemetry(id: string, telemetry: LivenessTelemetry): Session | undefined {
    let session = this.getSession(id);
    if (!session) {
      session = this.getOrCreateSession(id);
    }

    session.livenessTelemetry = telemetry;
    if (telemetry.confusionEvents && telemetry.confusionEvents.length > 0) {
      session.confusionEvents = telemetry.confusionEvents;
    }
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

  static listSessions(agentId?: string): Session[] {
    // Merge memory and disk
    const diskMap = loadFromDisk();
    for (const [k, v] of diskMap.entries()) {
      if (!sessions.has(k)) sessions.set(k, v);
    }
    const list = Array.from(sessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (agentId) {
      const normalizedQuery = agentId === "agent_andi_sg01" ? "agt_andi_01" : agentId;
      return list.filter((s) => {
        const sAgent = s.agentId === "agent_andi_sg01" ? "agt_andi_01" : s.agentId;
        return sAgent === normalizedQuery;
      });
    }
    return list;
  }
}
