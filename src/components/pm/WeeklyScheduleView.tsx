import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job, Phase, WeeklySchedule, WeeklyScheduleEntry } from "@/lib/types";
import { SectionHeader, Panel, Btn, Pill, StatCard } from "./UIComponents";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getMonday(d: Date): Date { const dt = new Date(d); const day = dt.getDay(); const diff = dt.getDate() - day + (day === 0 ? -6 : 1); dt.setDate(diff); dt.setHours(0, 0, 0, 0); return dt; }
function fmtDate(d: Date): string { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

const WeeklyScheduleView = ({ jobs }: { jobs: Job[] }) => {
  const [weekOffset, setWeekOffset] = useState(1);
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [entries, setEntries] = useState<WeeklyScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const monday = useMemo(() => getMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const sunday = useMemo(() => addDays(monday, 6), [monday]);
  const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const currentSchedule = useMemo(() => schedules.find(s => s.week_start_date === fmtDate(monday)), [schedules, monday]);
  const weekEntries = useMemo(() => entries.filter(e => e.weekly_schedule_id === currentSchedule?.id), [entries, currentSchedule]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [schRes] = await Promise.all([supabase.from("weekly_schedules").select("*").order("week_start_date", { ascending: false })]);
    setSchedules(schRes.data || []);
    if (schRes.data?.length) {
      const ids = schRes.data.map(s => s.id);
      const { data: entData } = await supabase.from("weekly_schedule_entries").select("*").in("weekly_schedule_id", ids);
      setEntries(entData || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const createWeek = async () => {
    const { data, error } = await supabase.from("weekly_schedules").insert({ week_start_date: fmtDate(monday), week_end_date: fmtDate(sunday), created_by: "Robert", status: "draft" }).select().single();
    if (error) { toast.error("Failed to create week plan"); return; }
    setSchedules([data, ...schedules]);
    toast.success(`Week plan created: ${weekLabel}`);
  };

  const totalCrewDays = weekEntries.length;
  const activeJobCount = new Set(weekEntries.map(e => e.job_id)).size;

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin" /></div>;

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <SectionHeader label="WEEKLY SCHEDULE — MICRO PLAN" />
        <div className="flex items-center gap-2 flex-wrap">
          <Btn variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← PREV</Btn>
          <div className="font-raj text-sm font-bold text-gold tracking-[1px] whitespace-nowrap">{weekLabel}</div>
          <Btn variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)}>NEXT →</Btn>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {currentSchedule ? (
          <Pill variant={currentSchedule.status === "published" ? "complete" : "gold"}>{currentSchedule.status?.toUpperCase()}</Pill>
        ) : (
          <Btn variant="gold" onClick={createWeek}>+ NEW WEEK PLAN</Btn>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Crew Days Planned" value={totalCrewDays} />
        <StatCard label="Active Jobs" value={activeJobCount} />
      </div>

      {currentSchedule && (
        <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full border-collapse">
            <thead><tr>
              <th className="text-left px-3 py-2 font-raj text-[10px] tracking-[2px] text-mil-muted uppercase border-b border-[rgba(255,255,255,0.05)] w-40">JOB</th>
              {DAYS.map(d => <th key={d} className="text-center px-2 py-2 font-raj text-[10px] tracking-[2px] text-mil-muted uppercase border-b border-[rgba(255,255,255,0.05)]">{d.slice(0, 3)}</th>)}
            </tr></thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td className="px-3 py-2 text-xs font-bold text-gold border-b border-[rgba(255,255,255,0.03)] whitespace-nowrap">{job.name?.split("--")[0].trim()}</td>
                  {DAYS.map(day => {
                    const entry = weekEntries.find(e => e.job_id === job.id && e.day_of_week === day);
                    return (
                      <td key={day} className="px-1 py-1 border-b border-[rgba(255,255,255,0.03)]">
                        {entry ? (
                          <div className="bg-[rgba(201,168,76,0.1)] border border-gold/20 p-1 text-[9px] text-cream min-h-[40px]">
                            {entry.task_description || "Scheduled"}
                            <div className="text-[8px] text-mil-muted mt-[2px]">{(entry.crew_members || []).join(", ")}</div>
                          </div>
                        ) : (
                          <div className="min-h-[40px] bg-[rgba(0,0,0,0.1)] border border-[rgba(255,255,255,0.03)]" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WeeklyScheduleView;
