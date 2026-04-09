import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Btn, Pill, Label, SectionHeader } from "./UIComponents";
import TradeAuthorizationForm from "./TradeAuthorizationForm";
import { toast } from "sonner";

interface TradeAuth {
  id: string; job_id: string; trade_name: string; status: string;
  estimated_hours: number | null; authorized_hours: number | null; actual_hours: number | null;
  hours_variance: number | null; hours_variance_pct: number | null; performance_rating: string | null;
  submitted_by: string | null; authorized_by: string | null;
  authorized_start_date: string | null; authorized_end_date: string | null;
  completion_notes: string | null; subcontractor_name: string | null;
}

interface CrewAssignment { id: string; employee_name: string | null; allocated_hours: number | null; actual_hours_logged: number | null; }
interface Props { jobId: string; jobName: string; }

const statusPill: Record<string, string> = { pending_authorization: "warn", authorized: "gold", in_progress: "active", complete: "complete", over_budget: "fail", disputed: "blocked" };
const ratingColors: Record<string, { emoji: string; cls: string }> = { under_budget: { emoji: "🟢", cls: "text-ok" }, on_budget: { emoji: "✅", cls: "text-ok" }, over_budget: { emoji: "🟡", cls: "text-warn" }, critical_over: { emoji: "🔴", cls: "text-danger" } };

const TradeAuthorizationCards = ({ jobId, jobName }: Props) => {
  const [auths, setAuths] = useState<TradeAuth[]>([]);
  const [crewByAuth, setCrewByAuth] = useState<Record<string, CrewAssignment[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [editAuthId, setEditAuthId] = useState<string | undefined>();
  const [logHoursAuthId, setLogHoursAuthId] = useState<string | null>(null);
  const [logHoursValue, setLogHoursValue] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("trade_authorizations").select("*").eq("job_id", jobId).order("trade_sort_order");
    const authList = (data || []) as TradeAuth[];
    setAuths(authList);
    if (authList.length) {
      const ids = authList.map(a => a.id);
      const { data: crewData } = await supabase.from("trade_authorization_crew").select("*").in("authorization_id", ids);
      const map: Record<string, CrewAssignment[]> = {};
      (crewData || []).forEach((c: any) => { if (!map[c.authorization_id]) map[c.authorization_id] = []; map[c.authorization_id].push(c); });
      setCrewByAuth(map);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const approveAuth = async (authId: string) => {
    await supabase.from("trade_authorizations").update({ status: "authorized", authorized_by: "Robert", authorized_date: new Date().toISOString(), authorization_method: "app" }).eq("id", authId);
    toast.success("Trade AUTHORIZED ✅"); load();
  };

  const startTrade = async (authId: string) => {
    await supabase.from("trade_authorizations").update({ status: "in_progress" }).eq("id", authId);
    toast.success("Trade marked IN PROGRESS"); load();
  };

  const completeTrade = async (auth: TradeAuth) => {
    const actual = Number(auth.actual_hours) || 0;
    const authorized = Number(auth.authorized_hours) || 1;
    const variance = actual - authorized;
    const variancePct = (variance / authorized) * 100;
    let rating = "on_budget";
    if (variancePct < -5) rating = "under_budget";
    else if (variancePct > 15) rating = "critical_over";
    else if (variancePct > 5) rating = "over_budget";

    await supabase.from("trade_authorizations").update({
      status: "complete", actual_end_date: new Date().toISOString().split("T")[0],
      hours_variance: variance, hours_variance_pct: variancePct, performance_rating: rating,
    }).eq("id", auth.id);

    const crew = crewByAuth[auth.id] || [];
    for (const c of crew) {
      const allocated = Number(c.allocated_hours) || 0;
      const actual_h = Number(c.actual_hours_logged) || 0;
      const v = actual_h - allocated;
      const vPct = allocated > 0 ? (v / allocated) * 100 : 0;
      let empRating = "on_budget";
      if (vPct < -5) empRating = "under_budget"; else if (vPct > 15) empRating = "critical_over"; else if (vPct > 5) empRating = "over_budget";
      await supabase.from("employee_performance_history").insert({
        employee_id: (c as any).employee_id || c.id, employee_name: c.employee_name, job_id: jobId, job_name: jobName,
        trade_name: auth.trade_name, authorization_id: auth.id, allocated_hours: allocated, actual_hours: actual_h,
        variance_hours: v, variance_pct: vPct, performance_rating: empRating,
        period_start: auth.authorized_start_date, period_end: new Date().toISOString().split("T")[0],
      });
    }
    await supabase.from("estimating_accuracy_by_trade").insert({
      trade_name: auth.trade_name, job_id: jobId, job_name: jobName, authorization_id: auth.id,
      estimated_hours: Number(auth.estimated_hours) || 0, authorized_hours: authorized, actual_hours: actual,
      estimate_vs_actual_variance: actual - (Number(auth.estimated_hours) || 0),
      estimate_vs_actual_pct: Number(auth.estimated_hours) ? ((actual - Number(auth.estimated_hours)) / Number(auth.estimated_hours)) * 100 : 0,
      estimate_accuracy_rating: Math.abs(actual - (Number(auth.estimated_hours) || 0)) / (Number(auth.estimated_hours) || 1) * 100 <= 10 ? "accurate" : "slightly_off",
    });
    toast.success("Trade COMPLETED — variance report generated"); load();
  };

  const logHours = async (authId: string, hours: number) => {
    const auth = auths.find(a => a.id === authId);
    if (!auth) return;
    const newActual = (Number(auth.actual_hours) || 0) + hours;
    const authorized = Number(auth.authorized_hours) || 1;
    const pctUsed = (newActual / authorized) * 100;
    await supabase.from("trade_authorizations").update({ actual_hours: newActual }).eq("id", authId);
    if (pctUsed >= 100) toast.error(`🔴 HOURS EXHAUSTED — ${auth.trade_name}`);
    else if (pctUsed >= 80) toast.warning(`⚠️ HOURS ALERT — ${auth.trade_name}: ${pctUsed.toFixed(0)}%`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeader label="TRADE AUTHORIZATIONS" />
        <Btn variant="gold" size="sm" onClick={() => { setEditAuthId(undefined); setShowForm(true); }}>+ NEW AUTHORIZATION</Btn>
      </div>
      {auths.length === 0 && <div className="text-mil-muted text-xs p-4">No trade authorizations yet.</div>}
      <div className="space-y-3">
        {auths.map(auth => {
          const authorized = Number(auth.authorized_hours) || 0;
          const actual = Number(auth.actual_hours) || 0;
          const remaining = authorized - actual;
          const pctUsed = authorized > 0 ? (actual / authorized) * 100 : 0;
          const burnColor = pctUsed < 60 ? "var(--ok)" : pctUsed < 80 ? "var(--gold)" : "var(--danger)";
          const rating = ratingColors[auth.performance_rating || ""] || { emoji: "", cls: "" };

          return (
            <Panel key={auth.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-raj text-sm font-bold text-gold tracking-[1px]">{auth.trade_name}</span>
                  <Pill variant={statusPill[auth.status] || "pending"}>{auth.status.replace(/_/g, " ").toUpperCase()}</Pill>
                </div>
                <div className="flex items-center gap-2">
                  {auth.status === "pending_authorization" && (<><Btn variant="green" size="sm" onClick={() => approveAuth(auth.id)}>✓ APPROVE</Btn><Btn variant="ghost" size="sm" onClick={() => { setEditAuthId(auth.id); setShowForm(true); }}>EDIT</Btn></>)}
                  {auth.status === "authorized" && <Btn variant="gold" size="sm" onClick={() => startTrade(auth.id)}>▶ START</Btn>}
                  {auth.status === "in_progress" && (
                    <>
                      {logHoursAuthId === auth.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" step="0.5" value={logHoursValue} onChange={e => setLogHoursValue(e.target.value)} placeholder="hrs" className="w-20 px-3 py-2 bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-sm min-h-[44px]" autoFocus
                            onKeyDown={e => { if (e.key === "Enter" && logHoursValue && !isNaN(+logHoursValue)) { logHours(auth.id, +logHoursValue); setLogHoursAuthId(null); setLogHoursValue(""); } else if (e.key === "Escape") { setLogHoursAuthId(null); setLogHoursValue(""); } }} />
                          <Btn variant="green" size="sm" onClick={() => { if (logHoursValue && !isNaN(+logHoursValue)) { logHours(auth.id, +logHoursValue); setLogHoursAuthId(null); setLogHoursValue(""); } }}>✓</Btn>
                          <Btn variant="ghost" size="sm" onClick={() => { setLogHoursAuthId(null); setLogHoursValue(""); }}>✕</Btn>
                        </div>
                      ) : <Btn variant="ghost" size="sm" onClick={() => setLogHoursAuthId(auth.id)}>+ LOG HRS</Btn>}
                      <Btn variant="green" size="sm" onClick={() => completeTrade(auth)}>✓ COMPLETE</Btn>
                    </>
                  )}
                </div>
              </div>
              {(auth.status === "in_progress" || auth.status === "complete") && (
                <div className="mb-2">
                  <div className="flex items-center gap-3 text-[10px] text-mil-muted mb-1"><span>Auth: {authorized}h</span><span>Used: {actual.toFixed(0)}h</span><span>Left: {remaining.toFixed(0)}h</span></div>
                  <div className="h-[10px] bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.07)] overflow-hidden">
                    <div className="h-full transition-all duration-500" style={{ width: `${Math.min(pctUsed, 100)}%`, background: burnColor }} />
                  </div>
                </div>
              )}
              {auth.status === "complete" && auth.performance_rating && (
                <div className={`text-xs ${rating.cls}`}>{rating.emoji} Performance: {auth.performance_rating.replace(/_/g, " ").toUpperCase()}</div>
              )}
            </Panel>
          );
        })}
      </div>
      {showForm && <TradeAuthorizationForm jobId={jobId} jobName={jobName} existingAuthId={editAuthId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
};

export default TradeAuthorizationCards;
