import { useState, useMemo } from "react";
import type { Phase } from "@/lib/types";
import { Panel } from "../UIComponents";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PHASE_COLORS = ["bg-ok/70", "bg-info/70", "bg-warn/70", "bg-celeb/70", "bg-gold/70", "bg-danger/50"];

function parseDate(d: string | null): Date | null { if (!d) return null; const parsed = new Date(d); return isNaN(parsed.getTime()) ? null : parsed; }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isInRange(day: Date, start: Date | null, end: Date | null) { if (!start || !end) return false; return day.getTime() >= start.getTime() && day.getTime() <= end.getTime(); }

const CalendarTab = ({ phases }: { phases: Phase[] }) => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [year, month]);

  const phaseRanges = useMemo(() => phases.map((p, i) => ({ phase: p, start: parseDate(p.start_date), end: parseDate((p as any).end_date), color: PHASE_COLORS[i % PHASE_COLORS.length] })), [phases]);
  const getActivePhases = (day: Date) => phaseRanges.filter(({ start, end }) => isInRange(day, start, end));
  const selectedPhases = selectedDay ? getActivePhases(selectedDay) : [];
  const today = new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="font-raj text-lg font-bold text-gold tracking-wider">{MONTHS[month]} {year}</div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="px-3 py-1 bg-transparent border border-gold/20 text-mil-muted font-raj text-xs tracking-wider hover:text-cream hover:border-gold transition-all cursor-pointer">◀ PREV</button>
          <button onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }} className="px-3 py-1 bg-transparent border border-gold/20 text-gold font-raj text-xs tracking-wider hover:text-cream hover:border-gold transition-all cursor-pointer">TODAY</button>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="px-3 py-1 bg-transparent border border-gold/20 text-mil-muted font-raj text-xs tracking-wider hover:text-cream hover:border-gold transition-all cursor-pointer">NEXT ▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[1px] mb-[2px]">{DAYS.map((d) => (<div key={d} className="text-center font-raj text-[10px] tracking-widest text-mil-muted py-1 uppercase">{d}</div>))}</div>
      <div className="grid grid-cols-7 gap-[1px]">
        {calendarDays.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-[72px] bg-[rgba(0,0,0,0.1)]" />;
          const active = getActivePhases(day);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          return (
            <div key={day.getTime()} onClick={() => setSelectedDay(day)} className={`h-[72px] p-1 cursor-pointer border transition-all ${isSelected ? "border-gold bg-[rgba(201,168,76,0.1)]" : isToday ? "border-gold/40 bg-[rgba(201,168,76,0.05)]" : "border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.15)] hover:bg-[rgba(0,0,0,0.25)]"}`}>
              <div className={`font-mono text-[10px] mb-[2px] ${isToday ? "text-gold font-bold" : "text-mil-muted"}`}>{day.getDate()}</div>
              <div className="flex flex-col gap-[1px] overflow-hidden">
                {active.slice(0, 3).map(({ phase, color }) => (<div key={phase.id} className={`${color} rounded-[2px] px-1 text-[7px] text-ink font-raj font-bold truncate leading-[12px]`}>{phase.name}</div>))}
                {active.length > 3 && <div className="text-[7px] text-mil-muted">+{active.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
      {selectedDay && (
        <Panel className="mt-4">
          <div className="font-raj text-sm font-bold text-gold tracking-wider mb-2">{selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
          {selectedPhases.length === 0 ? <div className="text-mil-muted text-xs">No phases active this day.</div> : (
            <div className="flex flex-col gap-2">{selectedPhases.map(({ phase, color }) => (
              <div key={phase.id} className="flex items-center gap-3 px-3 py-2 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.04)]">
                <div className={`w-3 h-3 rounded-[2px] ${color} flex-shrink-0`} />
                <div><div className="text-xs font-raj font-bold text-cream">{phase.name}</div><div className="text-[10px] text-mil-muted">{phase.trade || "—"} · {phase.crew || "—"} · {phase.status || "pending"}</div></div>
              </div>
            ))}</div>
          )}
        </Panel>
      )}
    </div>
  );
};

export default CalendarTab;
