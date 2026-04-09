import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, Panel, Btn, Pill, Label, StatCard, FormSelect } from "./UIComponents";

type PerfRecord = { id: string; employee_id: string; employee_name: string | null; job_name: string | null; trade_name: string | null; allocated_hours: number | null; actual_hours: number | null; variance_hours: number | null; variance_pct: number | null; performance_rating: string | null; };
type AuthRecord = { id: string; job_id: string; trade_name: string; status: string; authorized_hours: number | null; actual_hours: number | null; hours_variance: number | null; authorized_by: string | null; authorized_date: string | null; performance_rating: string | null; submitted_by: string | null; };

const ScorecardView = () => {
  const [tab, setTab] = useState<"employees" | "log">("employees");
  const [perfData, setPerfData] = useState<PerfRecord[]>([]);
  const [authLog, setAuthLog] = useState<AuthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [p, l] = await Promise.all([
        supabase.from("employee_performance_history").select("*").order("recorded_at", { ascending: false }),
        supabase.from("trade_authorizations").select("*").order("created_at", { ascending: false }),
      ]);
      setPerfData((p.data || []) as PerfRecord[]);
      setAuthLog((l.data || []) as AuthRecord[]);
      setLoading(false);
    }; load();
  }, []);

  const employeeStats = useMemo(() => {
    const map: Record<string, { name: string; trades: number; totalVariance: number; on: number; over: number; under: number }> = {};
    perfData.forEach(r => {
      const key = r.employee_id;
      if (!map[key]) map[key] = { name: r.employee_name || "Unknown", trades: 0, totalVariance: 0, on: 0, over: 0, under: 0 };
      map[key].trades++; map[key].totalVariance += Number(r.variance_pct) || 0;
      if (r.performance_rating === "on_budget") map[key].on++; else if (r.performance_rating === "under_budget") map[key].under++; else map[key].over++;
    });
    return Object.entries(map).map(([id, d]) => ({
      id, name: d.name, trades: d.trades, avgVariance: d.trades > 0 ? d.totalVariance / d.trades : 0,
      on: d.on, over: d.over, under: d.under,
      rating: d.trades > 0 ? (d.totalVariance / d.trades <= 5 ? "STRONG" : d.totalVariance / d.trades <= 15 ? "WATCH" : "CONCERN") : "N/A",
    })).sort((a, b) => a.avgVariance - b.avgVariance);
  }, [perfData]);

  const pendingCount = authLog.filter(a => a.status === "pending_authorization").length;

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin" /></div>;

  return (
    <div className="animate-fade-up">
      <SectionHeader label="PERFORMANCE SCORECARD — ACCOUNTABILITY ENGINE" />
      <div className="flex gap-[2px] mb-4">
        {[{ id: "employees" as const, label: "FIELD EMPLOYEES" }, { id: "log" as const, label: `AUTH LOG${pendingCount > 0 ? ` (${pendingCount})` : ""}` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 font-raj text-[11px] font-semibold tracking-[1.5px] uppercase border-b-2 transition-all cursor-pointer bg-transparent ${tab === t.id ? "text-gold border-gold" : "text-mil-muted border-transparent hover:text-gold"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "employees" && (
        <div>
          {employeeStats.length === 0 ? <div className="text-mil-muted text-xs p-5">No performance data yet.</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-[600px] w-full border-collapse">
                <thead><tr className="border-b border-[rgba(255,255,255,0.08)]">
                  {["EMPLOYEE","TRADES","AVG VARIANCE","ON BUDGET","OVER","UNDER","RATING"].map(h => <th key={h} className="text-left px-3 py-2 font-raj text-[10px] tracking-[2px] text-mil-muted">{h}</th>)}
                </tr></thead>
                <tbody>{employeeStats.map(e => (
                  <tr key={e.id} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="px-3 py-2 text-xs text-cream font-bold">{e.name}</td>
                    <td className="px-3 py-2 text-xs text-center text-mil-muted">{e.trades}</td>
                    <td className={`px-3 py-2 text-xs text-center font-mono ${e.avgVariance > 5 ? "text-danger" : "text-ok"}`}>{e.avgVariance > 0 ? "+" : ""}{e.avgVariance.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-xs text-center text-mil-muted">{e.on}</td>
                    <td className="px-3 py-2 text-xs text-center text-danger">{e.over}</td>
                    <td className="px-3 py-2 text-xs text-center text-ok">{e.under}</td>
                    <td className="px-3 py-2 text-center"><Pill variant={e.rating === "STRONG" ? "complete" : e.rating === "WATCH" ? "warn" : "fail"}>{e.rating}</Pill></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "log" && (
        <div>
          {authLog.length === 0 ? <div className="text-mil-muted text-xs p-5">No authorization records.</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-[650px] w-full border-collapse">
                <thead><tr className="border-b border-[rgba(255,255,255,0.08)]">
                  {["TRADE","AUTH BY","AUTH HRS","ACTUAL","VARIANCE","STATUS","DATE"].map(h => <th key={h} className="text-center px-3 py-2 font-raj text-[10px] tracking-[2px] text-mil-muted">{h}</th>)}
                </tr></thead>
                <tbody>{authLog.map(a => (
                  <tr key={a.id} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="px-3 py-2 text-xs text-cream font-bold">{a.trade_name}</td>
                    <td className="px-3 py-2 text-xs text-center text-mil-muted">{a.authorized_by || a.submitted_by || "—"}</td>
                    <td className="px-3 py-2 text-xs text-center font-mono text-gold">{Number(a.authorized_hours || 0)}h</td>
                    <td className="px-3 py-2 text-xs text-center font-mono text-cream">{a.actual_hours ? `${Number(a.actual_hours)}h` : "—"}</td>
                    <td className={`px-3 py-2 text-xs text-center font-mono ${Number(a.hours_variance || 0) > 0 ? "text-danger" : "text-ok"}`}>{a.hours_variance !== null ? `${Number(a.hours_variance) > 0 ? "+" : ""}${Number(a.hours_variance)}h` : "—"}</td>
                    <td className="px-3 py-2 text-center"><Pill variant={a.status === "complete" ? "complete" : a.status === "pending_authorization" ? "warn" : "active"}>{a.status.replace(/_/g, " ").toUpperCase()}</Pill></td>
                    <td className="px-3 py-2 text-xs text-center text-mil-muted">{a.authorized_date ? new Date(a.authorized_date).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScorecardView;
