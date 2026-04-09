import type { Job } from "@/lib/types";

interface JobCardProps {
  job: Job;
  selected: boolean;
  onSelect: (id: string) => void;
}

const JobCard = ({ job, selected, onSelect }: JobCardProps) => {
  const indicators = (job.indicators as Array<{ v: string; l: string }>) || [];
  const warns = (job.warns as string[]) || [];

  const scoreColor: Record<string, string> = {
    A: "var(--ok)", B: "var(--gold)", C: "var(--warn)", D: "var(--danger)",
  };
  const healthDot: Record<string, string> = {
    "h-green": "bg-ok shadow-[0_0_7px_var(--ok)]",
    "h-amber": "bg-warn shadow-[0_0_7px_var(--warn)]",
    "h-red": "bg-danger shadow-[0_0_7px_var(--danger)]",
  };
  const progColors: Record<string, string> = {
    "pf-gold": "linear-gradient(90deg,var(--gold3),var(--gold))",
    "pf-green": "linear-gradient(90deg,var(--ok2),var(--ok))",
    "pf-amber": "linear-gradient(90deg,var(--warn2),var(--warn))",
  };

  return (
    <div
      onClick={() => onSelect(job.id)}
      className={`bg-[var(--panel)] border cursor-pointer transition-all relative overflow-hidden hover:border-[rgba(190,180,154,0.35)] hover:-translate-y-[2px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:bg-[rgba(71,91,72,0.95)] ${
        selected ? "border-gold shadow-[0_0_24px_rgba(190,180,154,0.12)]" : "border-[rgba(190,180,154,0.09)]"
      }`}
    >
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gold opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gold-dark opacity-30 pointer-events-none" />

      {warns.length > 0 && (
        <div className="absolute top-2 right-2 font-raj text-[9px] tracking-[1px] font-bold px-[7px] py-[2px] bg-[rgba(196,56,40,0.15)] border border-[rgba(196,56,40,0.3)] text-danger z-10">
          ! {warns.length} ALERT{warns.length > 1 ? "S" : ""}
        </div>
      )}

      <div className="flex items-center gap-3 p-[14px_16px_10px] border-b border-[rgba(255,255,255,0.04)]">
        <div
          className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-col flex-shrink-0"
          style={{ border: `2.5px solid ${scoreColor[job.score || "B"]}` }}
        >
          <div className="font-raj text-[22px] font-bold leading-none" style={{ color: scoreColor[job.score || "B"] }}>
            {job.score || "B"}
          </div>
          <div className="font-raj text-[7px] tracking-[1px] text-mil-muted">SCORE</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-raj text-[14px] font-bold text-cream leading-tight">{job.name}</div>
          <div className="text-[10px] text-mil-muted mt-[1px] whitespace-nowrap overflow-hidden text-ellipsis">{job.address || ""}</div>
        </div>
        <div className={`w-[9px] h-[9px] rounded-full flex-shrink-0 mt-[2px] ${healthDot[job.health || "h-amber"] || "bg-warn"}`} />
      </div>

      <div className="px-4 py-[10px]">
        <div className="flex justify-between mb-[5px]">
          <span className="font-raj text-[9px] tracking-[1px] text-mil-muted uppercase">Phases {job.phase_pct || 0}% done</span>
          <span className="font-raj text-[9px] tracking-[1px] text-gold uppercase">{job.phases_complete || 0}/{job.phases_total || 0}</span>
        </div>
        <div className="h-[3px] bg-[rgba(255,255,255,0.07)] overflow-hidden">
          <div
            className="h-full transition-all duration-[800ms]"
            style={{ width: `${job.phase_pct || 0}%`, background: progColors[job.prog_color || "pf-gold"] }}
          />
        </div>
      </div>

      {indicators.length > 0 && (
        <div className="grid grid-cols-3 border-t border-[rgba(255,255,255,0.04)]">
          {indicators.map((ind, i) => (
            <div key={i} className={`p-[9px_12px] text-center ${i < indicators.length - 1 ? "border-r border-[rgba(255,255,255,0.04)]" : ""}`}>
              <div className="font-mono text-[11px] font-bold text-gold leading-none">{ind.v}</div>
              <div className="text-[9px] text-mil-muted mt-[3px] tracking-[0.5px]">{ind.l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-[6px] px-4 py-[7px] bg-[rgba(59,82,64,0.15)] border-t border-[rgba(255,255,255,0.04)] text-[10px] text-mil-muted">
        <div className="w-[5px] h-[5px] rounded-full bg-gold flex-shrink-0 animate-blink" />
        <div>{job.current_phase || "No active phase"}</div>
      </div>
    </div>
  );
};

export default JobCard;
