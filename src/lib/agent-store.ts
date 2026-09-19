import fs from "fs";
import path from "path";
import type { AgentAccount } from "@/types";

const AGENTS_CACHE_FILE = path.join(process.cwd(), ".agents-cache.json");

const SEED_AGENTS: AgentAccount[] = [
  {
    id: "agt_andi_01",
    repNumber: "MAS-REP-882910",
    fullName: "Andi Wijaya, ChFC",
    email: "andi.wijaya@verainsure.sg",
    phone: "+65 9876 5432",
    agencyFirm: "Vera Financial Advisory Pte Ltd",
    role: "SENIOR_ADVISOR",
    status: "ACTIVE",
    complianceRating: 98.6,
    totalSessions: 42,
    createdAt: "2026-01-15T08:30:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
  },
  {
    id: "agt_sarah_02",
    repNumber: "MAS-REP-774102",
    fullName: "Sarah Lim, CFP",
    email: "sarah.lim@verainsure.sg",
    phone: "+65 9123 7890",
    agencyFirm: "Vera Premier Wealth Advisory",
    role: "WEALTH_PLANNER",
    status: "ACTIVE",
    complianceRating: 99.2,
    totalSessions: 68,
    createdAt: "2026-02-01T09:00:00.000Z",
    updatedAt: "2026-09-16T11:20:00.000Z",
  },
  {
    id: "agt_marcus_03",
    repNumber: "MAS-REP-553198",
    fullName: "Marcus Chen",
    email: "marcus.chen@verainsure.sg",
    phone: "+65 8234 5678",
    agencyFirm: "Vera Direct Assurance Singapore",
    role: "FINANCIAL_CONSULTANT",
    status: "ACTIVE",
    complianceRating: 96.4,
    totalSessions: 29,
    createdAt: "2026-03-10T10:15:00.000Z",
    updatedAt: "2026-09-14T14:45:00.000Z",
  },
];

function loadFromDisk(): Map<string, AgentAccount> {
  const map = new Map<string, AgentAccount>();
  try {
    if (fs.existsSync(AGENTS_CACHE_FILE)) {
      const raw = fs.readFileSync(AGENTS_CACHE_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const a of list) {
          if (a && a.id) map.set(a.id, a);
        }
      }
    }
  } catch (e) {
    // Ignore cache load failure
  }

  // Ensure seed agents exist
  for (const seed of SEED_AGENTS) {
    if (!map.has(seed.id)) {
      map.set(seed.id, seed);
    }
  }
  return map;
}

function saveToDisk(agentsMap: Map<string, AgentAccount>) {
  try {
    const list = Array.from(agentsMap.values());
    fs.writeFileSync(AGENTS_CACHE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    // Ignore cache save failure
  }
}

// Global in-memory map across Next.js dev server reloads
const globalAgents = globalThis as unknown as {
  __VERA_AGENTS__?: Map<string, AgentAccount>;
};

if (!globalAgents.__VERA_AGENTS__) {
  globalAgents.__VERA_AGENTS__ = loadFromDisk();
}

const agents = globalAgents.__VERA_AGENTS__;

export class AgentStore {
  /**
   * Create a new Agent Account strictly on the backend (Internal Provisioning).
   * No public self-signup is permitted under MAS Market Conduct Guidelines.
   */
  static createAgent(params: {
    fullName: string;
    repNumber: string;
    email: string;
    phone?: string;
    agencyFirm?: string;
    role?: AgentAccount["role"];
  }): { success: boolean; agent?: AgentAccount; error?: string } {
    const fullName = params.fullName.trim();
    const repNumber = params.repNumber.trim().toUpperCase();
    const email = params.email.trim().toLowerCase();

    // Validation
    if (!fullName || fullName.length < 3) {
      return { success: false, error: "Advisor full name must be at least 3 characters." };
    }

    if (!repNumber || !/^MAS-REP-\d{5,8}$/i.test(repNumber)) {
      return {
        success: false,
        error: "Invalid MAS Representative Number format. Must match MAS-REP-XXXXXX (e.g., MAS-REP-882910).",
      };
    }

    if (!email || !email.includes("@") || !email.includes(".")) {
      return { success: false, error: "A valid corporate email address is required." };
    }

    // Check for duplicate Rep Number or Email
    const existing = Array.from(agents.values());
    if (existing.some((a) => a.repNumber === repNumber)) {
      return { success: false, error: `An advisor with MAS Rep Number '${repNumber}' already exists.` };
    }
    if (existing.some((a) => a.email.toLowerCase() === email)) {
      return { success: false, error: `An advisor with email '${email}' already exists.` };
    }

    const id = `agt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newAgent: AgentAccount = {
      id,
      repNumber,
      fullName,
      email,
      phone: params.phone?.trim() || "+65 9123 4567",
      agencyFirm: params.agencyFirm?.trim() || "Vera Financial Advisory Pte Ltd",
      role: params.role || "FINANCIAL_CONSULTANT",
      status: "ACTIVE",
      complianceRating: 100.0,
      totalSessions: 0,
      createdAt: now,
      updatedAt: now,
    };

    agents.set(id, newAgent);
    saveToDisk(agents);

    return { success: true, agent: newAgent };
  }

  static getAgent(id: string): AgentAccount | undefined {
    let agent = agents.get(id);
    if (!agent) {
      const diskMap = loadFromDisk();
      agent = diskMap.get(id);
      if (agent) agents.set(id, agent);
    }
    return agent;
  }

  static getAgentByRepNumber(repNumber: string): AgentAccount | undefined {
    const list = this.listAgents();
    return list.find((a) => a.repNumber.toUpperCase() === repNumber.trim().toUpperCase());
  }

  static listAgents(): AgentAccount[] {
    const diskMap = loadFromDisk();
    for (const [k, v] of diskMap.entries()) {
      if (!agents.has(k)) agents.set(k, v);
    }
    return Array.from(agents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static updateAgent(
    id: string,
    updates: Partial<Omit<AgentAccount, "id" | "createdAt">>
  ): AgentAccount | undefined {
    const agent = this.getAgent(id);
    if (!agent) return undefined;

    Object.assign(agent, updates, { updatedAt: new Date().toISOString() });
    agents.set(id, agent);
    saveToDisk(agents);
    return agent;
  }

  static recordSessionMetric(id: string, isCompliant: boolean): void {
    const agent = this.getAgent(id);
    if (!agent) return;

    const newTotal = (agent.totalSessions || 0) + 1;
    const currentScore = agent.complianceRating || 100;
    const newRating = isCompliant
      ? Math.min(100, (currentScore * (newTotal - 1) + 100) / newTotal)
      : Math.max(70, (currentScore * (newTotal - 1) + 80) / newTotal);

    this.updateAgent(id, {
      totalSessions: newTotal,
      complianceRating: Math.round(newRating * 10) / 10,
    });
  }

  static getDefaultAgent(): AgentAccount {
    return SEED_AGENTS[0];
  }
}
