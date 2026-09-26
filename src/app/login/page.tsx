"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/workspace/Brand";
import { ShieldCheck, UserCheck, ArrowRight, Lock, AlertCircle, Info } from "lucide-react";
import type { AgentAccount } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [manualRep, setManualRep] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.agents)) {
          setAgents(data.agents);
          if (data.agents.length > 0) {
            setSelectedAgentId(data.agents[0].id);
          }
        }
      })
      .catch(() => {
        setError("Could not load authorized advisor roster.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function handleLogin(agentId: string) {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      setError("Please select a valid authorized advisor.");
      return;
    }

    setSigningIn(true);
    localStorage.setItem("vera_active_agent_id", agent.id);
    localStorage.setItem("vera_active_agent_name", agent.fullName);
    localStorage.setItem("vera_active_agent_rep", agent.repNumber);
    document.cookie = `vera_agent_id=${encodeURIComponent(agent.id)}; path=/; max-age=2592000; SameSite=Lax`;

    router.push("/");
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualRep.trim()) {
      setError("Please enter your MAS Representative Number or email.");
      return;
    }

    const trimmed = manualRep.trim().toLowerCase();
    const matched = agents.find(
      (a) =>
        a.repNumber.toLowerCase() === trimmed ||
        a.email.toLowerCase() === trimmed ||
        a.fullName.toLowerCase().includes(trimmed)
    );

    if (matched) {
      handleLogin(matched.id);
    } else {
      setError("Representative Number not recognized in the authorized roster. Self-registration is disabled.");
    }
  }

  return (
    <div className="client-app client-wizard" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div className="wizard-shell" style={{ maxWidth: 520, width: "100%" }}>
        <header className="wizard-header">
          <Brand small />
          <span>
            <Lock size={13} />
            Advisor Authentication
          </span>
        </header>

        <div className="wizard-demo">
          MAS Market Conduct Notice FAA-N03 Compliance Gateway
        </div>

        <main className="wizard-main" style={{ padding: "28px 24px" }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#172b4d", margin: "0 0 6px" }}>
              Sign in to Advisor Workspace
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              Choose your authorized financial adviser profile to access compliant client consultation rooms.
            </p>
          </div>

          {error && (
            <p className="wizard-error" role="alert" style={{ marginBottom: 16 }}>
              <AlertCircle size={15} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              {error}
            </p>
          )}

          {loading ? (
            <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: "30px 0" }}>
              Loading authorized advisor directory…
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Authorized Licensed Representatives
                </span>

                {agents.map((agent) => {
                  const initials = agent.fullName
                    .split(/\s+/)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const isSelected = selectedAgentId === agent.id;

                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: isSelected ? "2px solid #2459d3" : "1px solid #dbe1ea",
                        background: isSelected ? "#f4f7fe" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className="avatar agent-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                          {initials}
                        </span>
                        <div>
                          <strong style={{ display: "block", fontSize: 14, color: "#172b4d" }}>
                            {agent.fullName}
                          </strong>
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            {agent.repNumber} · {agent.agencyFirm}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`v-button ${isSelected ? "primary" : "secondary"}`}
                        style={{ minHeight: 34, padding: "0 14px", fontSize: 12 }}
                        disabled={signingIn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogin(agent.id);
                        }}
                      >
                        {isSelected ? "Sign In" : "Select"}
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, marginTop: 4 }}>
                <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="wizard-field" style={{ margin: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#172b4d" }}>
                      Or lookup by MAS Rep Number / Email
                    </span>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <input
                        type="text"
                        placeholder="e.g. MAS-REP-882910"
                        value={manualRep}
                        onChange={(e) => setManualRep(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="v-button secondary" style={{ minHeight: 40, padding: "0 16px" }}>
                        Sign In
                      </button>
                    </div>
                  </label>
                </form>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 6,
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 11,
                  color: "#64748b",
                  lineHeight: 1.5,
                  marginTop: 6,
                }}
              >
                <Info size={14} style={{ flexShrink: 0, marginTop: 2, color: "#2459d3" }} />
                <span>
                  <strong>Account Provisioning Locked:</strong> Agent self-registration is disabled per compliance rules.
                  Authorized credentials must be provisioned via the{" "}
                  <Link href="/dev" style={{ color: "#2459d3", textDecoration: "underline" }}>
                    /dev administration page
                  </Link>.
                </span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
