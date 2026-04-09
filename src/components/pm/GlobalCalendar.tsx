import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job, Phase } from "@/lib/types";
import { Panel, SectionHeader } from "./UIComponents";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const JOB_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-ok/60", text: "text-ok", border: "border-ok/40" },
  1: { bg: "bg-info/60", text: "text-info", border: "border-info/40" },
  2: { bg: "bg-warn/60", text: "text-warn", border: "border-warn/40" },
  3: { bg: "bg-celeb/60", text: "text-celeb", border: "border-celeb/40" },
  4: { bg: "bg-gold/60", text: "text-gold", border: "border-gold/40" },
  5: { bg: "bg-danger/50", text: "text-danger", border: "border-danger/40" },
};

function parseDate(d: string | null): Date | null { if (!d) return null; const p = new Date(d); return isNaN(p.getTime()) ? null : p; }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isInRange(day: Date, start: Date | null, end: Date | null) { if (!start || !end) return false; return day.getTime() >= start.getTime() && day.getTime() <= end.getTime(); }

const GlobalCalendar = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allPhases, setAllPhases] = useState<Phase[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [j, p] = await Promise.all([supabase.from("jobs").select("*").order("name"), supabase.from("phases").select("*").order("sort_order")]);
      setJobs(j.data || []); setAllPhases(p.data || []); setLoading(false);
    }; load();
  }, []);

  const year = currentMonth.getFullYear(); const month = currentMonth.getMonth();
  const calendarDays = useMemo(() => { const f = new Date(year, month, 1); const l = new Date(year, month + 1, 0); const days: (Date | null)[] = []; for (let i = 0; i < f.getDay(); i++) days.push(null); for (let d = 1; d <= l.getDate(); d++) days.push(new Date(year, month, d)); return days; }, [year, month]);
  const jobColorMap = useMemo(() => { const m: Record<string, number> = {}; jobs.forEach((j, i) => { m[j.id] = i % 6; }); return m; }, [jobs]);
  const phaseEntries = useMemo(() => allPhases.map(p => { const job = jobs.find(j => j.id === p.job_id); return { phase: p, job: job!, start: parseDate(p.start_date), end: parseDate((p as any).end_date), colorIdx: job ? jobColorMap[job.id] : 0 }; }).filter(e => e.job && e.start && e.end), [allPhases, jobs, jobColorMap]);
  const getActivePhases = (day: Date) => phaseEntries.filter(({ start, end }) => isInRange(day, start, end));
  const selectedPhases = selectedDay ? getActivePhases(selectedDay) : [];
  const today = new Date();

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" /></div>;

  return (
    <div>
      <SectionHeader label="OCD MASTER CALENDAR — FIELD COMMANDER VIEW" />
      <div className="flex items-center justify-between mb-4">
        <div className="font-raj text-xl font-bold text-gold tracking-wider">{MONTHS[month]} {year}</div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="px-3 py-1 bg-transparent border border-gold/20 text-mil-muted font-raj text-xs tracking-wider hover:text-cream cursor-pointer">◀ PREV</button>
          <button onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }} className="px-3 py-1 bg-transparent border border-gold/20 text-gold font-raj text-xs tracking-wider cursor-pointer">TODAY</button>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="px-3 py-1 bg-transparent border border-gold/20 text-mil-muted font-raj text-xs tracking-wider hover:text-cream cursor-pointer">NEXT ▶</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">{jobs.map(j => { const c = JOB_COLORS[jobColorMap[j.id]]; return (<div key={j.id} className="flex items-center gap-1"><div className={`w-3 h-3 rounded-[2px] ${c.bg}`} /><span className={`text-[10px] font-raj tracking-wider font-bold ${c.text}`}>{j.name}</span></div>); })}</div>
      <div className="grid grid-cols-7 gap-[1px] mb-[2px]">{DAYS.map(d => <div key={d} className="text-center font-raj text-[10px] tracking-widest text-mil-muted py-1 uppercase">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-[1px]">
        {calendarDays.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="min-h-[80px] bg-[rgba(0,0,0,0.1)]" />;
          const active = getActivePhases(day); const isToday = isSameDay(day, today); const isSelected = selectedDay && isSameDay(day, selectedDay);
          return (
            <div key={day.getTime()} onClick={() => setSelectedDay(day)} className={`min-h-[80px] p-1 cursor-pointer border transition-all ${isSelected ? "border-gold bg-[rgba(201,168,76,0.1)]" : isToday ? "border-gold/40 bg-[rgba(201,168,76,0.05)]" : "border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.15)] hover:bg-[rgba(0,0,0,0.25)]"}`}>
              <div className={`font-mono text-[10px] mb-[2px] ${isToday ? "text-gold font-bold" : "text-mil-muted"}`}>{day.getDate()}</div>
              <div className="flex flex-col gap-[1px] overflow-hidden">
                {active.slice(0, 4).map(({ phase, colorIdx, job }) => { const c = JOB_COLORS[colorIdx]; return <div key={phase.id} className={`${c.bg} rounded-[2px] px-1 text-[6px] text-ink font-raj font-bold truncate leading-[11px]`}>{job.name}: {phase.name}</div>; })}
                {active.length > 4 && <div className="text-[7px] text-mil-muted">+{active.length - 4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
      {selectedDay && (
        <Panel className="mt-4">
          <div className="font-raj text-sm font-bold text-gold tracking-wider mb-3">{selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} — {selectedPhases.length} active phases</div>
          {selectedPhases.length === 0 ? <div className="text-mil-muted text-xs">No phases scheduled.</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{selectedPhases.map(({ phase, job, colorIdx }) => { const c = JOB_COLORS[colorIdx]; return (
              <div key={phase.id} className={`flex items-center gap-3 px-3 py-2 bg-[rgba(0,0,0,0.2)] border ${c.border}`}><div className={`w-3 h-3 rounded-[2px] ${c.bg} flex-shrink-0`} /><div><div className={`text-xs font-raj font-bold ${c.text}`}>{job.name}</div><div className="text-[11px] text-cream">{phase.name}</div><div className="text-[9px] text-mil-muted">{phase.trade || "—"} · {phase.status || "pending"}</div></div></div>
            ); })}</div>
          )}
        </Panel>
      )}
    </div>
  );
};

export default GlobalCalendar;
