import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label, Panel } from "./UIComponents";

interface MacroChangeLogProps {
  jobId: string;
}

interface Adjustment {
  id: string;
  phase_name: string | null;
  adjustment_type: string | null;
  days_delta: number | null;
  reason: string | null;
  approved_by: string | null;
  created_at: string;
}

const MacroChangeLog = ({ jobId }: MacroChangeLogProps) => {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);

  useEffect(() => {
    supabase
      .from("macro_schedule_adjustments")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAdjustments(data || []));
  }, [jobId]);

  if (adjustments.length === 0) return null;

  return (
    <Panel className="mt-4">
      <Label>MACRO SCHEDULE CHANGE LOG</Label>
      <div className="mt-3 space-y-1">
        {adjustments.map(a => (
          <div key={a.id} className="grid grid-cols-[80px_80px_1fr_60px_1fr_80px] items-center gap-2 px-2 py-[6px] text-[10px] border-b border-[rgba(255,255,255,0.03)]">
            <span className="text-mil-muted">{new Date(a.created_at).toLocaleDateString()}</span>
            <span className="text-cream">{a.adjustment_type}</span>
            <span className="text-gold">{a.phase_name || "—"}</span>
            <span className={`font-mono font-bold ${(a.days_delta || 0) > 0 ? "text-danger" : "text-ok"}`}>
              {(a.days_delta || 0) > 0 ? `+${a.days_delta}d` : `${a.days_delta}d`}
            </span>
            <span className="text-mil-muted">{a.reason}</span>
            <span className="text-cream">{a.approved_by || "—"}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
};

export default MacroChangeLog;
