import type { Inspection } from "@/lib/types";
import { Pill, Label } from "../UIComponents";
import { toast } from "sonner";

const InspectionsTab = ({ inspections }: { inspections: Inspection[] }) => {
  const resultPill: Record<string, string> = { PASS: "pass", FAIL: "fail", PENDING: "pending" };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-[14px]">
        <Label>Phase inspection schedule</Label>
        <button onClick={() => toast.info("Schedule inspection: call the city building department")} className="inline-flex items-center gap-[6px] px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] bg-transparent border border-gold/20 text-mil-muted hover:text-cream hover:border-gold transition-all cursor-pointer">
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
              <tr><td colSpan={6} className="text-mil-muted p-4">No inspections logged.</td></tr>
            ) : (
              inspections.map((i) => (
                <tr key={i.id} className="hover:bg-[rgba(190,180,154,0.03)]">
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{i.phase_name || ""}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{i.inspection_type || ""}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{i.scheduled_date || ""}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]"><Pill variant={resultPill[i.result || "PENDING"] || "pending"}>{i.result || "PENDING"}</Pill></td>
                  <td className="p-[9px_10px] text-[11px] text-mil-muted border-b border-[rgba(255,255,255,0.03)]">{i.notes || ""}</td>
                  <td className="p-[9px_10px] border-b border-[rgba(255,255,255,0.03)]">
                    {i.action && (
                      <button onClick={() => toast.info("Call city to schedule")} className="px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] bg-transparent border border-gold/20 text-mil-muted hover:text-cream hover:border-gold transition-all cursor-pointer">
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
