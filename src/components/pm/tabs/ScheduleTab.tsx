import { useState, useEffect } from "react";
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

interface CtcData {
  contractValue: number;
  billed: number;
  remainingRevenue: number;
  estTotalCost: number;
  costToComplete: number;
  ctcGap: number;
  ctcGapPct: number;
  grade: string;
  gradeColor: string;
}

const ScheduleTab = ({ phases, jobId, onPhasesChange, onJobUpdate }: ScheduleTabProps) => {
  const [ctcData, setCtcData] = useState<CtcData | null>(null);

  const statusMap: Record<string, string> = {
    complete: "complete", active: "active", pending: "pending", blocked: "blocked",
  };

  useEffect(() => {
    const loadCtc = async () => {
      const { data: billingItems } = await supabase
        .from("billing_items")
        .select("contract_amount, total_paid")
        .eq("job_id", jobId);

      const { data: estimate } = await supabase
        .from("estimates")
        .select("id, total_cost")
        .eq("job_id", jobId)
        .single();

      let estTotalCost = 0;
      if (estimate?.id) {
        const { data: lineItems } = await supabase
          .from("estimate_line_items")
          .select("ext_cost")
          .eq("estimate_id", estimate.id);
        estTotalCost = (lineItems || []).reduce((s, li) => s + ((li as any).ext_cost || 0), 0);
      }
      if (estTotalCost === 0 && estimate?.total_cost) {
        estTotalCost = estimate.total_cost * 0.72;
      }

      const contractValue = (billingItems || []).reduce((s, i) => s + ((i as any).contract_amount || 0), 0);
      const billed = (billingItems || []).reduce((s, i) => s + ((i as any).total_paid || 0), 0);
      const remainingRevenue = contractValue - billed;
      const completion = phases.filter((p) => p.status === "complete").length / Math.max(phases.length, 1);
      const costToComplete = estTotalCost * (1 - completion);
      const ctcGap = remainingRevenue - costToComplete;
      const ctcGapPct = contractValue > 0 ? (ctcGap / contractValue) * 100 : 0;

      let grade = "A", gradeColor = "var(--ok)";
      if (ctcGapPct < 0 && Math.abs(ctcGapPct) > 10) { grade = "F"; gradeColor = "var(--danger)"; }
      else if (ctcGapPct < 0) { grade = "D"; gradeColor = "var(--danger)"; }
      else if (ctcGapPct < 5) { grade = "C"; gradeColor = "var(--warn)"; }
      else if (ctcGapPct < 15) { grade = "B"; gradeColor = "var(--ok)"; }

      setCtcData({ contractValue, billed, remainingRevenue, estTotalCost, costToComplete, ctcGap, ctcGapPct, grade, gradeColor });
    };
    loadCtc();
  }, [jobId, phases]);

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
      {ctcData && (
        <div className={`mb-4 p-3 border ${ctcData.ctcGap < 0 ? "border-danger/30 bg-[rgba(231,76,60,0.05)]" : "border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)]"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-raj text-[10px] tracking-[2px] text-mil-muted uppercase">Cost to Complete</div>
            <div className="flex items-center gap-2">
              <div className="font-raj text-[13px] font-bold" style={{ color: ctcData.gradeColor }}>{ctcData.grade}</div>
              <div className={`text-[10px] font-raj font-bold ${ctcData.ctcGap >= 0 ? "text-ok" : "text-danger"}`}>
                {ctcData.ctcGap >= 0 ? "+" : ""}{ctcData.ctcGapPct.toFixed(1)}% margin
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <div className="text-mil-muted">Remaining to bill</div>
              <div className="font-mono text-cream">${ctcData.remainingRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div>
              <div className="text-mil-muted">Est. cost to finish</div>
              <div className="font-mono text-cream">${ctcData.costToComplete.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div>
              <div className="text-mil-muted">Gap</div>
              <div className="font-mono" style={{ color: ctcData.gradeColor }}>
                {ctcData.ctcGap >= 0 ? "+" : ""}${Math.abs(ctcData.ctcGap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
          {ctcData.ctcGap < 0 && (
            <div className="mt-2 text-[10px] text-danger font-raj font-bold">
              ⚠ COST TO COMPLETE EXCEEDS REMAINING REVENUE — Intervention required
            </div>
          )}
          {ctcData.grade === "C" && (
            <div className="mt-2 text-[10px] text-warn font-raj">
              Tight margin — monitor closely. Any cost overrun will result in a loss.
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-[14px]">
        <Label>Phase timeline — click to cycle status</Label>
        <span className="text-[10px] text-mil-muted font-raj tracking-wider">Click any phase row to advance status. When marked Complete, go to Billing Hub to generate the invoice.</span>
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
