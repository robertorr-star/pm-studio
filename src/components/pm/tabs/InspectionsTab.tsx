import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Inspection } from "@/lib/types";
import { Pill, Label, Btn } from "../UIComponents";
import { toast } from "sonner";

interface InspectionTemplate {
  name: string;
  type: string;
  required_before?: string;
  notes?: string;
}

const InspectionsTab = ({ inspections, jobId }: { inspections: Inspection[]; jobId: string }) => {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [jobType, setJobType] = useState("");
  const [requesting, setRequesting] = useState<string | null>(null);

  const resultPill: Record<string, string> = { PASS: "pass", FAIL: "fail", PENDING: "pending" };

  useEffect(() => {
    const load = async () => {
      // Get job type
      const { data: jobRow } = await supabase.from("jobs").select("type").eq("id", jobId).single();
      const type = (jobRow as any)?.type || "residential_remodel";
      setJobType(type);

      // Load inspection templates for this job type
      const { data: tplRow } = await supabase
        .from("inspection_templates")
        .select("inspections")
        .eq("job_type", type)
        .single();

      if (tplRow && (tplRow as any).inspections) {
        setTemplates((tplRow as any).inspections as InspectionTemplate[]);
      }
    };
    load();
  }, [jobId]);

  const getInspectionStatus = (name: string): string => {
    const match = inspections.find(
      (i) => i.inspection_type?.toLowerCase() === name.toLowerCase() || i.phase_name?.toLowerCase() === name.toLowerCase()
    );
    return match?.result || "NOT_REQUESTED";
  };

  const canRequest = (tpl: InspectionTemplate): boolean => {
    if (!tpl.required_before) return true;
    const prereqStatus = getInspectionStatus(tpl.required_before);
    return prereqStatus === "PASS";
  };

  const requestInspection = async (tpl: InspectionTemplate) => {
    if (!canRequest(tpl)) {
      toast.error(`Cannot request "${tpl.name}" — "${tpl.required_before}" must pass first.`);
      return;
    }
    setRequesting(tpl.name);
    const { error } = await supabase.from("inspections").insert({
      job_id: jobId,
      inspection_type: tpl.type,
      phase_name: tpl.name,
      result: "PENDING",
      notes: tpl.notes || null,
      scheduled_date: null,
      action: "SCHEDULE",
    } as any);

    if (error) {
      toast.error("Failed to log inspection request");
    } else {
      // Notify Leo / office
      await supabase.from("notifications").insert({
        type: "inspection",
        title: `Inspection Requested: ${tpl.name}`,
        body: `Job ${jobId} — ${tpl.type} inspection requested. Contact AHJ to schedule.`,
        job_id: jobId,
        from_user: "Field",
        to_user: "Leo",
        priority: "normal",
        read: false,
      } as any);
      toast.success(`Inspection request logged: ${tpl.name}`);
    }
    setRequesting(null);
  };

  return (
    <div className="animate-fade-up">
      {/* Inspection sequence cards */}
      {templates.length > 0 && (
        <div className="mb-5">
          <Label className="mb-3">Required Inspections — {jobType.replace(/_/g, " ").toUpperCase()}</Label>
          <div className="grid gap-2">
            {templates.map((tpl, idx) => {
              const status = getInspectionStatus(tpl.name);
              const allowed = canRequest(tpl);
              const isPassed = status === "PASS";
              const isFailed = status === "FAIL";
              const isPending = status === "PENDING";

              return (
                <div
                  key={tpl.name}
                  className={`flex items-center gap-3 px-4 py-3 border ${
                    isPassed
                      ? "border-ok/30 bg-[rgba(46,204,113,0.04)]"
                      : isFailed
                      ? "border-danger/30 bg-[rgba(231,76,60,0.04)]"
                      : isPending
                      ? "border-gold/20 bg-[rgba(201,168,76,0.04)]"
                      : "border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.15)]"
                  }`}
                >
                  <div className="font-mono text-[11px] text-mil-muted w-5 flex-shrink-0">{idx + 1}</div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-cream">{tpl.name}</div>
                    <div className="text-[10px] text-mil-muted mt-[2px]">
                      {tpl.type}
                      {tpl.required_before && (
                        <span className="ml-2 text-warn">
                          — requires: {tpl.required_before}
                          {!allowed && " ⚠ blocked"}
                        </span>
                      )}
                    </div>
                    {tpl.notes && <div className="text-[10px] text-mil-muted italic mt-[2px]">{tpl.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {isPassed && <span className="font-raj text-[10px] font-bold text-ok">✓ PASS</span>}
                    {isFailed && <span className="font-raj text-[10px] font-bold text-danger">✗ FAIL</span>}
                    {isPending && <span className="font-raj text-[10px] font-bold text-warn animate-blink">● PENDING</span>}
                    {status === "NOT_REQUESTED" && (
                      <button
                        onClick={() => requestInspection(tpl)}
                        disabled={!allowed || requesting === tpl.name}
                        className={`px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] border cursor-pointer transition-all bg-transparent ${
                          allowed
                            ? "border-gold/30 text-gold hover:bg-[rgba(201,168,76,0.1)]"
                            : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.2)] cursor-not-allowed"
                        }`}
                      >
                        {requesting === tpl.name ? "REQUESTING..." : "REQUEST →"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historic inspection log */}
      <div className="flex items-center justify-between mb-[14px]">
        <Label>Inspection Log</Label>
        <button
          onClick={() => toast.info("Schedule inspection: call the city building department")}
          className="inline-flex items-center gap-[6px] px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] bg-transparent border border-gold/20 text-mil-muted hover:text-cream hover:border-gold transition-all cursor-pointer"
        >
          + SCHEDULE INSPECTION
        </button>
      </div>
      <div className="w-full overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["Phase", "Type", "Scheduled", "Result", "Notes", "Action"].map((h) => (
                <th key={h} className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase p-[8px_10px] text-left border-b border-[rgba(255,255,255,0.06)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inspections.length === 0 ? (
              <tr><td colSpan={6} className="text-mil-muted p-4 text-xs">No inspections logged yet.</td></tr>
            ) : (
              inspections.map((i) => (
                <tr key={i.id} className="hover:bg-[rgba(190,180,154,0.03)]">
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{i.phase_name || ""}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{i.inspection_type || ""}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{i.scheduled_date || ""}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">
                    <Pill variant={resultPill[i.result || "PENDING"] || "pending"}>{i.result || "PENDING"}</Pill>
                  </td>
                  <td className="p-[9px_10px] text-[11px] text-mil-muted border-b border-[rgba(255,255,255,0.03)]">{i.notes || ""}</td>
                  <td className="p-[9px_10px] border-b border-[rgba(255,255,255,0.03)]">
                    {i.action && (
                      <button
                        onClick={() => toast.info("Call city to schedule")}
                        className="px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] bg-transparent border border-gold/20 text-mil-muted hover:text-cream hover:border-gold transition-all cursor-pointer"
                      >
                        SCHEDULE
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InspectionsTab;
