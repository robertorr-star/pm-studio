import type { ChangeOrder } from "@/lib/types";
import { Pill, Label } from "../UIComponents";
import { toast } from "sonner";

const ChangeOrdersTab = ({ changeOrders }: { changeOrders: ChangeOrder[] }) => {
  const statusMap: Record<string, string> = { complete: "complete", pending: "warn", signed: "active" };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-[14px]">
        <Label>Change order log with workflow status</Label>
        <button onClick={() => toast.info("New CO: document scope, get client signature before work")} className="inline-flex items-center gap-[6px] px-4 py-[7px] font-raj text-xs font-bold tracking-[1px] bg-gold text-[#1A1208] hover:bg-gold-light transition-all cursor-pointer border-none">
          + NEW CHANGE ORDER
        </button>
      </div>

      <div className="flex items-center gap-1 mb-[18px] overflow-x-auto pb-1">
        {["Identified", "Written", "Client Signs", "Work Authorized", "Invoice Triggered"].map((step, i) => (
          <div key={step} className="flex items-center gap-1 whitespace-nowrap flex-shrink-0">
            {i > 0 && <span className="text-[10px] text-mil-muted mx-1">→</span>}
            <div className={`w-[10px] h-[10px] rounded-full border-2 ${
              i < 2 ? "bg-ok border-ok" : i === 2 ? "bg-gold border-gold animate-blink" : "bg-transparent border-mil-muted"
            }`} />
            <span className="text-[10px] text-mil-muted">{step}</span>
          </div>
        ))}
      </div>

      <div className="w-full overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["#", "Description", "Status", "Days Pending", "Action"].map((h) => (
                <th key={h} className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase p-[8px_10px] text-left border-b border-[rgba(255,255,255,0.06)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {changeOrders.length === 0 ? (
              <tr><td colSpan={5} className="text-mil-muted p-4">No change orders.</td></tr>
            ) : (
              changeOrders.map((co) => (
                <tr key={co.id} className="hover:bg-[rgba(190,180,154,0.03)]">
                  <td className="p-[9px_10px] text-xs text-gold border-b border-[rgba(255,255,255,0.03)]">{co.co_number || ""}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{co.description || ""}</td>
                  <td className="p-[9px_10px] border-b border-[rgba(255,255,255,0.03)]"><Pill variant={statusMap[co.status || "pending"] || "pending"}>{co.status === "signed" ? "Authorized" : co.status === "pending" ? "Pending Sig." : (co.status || "pending").charAt(0).toUpperCase() + (co.status || "pending").slice(1)}</Pill></td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{(co.days_pending || 0) > 0 ? `${co.days_pending}d` : "-"}</td>
                  <td className="p-[9px_10px] border-b border-[rgba(255,255,255,0.03)]">
                    <button className="px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] bg-transparent border border-gold/20 text-mil-muted hover:text-cream hover:border-gold transition-all cursor-pointer">VIEW</button>
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

export default ChangeOrdersTab;
