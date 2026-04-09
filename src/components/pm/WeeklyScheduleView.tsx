import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job, WeeklySchedule, WeeklyScheduleEntry } from "@/lib/types";
import { SectionHeader, Btn, Pill } from "./UIComponents";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CREW = ["Leo", "Alberto", "Arnel", "Jose G.", "Edwin O.", "Miguel", "Carlos", "Field Crew"];

function getMonday(d: Date): Date {
  const dt = new Date(d); const day = dt.getDay();
  dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
  dt.setHours(0,0,0,0); return dt;
}
function fmtDate(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function dayDate(monday: Date, dayIndex: number) { return addDays(monday, dayIndex); }

interface EntryFormState {
  jobId: string;
  dayOfWeek: string;
  taskDescription: string;
  crewMembers: string[];
  hoursPlanned: number;
  notes: string;
  materialsNeeded: string;
  scheduleId: string;
}

const WeeklyScheduleView = ({ jobs }: { jobs: Job[] }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [entries, setEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCell, setEditCell] = useState<{jobId: string; day: string} | null>(null);
  const [form, setForm] = useState<Partial<EntryFormState>>({});
  const [saving, setSaving] = useState(false);
  const [phases, setPhases] = useState<Record<string, any[]>>({});

  const monday = useMemo(() => getMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const sunday = useMemo(() => addDays(monday, 6), [monday]);
  const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const currentSchedule = useMemo(() => schedules.find(s => s.week_start_date === fmtDate(monday)), [schedules, monday]);
  const weekEntries = useMemo(() => entries.filter(e => e.weekly_schedule_id === currentSchedule?.id), [entries, currentSchedule]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [schRes] = await Promise.all([
      supabase.from("weekly_schedules").select("*").order("week_start_date", { ascending: false })
    ]);
    setSchedules(schRes.data || []);
    if (schRes.data?.length) {
      const ids = schRes.data.map((s: any) => s.id);
      const { data: entData } = await supabase.from("weekly_schedule_entries").select("*").in("weekly_schedule_id", ids);
      setEntries(entData || []);
    }
    // Load active phases for all jobs
    if (jobs.length > 0) {
      const { data: phaseData } = await supabase.from("phases").select("job_id, name, status").in("job_id", jobs.map(j => j.id)).eq("status", "active");
      const byJob: Record<string, any[]> = {};
      (phaseData || []).forEach((p: any) => {
        if (!byJob[p.job_id]) byJob[p.job_id] = [];
        byJob[p.job_id].push(p);
      });
      setPhases(byJob);
    }
    setLoading(false);
  }, [jobs]);

  useEffect(() => { loadData(); }, [loadData]);

  const createWeek = async () => {
    const { data, error } = await supabase.from("weekly_schedules").insert({
      week_start_date: fmtDate(monday), week_end_date: fmtDate(sunday),
      created_by: "Andy", status: "draft"
    }).select().single();
    if (error) { toast.error("Failed to create week plan"); return; }
    setSchedules([data as any, ...schedules]);
    toast.success(`Week plan created: ${weekLabel}`);
  };

  const openCell = (jobId: string, day: string) => {
    if (!currentSchedule) { toast.error("Create a week plan first"); return; }
    const existing = weekEntries.find(e => e.job_id === jobId && e.day_of_week === day);
    setEditCell({ jobId, day });
    setForm({
      jobId, dayOfWeek: day,
      taskDescription: existing?.task_description || "",
      crewMembers: existing?.crew_members || [],
      hoursPlanned: existing?.hours_planned || 8,
      notes: existing?.notes || "",
      materialsNeeded: existing?.materials_needed || "",
      scheduleId: currentSchedule.id,
    });
  };

  const saveEntry = async () => {
    if (!form.taskDescription?.trim()) { toast.error("Enter a task description"); return; }
    setSaving(true);
    const existing = weekEntries.find(e => e.job_id === form.jobId && e.day_of_week === form.dayOfWeek);
    const payload = {
      weekly_schedule_id: form.scheduleId,
      job_id: form.jobId,
      day_of_week: form.dayOfWeek,
      task_description: form.taskDescription,
      crew_members: form.crewMembers,
      hours_planned: form.hoursPlanned,
      notes: form.notes || null,
      materials_needed: form.materialsNeeded || null,
      status: "planned",
    };
    if (existing) {
      await supabase.from("weekly_schedule_entries").update(payload as any).eq("id", existing.id);
    } else {
      await supabase.from("weekly_schedule_entries").insert(payload as any);
    }
    await loadData();
    setSaving(false);
    setEditCell(null);
    toast.success("Schedule entry saved");
  };

  const deleteEntry = async () => {
    const existing = weekEntries.find(e => e.job_id === editCell?.jobId && e.day_of_week === editCell?.day);
    if (!existing) { setEditCell(null); return; }
    await supabase.from("weekly_schedule_entries").delete().eq("id", existing.id);
    await loadData();
    setEditCell(null);
    toast.success("Entry removed");
  };

  const publishWeek = async () => {
    if (!currentSchedule) return;
    await supabase.from("weekly_schedules").update({ status: "published", published_at: new Date().toISOString() }).eq("id", currentSchedule.id);
    // Fire notifications
    const crewInvolved = [...new Set(weekEntries.flatMap(e => e.crew_members || []))];
    const promises = crewInvolved.map(member =>
      supabase.from("notifications").insert({
        type: "general",
        title: `Week plan published: ${weekLabel}`,
        body: `Check your assignments for the upcoming week`,
        from_user: "Andy",
        to_user: member,
        priority: "normal",
      } as any)
    );
    await Promise.all(promises);
    await loadData();
    toast.success(`Week published — ${crewInvolved.length} crew notified`);
  };

  // Compute crew conflicts (same person scheduled on 2+ jobs same day)
  const crewConflicts = useMemo(() => {
    const conflicts = new Set<string>();
    DAYS.forEach(day => {
      const dayEntries = weekEntries.filter(e => e.day_of_week === day);
      const crewCount: Record<string, number> = {};
      dayEntries.forEach(e => {
        (e.crew_members || []).forEach(c => {
          crewCount[c] = (crewCount[c] || 0) + 1;
          if (crewCount[c] > 1) conflicts.add(`${c}-${day}`);
        });
      });
    });
    return conflicts;
  }, [weekEntries]);

  // Hours per job per week
  const hoursPerJob = useMemo(() => {
    const totals: Record<string, number> = {};
    weekEntries.forEach(e => {
      totals[e.job_id] = (totals[e.job_id] || 0) + (e.hours_planned || 0);
    });
    return totals;
  }, [weekEntries]);

  // Total hours per day
  const hoursPerDay = useMemo(() => {
    const totals: Record<string, number> = {};
    weekEntries.forEach(e => {
      totals[e.day_of_week] = (totals[e.day_of_week] || 0) + (e.hours_planned || 0);
    });
    return totals;
  }, [weekEntries]);

  const totalWeekHours = weekEntries.reduce((s, e) => s + (e.hours_planned || 0), 0);

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" /></div>;

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <SectionHeader label="MASTER WEEKLY SCHEDULE" />
        <div className="flex items-center gap-2 flex-wrap">
          <Btn variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← PREV</Btn>
          <div className="font-raj text-sm font-bold text-gold tracking-[1px] whitespace-nowrap">{weekLabel}</div>
          <Btn variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)}>NEXT →</Btn>
        </div>
      </div>

      {/* Week stats */}
      <div className="grid grid-cols-4 gap-2 mb-3 max-md:grid-cols-2">
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-gold">{totalWeekHours}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Total Hours Planned</div>
        </div>
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-cream">{new Set(weekEntries.map(e => e.job_id)).size}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Jobs Active</div>
        </div>
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-cream">{new Set(weekEntries.flatMap(e => e.crew_members || [])).size}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Crew Deployed</div>
        </div>
        <div className={`border px-3 py-2 text-center ${crewConflicts.size > 0 ? "bg-[rgba(196,56,40,0.1)] border-danger/20" : "bg-[rgba(0,0,0,0.2)] border-[rgba(255,255,255,0.05)]"}`}>
          <div className={`font-mono text-lg font-bold ${crewConflicts.size > 0 ? "text-danger" : "text-ok"}`}>{crewConflicts.size > 0 ? "⚠" : "✓"}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">{crewConflicts.size > 0 ? `${Math.floor(crewConflicts.size / DAYS.length + 0.5)} Conflict(s)` : "No Conflicts"}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {!currentSchedule && <Btn variant="gold" onClick={createWeek}>+ CREATE WEEK PLAN</Btn>}
        {currentSchedule && currentSchedule.status !== "published" && (
          <Btn variant="green" onClick={publishWeek}>PUBLISH + NOTIFY CREW</Btn>
        )}
        {currentSchedule && <Pill variant={currentSchedule.status === "published" ? "complete" : "pending"}>{(currentSchedule.status || "draft").toUpperCase()}</Pill>}
        {!currentSchedule && <span className="text-[11px] text-mil-muted">Create a week plan first, then click any cell to schedule</span>}
      </div>

      {/* Entry form (overlay) */}
      {editCell && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-16" onClick={() => setEditCell(null)}>
          <div className="bg-[#1a1a18] border border-gold/30 p-5 w-[420px] max-w-[90vw] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="font-raj text-sm font-bold text-gold tracking-wider mb-4">
              {jobs.find(j => j.id === editCell.jobId)?.name?.split("--")[0].trim() || "Job"} — {editCell.day}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Task / Trade *</label>
                {(phases[editCell.jobId] || []).length > 0 ? (
                  <select
                    value={form.taskDescription || ""}
                    onChange={e => setForm(f => ({ ...f, taskDescription: e.target.value }))}
                    className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40"
                  >
                    <option value="">— select active phase or type below —</option>
                    {(phases[editCell.jobId] || []).map((p: any) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                    <option value="__custom">Other (type below)</option>
                  </select>
                ) : null}
                <input
                  value={form.taskDescription === "__custom" ? "" : (form.taskDescription || "")}
                  onChange={e => setForm(f => ({ ...f, taskDescription: e.target.value }))}
                  placeholder="e.g. Framing — install floor joists"
                  className="w-full mt-1 bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40"
                />
              </div>

              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Crew Members</label>
                <div className="grid grid-cols-2 gap-1 max-h-[120px] overflow-y-auto">
                  {CREW.map(member => {
                    const selected = (form.crewMembers || []).includes(member);
                    const conflictKey = `${member}-${editCell.day}`;
                    const hasConflict = crewConflicts.has(conflictKey) && selected;
                    return (
                      <label key={member} className={`flex items-center gap-2 px-2 py-1 cursor-pointer text-xs ${selected ? "bg-gold/10 border border-gold/20" : "border border-transparent"} ${hasConflict ? "border-danger/40" : ""}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => setForm(f => ({
                            ...f,
                            crewMembers: selected
                              ? (f.crewMembers || []).filter(c => c !== member)
                              : [...(f.crewMembers || []), member]
                          }))}
                          className="accent-gold"
                        />
                        <span className={selected ? "text-gold" : "text-mil-muted"}>{member}</span>
                        {hasConflict && <span className="text-danger text-[8px]">CONFLICT</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Hours Planned</label>
                <input
                  type="number"
                  min="1" max="16" step="0.5"
                  value={form.hoursPlanned || 8}
                  onChange={e => setForm(f => ({ ...f, hoursPlanned: parseFloat(e.target.value) }))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40"
                />
                {(form.crewMembers || []).length > 0 && form.hoursPlanned && (
                  <div className="text-[10px] text-mil-muted mt-1">
                    Total crew-hours: {((form.crewMembers || []).length * form.hoursPlanned).toFixed(1)} hrs
                    ({(form.crewMembers || []).length} people × {form.hoursPlanned} hrs)
                  </div>
                )}
              </div>

              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Materials Needed (optional)</label>
                <input
                  value={form.materialsNeeded || ""}
                  onChange={e => setForm(f => ({ ...f, materialsNeeded: e.target.value }))}
                  placeholder="e.g. 200 LF 2x6x16, 2 sheets OSB"
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40"
                />
              </div>

              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Notes</label>
                <textarea
                  value={form.notes || ""}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Access instructions, special requirements..."
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Btn variant="green" size="sm" onClick={saveEntry} disabled={saving}>{saving ? "SAVING..." : "SAVE ENTRY"}</Btn>
              <Btn variant="ghost" size="sm" onClick={deleteEntry}>REMOVE</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setEditCell(null)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Schedule grid */}
      {jobs.length === 0 ? (
        <div className="text-mil-muted text-xs p-5">No active jobs found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 font-raj text-[10px] tracking-[2px] text-mil-muted uppercase border-b border-[rgba(255,255,255,0.05)] w-44 sticky left-0 bg-[rgba(15,15,13,0.95)] z-10">JOB</th>
                <th className="text-right px-2 py-2 font-raj text-[10px] tracking-[2px] text-mil-muted uppercase border-b border-[rgba(255,255,255,0.05)] w-16">HRS/WK</th>
                {DAYS.map((d, i) => (
                  <th key={d} className="text-center px-1 py-2 font-raj text-[9px] tracking-[1px] text-mil-muted uppercase border-b border-[rgba(255,255,255,0.05)]">
                    <div>{d.slice(0, 3)}</div>
                    <div className="text-[8px] opacity-60">{dayDate(monday, i).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</div>
                    {hoursPerDay[d] > 0 && <div className="text-[8px] text-gold mt-[1px]">{hoursPerDay[d]}h</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.filter(j => j.status === "active" || !j.status).map(job => (
                <tr key={job.id} className="hover:bg-[rgba(255,255,255,0.01)]">
                  <td className="px-3 py-2 border-b border-[rgba(255,255,255,0.03)] sticky left-0 bg-[rgba(15,15,13,0.95)] z-10">
                    <div className="text-xs font-bold text-gold truncate max-w-[160px]">{job.name?.split("--")[0].trim()}</div>
                    {hoursPerJob[job.id] > 0 && <div className="text-[9px] text-mil-muted">{hoursPerJob[job.id]} hrs planned</div>}
                  </td>
                  <td className="px-2 py-2 border-b border-[rgba(255,255,255,0.03)] text-right">
                    <span className="font-mono text-[11px] text-cream">{hoursPerJob[job.id] || "—"}</span>
                  </td>
                  {DAYS.map(day => {
                    const entry = weekEntries.find(e => e.job_id === job.id && e.day_of_week === day);
                    const hasConflict = (entry?.crew_members || []).some(c => crewConflicts.has(`${c}-${day}`));
                    return (
                      <td key={day} className="px-1 py-1 border-b border-[rgba(255,255,255,0.03)]">
                        <div
                          onClick={() => openCell(job.id, day)}
                          className={`min-h-[52px] cursor-pointer transition-all p-1 text-[9px] ${
                            entry
                              ? hasConflict
                                ? "bg-[rgba(196,56,40,0.12)] border border-danger/20"
                                : "bg-[rgba(201,168,76,0.08)] border border-gold/15 hover:border-gold/30"
                              : "bg-[rgba(0,0,0,0.1)] border border-[rgba(255,255,255,0.03)] hover:border-gold/15 hover:bg-[rgba(201,168,76,0.03)]"
                          }`}
                        >
                          {entry ? (
                            <>
                              <div className="text-cream leading-tight">{entry.task_description}</div>
                              <div className="text-[8px] text-gold mt-1">{(entry.crew_members || []).join(", ")}</div>
                              <div className="text-[8px] text-mil-muted">{entry.hours_planned}h</div>
                              {hasConflict && <div className="text-[8px] text-danger">⚠ conflict</div>}
                            </>
                          ) : (
                            currentSchedule && <div className="text-[8px] text-mil-muted text-center mt-3 opacity-30">+</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Crew summary */}
      {weekEntries.length > 0 && (() => {
        const crewSummary: Record<string, { jobs: Set<string>; totalHours: number; days: Set<string> }> = {};
        weekEntries.forEach(e => {
          (e.crew_members || []).forEach(c => {
            if (!crewSummary[c]) crewSummary[c] = { jobs: new Set(), totalHours: 0, days: new Set() };
            crewSummary[c].jobs.add(e.job_id);
            crewSummary[c].totalHours += e.hours_planned || 0;
            crewSummary[c].days.add(e.day_of_week);
          });
        });
        return (
          <div className="mt-5">
            <div className="font-raj text-[10px] tracking-[2px] text-mil-muted uppercase mb-2">Crew Deployment Summary</div>
            <div className="grid grid-cols-4 gap-2 max-md:grid-cols-2">
              {Object.entries(crewSummary).map(([name, data]) => (
                <div key={name} className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2">
                  <div className="text-xs font-bold text-cream">{name}</div>
                  <div className="text-[10px] text-gold">{data.totalHours} hrs / {data.days.size} days</div>
                  <div className="text-[9px] text-mil-muted">{data.jobs.size} job{data.jobs.size !== 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default WeeklyScheduleView;
