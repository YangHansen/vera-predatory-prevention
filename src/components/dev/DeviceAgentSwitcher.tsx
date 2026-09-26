"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  UserCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { AgentAccount } from "@/types";

export function DeviceAgentSwitcher() {
  const [agents, setAgents] = useState<AgentAccount[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string>("agt_andi_01");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agt_andi_01");
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        if (data.success && Array.isArray(data.agents)) {
          setAgents(data.agents);
          const savedId = localStorage.getItem("vera_active_agent_id");
          const targetId = savedId || (data.agents[0] ? data.agents[0].id : "agt_andi_01");
          setActiveAgentId(targetId);
          setSelectedAgentId(targetId);

          if (!savedId && data.agents[0]) {
            localStorage.setItem("vera_active_agent_id", data.agents[0].id);
            localStorage.setItem("vera_active_agent_name", data.agents[0].fullName);
            localStorage.setItem("vera_active_agent_rep", data.agents[0].repNumber);
            document.cookie = `vera_agent_id=${encodeURIComponent(data.agents[0].id)}; path=/; max-age=2592000; SameSite=Lax`;
          }
        }
      } catch (err) {
        console.error("Failed to load agents in switcher:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  function handleSwitch(e: React.FormEvent) {
    e.preventDefault();
    const target = agents.find((a) => a.id === selectedAgentId);
    if (!target) return;

    localStorage.setItem("vera_active_agent_id", target.id);
    localStorage.setItem("vera_active_agent_name", target.fullName);
    localStorage.setItem("vera_active_agent_rep", target.repNumber);
    document.cookie = `vera_agent_id=${encodeURIComponent(target.id)}; path=/; max-age=2592000; SameSite=Lax`;

    setActiveAgentId(target.id);
    setSuccessMessage(`Device login locked to ${target.fullName} (${target.repNumber})!`);
    setTimeout(() => setSuccessMessage(""), 5000);
  }

  const activeAgent = agents.find((a) => a.id === activeAgentId) || {
    id: activeAgentId,
    fullName: "Andi Wijaya, ChFC",
    repNumber: "MAS-REP-882910",
    agencyFirm: "Vera Financial Advisory Pte Ltd",
    email: "andi.wijaya@verainsure.sg",
  };

  const initials = activeAgent.fullName
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 border border-indigo-700/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl my-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/30">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">
                Device Terminal Lock &amp; Active Adviser Account
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <Lock className="w-3 h-3" />
                Terminal Enforced
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Under MAS Market Conduct rules, advisor devices cannot switch profiles locally. Use this master control to switch the active login agent for this browser.
            </p>
          </div>
        </div>

        <Link
          href="/admin/agents"
          className="text-xs font-semibold text-blue-300 hover:text-blue-200 underline flex items-center gap-1 shrink-0"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Provision New Advisers &rarr;</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
          Loading authorized advisor roster…
        </div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-12 gap-6">
          {/* Active Logged Profile Display */}
          <div className="lg:col-span-6 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block mb-3">
                Current Active Advisor on this Device
              </span>

              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-200 font-bold text-lg flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {activeAgent.fullName}
                    </h3>
                    <span className="text-[10px] font-bold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-md border border-blue-400/30">
                      MAS LICENSED
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">
                    {activeAgent.repNumber} · {activeAgent.agencyFirm}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {activeAgent.email || "advisor@verainsure.sg"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active on Workspace &amp; Client Sessions
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                ID: {activeAgent.id}
              </span>
            </div>
          </div>

          {/* Switcher Form */}
          <div className="lg:col-span-6 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <form onSubmit={handleSwitch} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Reassign Active Device Login
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-900 border border-white/20 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-blue-400"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id} className="bg-slate-900 text-white">
                      {agent.fullName} ({agent.repNumber}) — {agent.agencyFirm}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Apply &amp; Lock Device to Selected Account</span>
              </button>
            </form>

            {successMessage && (
              <div className="mt-3 p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Launch Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/copilot"
                className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Launch Copilot HUD</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
