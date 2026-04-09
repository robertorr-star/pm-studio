import { supabase } from "@/integrations/supabase/client";
import type { Phase } from "@/lib/types";
import { Pill, Btn, Label } from "../UIComponents";
import MacroChangeLog from "../MacroChangeLog";
import { toast } from "sonner";

interface ScheduleTabProps {
  phases: Phase[];
  jobId: string;
  onPhasesChange: (phases: Phase[]) => void;
  onJobUpdate: (updates: Record<string, any>) => void;
}

const ScheduleTab = ({ phases, jobId, onPhasesChange, onJobUpdate }: ScheduleTabProps) => {
  const statusMap: Record<string, string> = {
    complete: "complete", active: "active", pending: "pending", blocked: "blocked",
  };

  const cycleStatus = async (phaseId: string, idx: number) => {
    const phase = phases[idx];
    if (!phase || phase.status === "complete") return;
    const cycle = ["pending", "active", "complete"];
    const cur = cycle.indexOf(phase.status || "pending");
    const next = cycle[(cur + 1) % cycle.length];

    await supabase.from("phases").update({ status: next }).eq("id", phaseId);
    const updated = [...phases];
    updated[idx] = { ...updated[idx], status: next };
    onPhasesChange(updated);

    if (next === "complete") {
      toast.success(`Phase Complete! ${phase.name} — INVOICE TRIGGER sent to Sonny.`);
      const done = updated.filter((p) => p.status === "complete").length;
      const pct = Math.round((done / updated.length) * 100);
      await supabase.from("jobs").update({ phases_complete: done, phase_pct: pct }).eq("id", jobId);
      onJobUpdate({ phases_complete: done, phase_pct: pct });
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-[14px]">
        <Label>Phase timeline — click to cycle status</Label>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={() => toast.info("Click any phase row to cycle status")}>SET ACTIVE</Btn>
          <Btn variant="green" size="sm" onClick={() => toast.info("Click any phase to mark complete")}>MARK COMPLETE → TRIGGER INVOICE</Btn>
        </div>
      </div>
      {phases.length === 0 ? (
        <div className="text-mil-muted p-5">No phases loaded.</div>
      ) : (
        phases.map((p, i) => (
          <div
            key={p.id}
            onClick={() => cycleStatus(p.id, i)}
            className="flex items-center gap-3 px-3 py-[10px] border-b border-[rgba(255,255,255,0.03)] cursor-pointer transition-colors hover:bg-[rgba(190,180,154,0.03)]"
          >
            <div className="font-mono text-[10px] text-mil-muted w-6 flex-shrink-0">{p.num || i + 1}</div>
            <div className="flex-1">
              <div className="text-xs font-medium">{p.name}</div>
              <div className="text-[10px] text-mil-muted mt-[2px]">{p.trade || ""} — {p.crew || ""} — {p.start_date || ""}</div>
            </div>
            <div className="font-mono text-[11px] text-mil-muted whitespace-nowrap">{p.estimated_hrs || ""}</div>
            <Pill variant={statusMap[p.status || "pending"] || "pending"}>
              {(p.status || "pending").charAt(0).toUpperCase() + (p.status || "pending").slice(1)}
            </Pill>
          </div>
        ))
      )}

      <MacroChangeLog jobId={jobId} />
    </div>
  );
};

export default ScheduleTab;
