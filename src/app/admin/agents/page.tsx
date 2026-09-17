"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  UserPlus,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Award,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronRight,
} from "lucide-react";
import type { AgentAccount } from "@/types";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form State
  const [fullName, setFullName] = useState<string>("");
  const [repNumber, setRepNumber] = useState<string>("MAS-REP-");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("+65 ");
  const [agencyFirm, setAgencyFirm] = useState<string>("Vera Financial Advisory Pte Ltd");
  const [role, setRole] = useState<AgentAccount["role"]>("SENIOR_ADVISOR");

  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchAgents = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.success && Array.isArray(data.agents)) {
        setAgents(data.agents);
      }
    } catch (e) {
      console.error("Failed to load agents:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormSubmitting(true);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          repNumber,
          email,
          phone,
          agencyFirm,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to provision financial adviser account.");
        setFormSubmitting(false);
        return;
      }

      setFormSuccess(`Adviser account for ${data.agent.fullName} (${data.agent.repNumber}) provisioned successfully.`);
      // Reset form
      setFullName("");
      setRepNumber("MAS-REP-");
      setEmail("");
      setPhone("+65 ");
      fetchAgents();
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const totalSessions = agents.reduce((acc, a) => acc + (a.totalSessions || 0), 0);
  const avgCompliance =
    agents.length > 0
      ? (agents.reduce((acc, a) => acc + (a.complianceRating || 100), 0) / agents.length).toFixed(1)
      : "100.0";

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-sm shadow-blue-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">VERA AI Advisor Provisioning</h1>
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                  Agency Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                MAS Market Conduct & Representative Verification Management Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAgents(true)}
              disabled={refreshing}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <button
              onClick={() => {
                setIsModalOpen(true);
                setFormError(null);
                setFormSuccess(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Provision New Adviser</span>
            </button>
          </div>
        </div>

        {/* Security & Regulatory Notice */}
        <div className="mt-6 p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold block mb-0.5">Internal Enterprise Provisioning Standard:</strong>
            Under Singapore MAS Market Conduct Regulations and the Financial Advisers Act (FAA), self-signup is strictly disabled. 
            All financial adviser accounts must be provisioned and authorized internally by Agency Compliance with verified MAS Representative Numbers.
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Provisioned Advisers
            </span>
            <span className="text-2xl font-extrabold text-slate-900">{agents.length}</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Active MAS Licenses
            </span>
            <span className="text-2xl font-extrabold text-emerald-600">
              {agents.filter((a) => a.status === "ACTIVE").length}
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Avg Compliance Score
            </span>
            <span className="text-2xl font-extrabold text-blue-600">{avgCompliance}%</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              AI Audited Meetings
            </span>
            <span className="text-2xl font-extrabold text-slate-900">{totalSessions}</span>
          </div>
        </div>
      </div>

      {/* Agents Directory */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Provisioned Financial Advisers Directory</h2>
            <p className="text-xs text-slate-500">Authorized representatives licensed for VERA AI Copilot pairing</p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {agents.length} Registered Advisers
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Loading certified adviser accounts...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No advisers provisioned yet</p>
            <p className="text-xs text-slate-400 mt-1">Click &quot;Provision New Adviser&quot; above to register an authorized MAS representative.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl p-5 transition-all hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                      {agent.repNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        agent.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {agent.fullName}
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{agent.agencyFirm}</span>
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono text-[11px] truncate">{agent.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px]">{agent.phone}</span>
                    </div>
                  </div>

                  {/* Rating & Sessions */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200/60">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Compliance
                      </span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                        <Award className="w-3 h-3" />
                        {agent.complianceRating}%
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Audited
                      </span>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Zap className="w-3 h-3 text-amber-500" />
                        {agent.totalSessions} Sessions
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Launch Action */}
                <div className="mt-5 pt-3 border-t border-slate-200/60">
                  <Link
                    href={`/copilot?agentId=${encodeURIComponent(agent.id)}&agentName=${encodeURIComponent(
                      agent.fullName
                    )}&repNumber=${encodeURIComponent(agent.repNumber)}`}
                    className="w-full bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Launch VERA AI Copilot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-slate-600 underline">
              &larr; Back to VERA AI Home
            </Link>
            <Link href="/copilot" className="hover:text-slate-600 underline">
              Open Advisor Copilot HUD
            </Link>
          </div>
          <span className="font-mono">VERA AI Enterprise • MAS Rep Registry Compliance</span>
        </div>
      </div>

      {/* Provisioning Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Provision Financial Adviser</h3>
                  <p className="text-xs text-slate-500">Internal Agency & MAS Compliance Authorization</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adviser Full Name (with professional designations) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rachel Koh, CFP, ChFC"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    MAS Rep Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={repNumber}
                    onChange={(e) => setRepNumber(e.target.value)}
                    placeholder="MAS-REP-992810"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Advisory Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  >
                    <option value="SENIOR_ADVISOR">Senior Financial Advisor</option>
                    <option value="WEALTH_PLANNER">Wealth Planner</option>
                    <option value="FINANCIAL_CONSULTANT">Financial Consultant</option>
                    <option value="COMPLIANCE_OFFICER">Compliance Officer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rachel.koh@verainsure.sg"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Corporate Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+65 9123 4567"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Agency / Firm Assignment
                  </label>
                  <input
                    type="text"
                    value={agencyFirm}
                    onChange={(e) => setAgencyFirm(e.target.value)}
                    placeholder="Vera Financial Advisory Pte Ltd"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Provisioning in Backend...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Authorize & Provision Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
