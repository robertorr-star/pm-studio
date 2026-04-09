import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Inspection, Job } from "@/lib/types";
import { Panel, SectionHeader, Pill } from "./UIComponents";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseDate(d: string | null): Date | null { if (!d) return null; const p = new Date(d); return isNaN(p.getTime()) ? null : p; }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

const statusColor = (result: string | null) => {
  const r = (result || "").toUpperCase();
  if (r === "PASS" || r === "PASSED") return { bg: "bg-ok/60", dot: "bg-ok" };
  if (r === "FAIL" || r === "FAILED") return { bg: "bg-danger/50", dot: "bg-danger" };
  return { bg: "bg-warn/60", dot: "bg-warn" };
};

const ScheduleButton = ({ inspectionId, onScheduled }: { inspectionId: string; onScheduled: () => void }) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!date) { return; }
    setSaving(true);
    await supabase.from("inspections").update({ scheduled_date: date, result: "SCHEDULED" } as any).eq("id", inspectionId);
    setSaving(false);
    setOpen(false);
    onScheduled();
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] bg-transparent border border-gold/30 text-gold hover:bg-gold/10 transition-all cursor-pointer whitespace-nowrap">
      SCHEDULE →
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[rgba(0,0,0,0.4)] border border-gold/30 text-cream font-mono text-[11px] px-2 py-1 outline-none focus:border-gold" />
      <button onClick={save} disabled={saving} className="px-2 py-1 font-raj text-[10px] font-bold text-ok border border-ok/30 hover:bg-ok/10 transition-all cursor-pointer">
        {saving ? "..." : "✓"}
      </button>
      <button onClick={() => setOpen(false)} className="px-2 py-1 font-raj text-[10px] text-mil-muted border border-[rgba(255,255,255,0.1)] hover:text-cream transition-all cursor-pointer">✕</button>
    </div>
  );
};

const GlobalInspectionsCalendar = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [j, i] = await Promise.all([supabase.from("jobs").select("*").order("name"), supabase.from("inspections").select("*")]);
      setJobs(j.data || []); setInspections(i.data || []); setLoading(false);
    }; load();
  }, []);

  const year = currentMonth.getFullYear(); const month = currentMonth.getMonth();
  const calendarDays = useMemo(() => { const f = new Date(year, month, 1); const l = new Date(year, month + 1, 0); const days: (Date | null)[] = []; for (let i = 0; i < f.getDay(); i++) days.push(null); for (let d = 1; d <= l.getDate(); d++) days.push(new Date(year, month, d)); return days; }, [year, month]);
  const entries = useMemo(() => inspections.map(insp => ({ inspection: insp, job: jobs.find(j => j.id === insp.job_id), date: parseDate(insp.scheduled_date)! })).filter(e => e.date !== null), [inspections, jobs]);
  const getForDay = (day: Date) => entries.filter(e => isSameDay(e.date, day));
  const selectedEntries = selectedDay ? getForDay(selectedDay) : [];
  const today = new Date();

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" /></div>;

  return (
    <div>
      {/* Pending inspection requests — need Sonny/Arnel to schedule */}
      {(() => {
        const pending = inspections.filter(i => (i.result || "").toUpperCase() === "REQUESTED");
        if (pending.length === 0) return null;
        return (
          <div className="mb-4 p-3 bg-[rgba(201,168,76,0.08)] border border-warn/30">
            <div className="font-raj text-[11px] font-bold text-warn tracking-[1px] mb-2">
              ⚠️ {pending.length} INSPECTION REQUEST{pending.length > 1 ? "S" : ""} AWAITING SCHEDULING
            </div>
            <div className="space-y-2">
              {pending.map(insp => {
                const job = jobs.find(j => j.id === insp.job_id);
                return (
                  <div key={insp.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)]">
                    <div>
                      <span className="text-xs font-raj font-bold text-gold">{job?.name || "Unknown Job"}</span>
                      <span className="text-xs text-cream ml-2">— {insp.inspection_type}</span>
                      {(insp as any).phase_name && <span className="text-[10px] text-mil-muted ml-2">({(insp as any).phase_name})</span>}
                      {insp.notes && <div className="text-[10px] text-mil-muted italic mt-[2px]">{insp.notes}</div>}
                    </div>
                    <ScheduleButton inspectionId={insp.id} onScheduled={() => {
                      supabase.from("inspections").select("*").then(({ data }) => {
                        if (data) setInspections(data as Inspection[]);
                      });
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      <SectionHeader label="INSPECTIONS CALENDAR — ALL JOBS" />
      <div className="flex items-center justify-between mb-4">
        <div className="font-raj text-xl font-bold text-gold tracking-wider">{MONTHS[month]} {year}</div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="px-3 py-1 bg-transparent border border-gold/20 text-mil-muted font-raj text-xs tracking-wider cursor-pointer">◀ PREV</button>
          <button onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }} className="px-3 py-1 bg-transparent border border-gold/20 text-gold font-raj text-xs tracking-wider cursor-pointer">TODAY</button>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="px-3 py-1 bg-transparent border border-gold/20 text-mil-muted font-raj text-xs tracking-wider cursor-pointer">NEXT ▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[1px] mb-[2px]">{DAYS.map(d => <div key={d} className="text-center font-raj text-[10px] tracking-widest text-mil-muted py-1 uppercase">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-[1px]">
        {calendarDays.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="min-h-[80px] bg-[rgba(0,0,0,0.1)]" />;
          const dayEntries = getForDay(day); const isToday = isSameDay(day, today); const isSelected = selectedDay && isSameDay(day, selectedDay);
          return (
            <div key={day.getTime()} onClick={() => setSelectedDay(day)} className={`min-h-[80px] p-1 cursor-pointer border transition-all ${isSelected ? "border-gold bg-[rgba(201,168,76,0.1)]" : isToday ? "border-gold/40 bg-[rgba(201,168,76,0.05)]" : "border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.15)]"}`}>
              <div className={`font-mono text-[10px] mb-[2px] ${isToday ? "text-gold font-bold" : "text-mil-muted"}`}>{day.getDate()}</div>
              {dayEntries.slice(0, 3).map(entry => { const c = statusColor(entry.inspection.result); return <div key={entry.inspection.id} className={`${c.bg} rounded-[2px] px-1 text-[6px] text-ink font-raj font-bold truncate leading-[11px]`}>{entry.inspection.inspection_type || "INSP"}</div>; })}
              {dayEntries.length > 3 && <div className="text-[7px] text-mil-muted">+{dayEntries.length - 3} more</div>}
            </div>
          );
        })}
      </div>
      {selectedDay && (
        <Panel className="mt-4">
          <div className="font-raj text-sm font-bold text-gold tracking-wider mb-3">{selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} — {selectedEntries.length} inspections</div>
          {selectedEntries.length === 0 ? <div className="text-mil-muted text-xs">No inspections this day.</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{selectedEntries.map(entry => { const c = statusColor(entry.inspection.result); return (
              <div key={entry.inspection.id} className="flex items-center gap-3 px-3 py-2 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.06)]">
                <div className={`w-3 h-3 rounded-full ${c.dot} flex-shrink-0`} />
                <div className="flex-1"><div className="text-xs font-raj font-bold text-cream">{entry.inspection.inspection_type || "Inspection"}</div><div className="text-[11px] text-cream">{entry.job?.name || entry.inspection.job_id}</div><div className="text-[9px] text-mil-muted">{entry.inspection.result || "PENDING"}</div></div>
                <Pill variant={(entry.inspection.result || "").toUpperCase() === "PASS" ? "complete" : (entry.inspection.result || "").toUpperCase() === "FAIL" ? "overdue" : "pending"}>{entry.inspection.result || "PENDING"}</Pill>
              </div>
            ); })}</div>
          )}
        </Panel>
      )}
    </div>
  );
};

export default GlobalInspectionsCalendar;
