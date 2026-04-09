import { useState } from "react";
import type { ChangeOrder } from "@/lib/types";
import { Pill, Label } from "../UIComponents";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ChangeOrdersTab = ({ changeOrders: initialCOs, jobId }: { changeOrders: ChangeOrder[]; jobId: string }) => {
  const [changeOrders, setChangeOrders] = useState(initialCOs);
  const [showForm, setShowForm] = useState(false);
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formStatus, setFormStatus] = useState("pending");
  const [saving, setSaving] = useState(false);
  const statusMap: Record<string, string> = { complete: "complete", pending: "warn", signed: "active" };

  const addCO = async () => {
    if (!formDesc.trim()) { toast.error("Description required"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("change_orders").insert({
      job_id: jobId,
      co_number: `CO-${Date.now()}`,
      description: formDesc.trim(),
      status: formStatus,
      days_pending: 0,
    }).select().single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    setChangeOrders((prev) => [...prev, data as any]);
    setFormDesc(""); setFormAmount(""); setFormStatus("pending");
    setShowForm(false);
    setSaving(false);
    toast.success("Change order added");
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-[14px]">
        <Label>Change order log with workflow status</Label>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-[6px] px-4 py-[7px] font-raj text-xs font-bold tracking-[1px] bg-gold text-[#1A1208] hover:bg-gold-light transition-all cursor-pointer border-none">
          {showForm ? "CANCEL" : "+ NEW CHANGE ORDER"}
        </button>
      </div>

      {showForm && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Description *</label>
              <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Scope change description..." className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40" />
            </div>
            <div>
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40">
                <option value="pending">Pending Client Signature</option>
                <option value="signed">Authorized</option>
              </select>
            </div>
          </div>
          <button onClick={addCO} disabled={saving} className="px-4 py-[7px] font-raj text-xs font-bold tracking-[1px] bg-gold text-[#1A1208] hover:bg-gold-light transition-all cursor-pointer border-none disabled:opacity-50">
            {saving ? "SAVING..." : "SAVE CHANGE ORDER"}
          </button>
        </div>
      )}

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
                  <td className="p-[9px_10px] text-xs text-gold border-b border-[rgba(255,255,255,0.03)]">{(co as any).co_number || ""}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{co.description || ""}</td>
                  <td className="p-[9px_10px] border-b border-[rgba(255,255,255,0.03)]"><Pill variant={statusMap[(co as any).status || "pending"] || "pending"}>{(co as any).status === "signed" ? "Authorized" : (co as any).status === "pending" ? "Pending Sig." : ((co as any).status || "pending").charAt(0).toUpperCase() + ((co as any).status || "pending").slice(1)}</Pill></td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{((co as any).days_pending || 0) > 0 ? `${(co as any).days_pending}d` : "-"}</td>
                  <td className="p-[9px_10px] border-b border-[rgba(255,255,255,0.03)]">
                    <button
                      onClick={() => {
                        const detail = `CO #${(co as any).co_number || "N/A"} | ${co.description || 'No description'} | Status: ${(co as any).status || 'pending'} | Days pending: ${(co as any).days_pending || 0}`;
                        toast.info(detail, { duration: 6000 });
                      }}
                      className="px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] bg-transparent border border-gold/20 text-mil-muted hover:text-cream hover:border-gold transition-all cursor-pointer">VIEW</button>
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
