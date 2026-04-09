import type { Job, JobData, Phase } from "@/lib/types";
import { Pill, Panel, SectionHeader } from "../UIComponents";

const OverviewTab = ({ job, data }: { job: Job; data: JobData }) => {
  const breakdown = (job.score_breakdown as Record<string, number>) || {};
  const dims = [
    { label: "Schedule Health", key: "schedule" },
    { label: "Phase Completion", key: "completion" },
    { label: "Inspection Rate", key: "inspection" },
    { label: "Material Readiness", key: "materials" },
    { label: "Task Accountability", key: "tasks" },
    { label: "Documentation", key: "docs" },
  ];

  const activePhases = data.phases.filter((p) => p.status === "active").slice(0, 3);
  const nextPhases = data.phases.filter((p) => p.status === "pending").slice(0, 3);
  const crew = (job.crew as string[]) || [];

  return (
    <div className="animate-fade-up">
      <div className="grid grid-cols-2 gap-[14px] mb-4 max-md:grid-cols-1">
        <div>
          <SectionHeader label="SCORECARD BREAKDOWN" />
          <div className="flex flex-col gap-2">
            {dims.map((d) => {
              const v = breakdown[d.key] || 0;
              const color = v >= 80 ? "var(--ok)" : v >= 60 ? "var(--gold)" : "var(--warn)";
              const cls = v >= 80 ? "green" : v >= 60 ? "" : "amber";
              const fillBg: Record<string, string> = {
                green: "linear-gradient(90deg,var(--ok2),var(--ok))",
                amber: "linear-gradient(90deg,var(--warn2),var(--warn))",
                "": "linear-gradient(90deg,var(--gold3),var(--gold))",
              };
              return (
                <div key={d.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-mil-muted">{d.label}</span>
                    <span className="font-raj text-[11px] font-bold" style={{ color }}>{v}%</span>
                  </div>
                  <div className="h-[3px] bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="h-full" style={{ width: `${v}%`, background: fillBg[cls] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <SectionHeader label="14-DAY LOOKAHEAD" />
          <div className="flex flex-col gap-[6px]">
            <div className="mb-[10px]">
              <div className="font-raj text-[10px] tracking-[2px] text-mil-muted uppercase mb-[6px]">Active Now</div>
              {activePhases.length > 0 ? activePhases.map((p) => (
                <div key={p.id} className="flex items-center gap-[10px] px-3 py-2 bg-[rgba(0,0,0,0.18)] border-l-2 border-l-gold mb-1">
                  <div className="flex-1 text-xs"><strong>{p.name}</strong><br /><span className="text-[10px] text-mil-muted">{p.crew || ""}</span></div>
                </div>
              )) : <div className="text-mil-muted text-[11px] px-2">No active phases</div>}
            </div>
            <div>
              <div className="font-raj text-[10px] tracking-[2px] text-mil-muted uppercase mb-[6px]">Up Next</div>
              {nextPhases.map((p) => (
                <div key={p.id} className="flex items-center gap-[10px] px-3 py-2 bg-[rgba(0,0,0,0.18)] border-l-2 border-l-mil-muted mb-1">
                  <div className="flex-1 text-xs">{p.name}<br /><span className="text-[10px] text-mil-muted">{p.crew || ""}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-[14px] max-md:grid-cols-1">
        <Panel>
          <div className="flex items-center justify-between mb-[14px] pb-[10px] border-b border-[rgba(255,255,255,0.05)]">
            <span className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase">Active Phase</span>
            <Pill variant="active">★ Live</Pill>
          </div>
          <div className="text-[14px] font-raj font-bold text-gold">{job.current_phase || "--"}</div>
          <div className="text-[11px] text-mil-muted mt-[6px]">→ {job.next_milestone || ""}</div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between mb-[14px] pb-[10px] border-b border-[rgba(255,255,255,0.05)]">
            <span className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase">Today's Crew</span>
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {crew.map((c, i) => (
              <div key={i} className="bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.15)] px-[10px] py-1 text-[11px]">{c}</div>
            ))}
            {crew.length === 0 && <span className="text-mil-muted text-[11px]">No crew assigned</span>}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default OverviewTab;
