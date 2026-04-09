import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job } from "@/lib/types";
import { SectionHeader, Panel, Btn, Label, StatCard } from "../UIComponents";
import { toast } from "sonner";

interface BillingItem {
  id: string; job_id: string; item_number: number | null; phase_name: string | null;
  description: string | null; contract_amount: number | null; total_paid: number | null;
  remaining_balance: number | null; this_invoice: number | null; status: string | null;
  invoice_number: string | null; sort_order: number | null;
}

const fmt = (n: number) => `$${n.toLocaleString()}`;
const pct = (paid: number, total: number) => total > 0 ? Math.round((paid / total) * 100) : 0;

const BillingHubTab = ({ job }: { job: Job }) => {
  const [items, setItems] = useState<BillingItem[]>([]);
  const [invoiceAmounts, setInvoiceAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("billing_items").select("*").eq("job_id", job.id).order("sort_order");
      const rows = (data || []) as BillingItem[];
      setItems(rows);
      const amounts: Record<string, number> = {};
      rows.forEach((r) => { amounts[r.id] = Number(r.this_invoice) || 0; });
      setInvoiceAmounts(amounts);
      setLoading(false);
    })();
  }, [job.id]);

  const phases = useMemo(() => {
    const map = new Map<string, BillingItem[]>();
    items.forEach((item) => { const phase = item.phase_name || "Other"; if (!map.has(phase)) map.set(phase, []); map.get(phase)!.push(item); });
    return Array.from(map.entries());
  }, [items]);

  const totalContract = items.reduce((s, i) => s + Number(i.contract_amount || 0), 0);
  const totalPaid = items.reduce((s, i) => s + Number(i.total_paid || 0), 0);
  const totalRemaining = totalContract - totalPaid;
  const totalThisInvoice = Object.values(invoiceAmounts).reduce((s, v) => s + v, 0);

  const handleInvoiceChange = (id: string, val: string) => { setInvoiceAmounts({ ...invoiceAmounts, [id]: Number(val) || 0 }); };

  const generateInvoice = async () => {
    const linesToBill = items.filter((i) => (invoiceAmounts[i.id] || 0) > 0);
    if (linesToBill.length === 0) { toast.error("No amounts entered"); return; }
    for (const item of linesToBill) {
      const amt = invoiceAmounts[item.id];
      const newPaid = Number(item.total_paid || 0) + amt;
      const newRemaining = Number(item.contract_amount || 0) - newPaid;
      await supabase.from("billing_items").update({ total_paid: newPaid, remaining_balance: newRemaining, this_invoice: 0, status: newRemaining <= 0 ? "complete" : "in_progress" }).eq("id", item.id);
    }
    toast.success(`Invoice generated: ${fmt(totalThisInvoice)}`);
    const { data } = await supabase.from("billing_items").select("*").eq("job_id", job.id).order("sort_order");
    const rows = (data || []) as BillingItem[];
    setItems(rows);
    const amounts: Record<string, number> = {};
    rows.forEach((r) => { amounts[r.id] = 0; });
    setInvoiceAmounts(amounts);
  };

  if (loading) return <div className="text-mil-muted p-5">Loading billing data...</div>;
  if (items.length === 0) return <div className="text-mil-muted p-5">No billing items for this job.</div>;

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-5 max-md:grid-cols-2">
        <StatCard label="Contract Total" value={fmt(totalContract)} color="text-info" />
        <StatCard label="Total Billed" value={fmt(totalPaid)} color="text-ok" />
        <StatCard label="Remaining" value={fmt(totalRemaining)} color="text-warn" />
        <StatCard label="This Invoice" value={fmt(totalThisInvoice)} color="text-gold" />
      </div>
      <Panel>
        <div className="flex items-center gap-3 mb-2"><Label>Billing Progress</Label><span className="font-mono text-[11px] text-ok font-bold">{pct(totalPaid, totalContract)}%</span></div>
        <div className="h-[10px] bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.07)] overflow-hidden">
          <div className="h-full transition-all duration-700" style={{ width: `${pct(totalPaid, totalContract)}%`, background: "linear-gradient(90deg, var(--ok), var(--gold))" }} />
        </div>
      </Panel>
      <SectionHeader label="BILLING SHEET"><Btn variant="green" size="sm" onClick={generateInvoice}>⚡ GENERATE INVOICE</Btn></SectionHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead><tr className="text-left">
            {["#","Description","Contract","Paid","Remaining","This Invoice","Status"].map(h => (
              <th key={h} className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase px-2 py-2 border-b border-[rgba(255,255,255,0.05)]">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {phases.map(([phase, phaseItems]) => (
              <React.Fragment key={phase}>
                <tr className="bg-[rgba(201,168,76,0.06)]"><td colSpan={2} className="font-raj text-[10px] tracking-[2px] text-gold font-bold px-2 py-[6px] uppercase">{phase}</td><td colSpan={5}></td></tr>
                {phaseItems.map((item) => {
                  const remaining = Number(item.contract_amount || 0) - Number(item.total_paid || 0);
                  return (
                    <tr key={item.id} className="border-b border-[rgba(255,255,255,0.03)]">
                      <td className="px-2 py-[5px] font-mono text-mil-muted">{item.item_number}</td>
                      <td className="px-2 py-[5px] text-cream">{item.description}</td>
                      <td className="px-2 py-[5px] text-right font-mono text-info">{fmt(Number(item.contract_amount || 0))}</td>
                      <td className="px-2 py-[5px] text-right font-mono text-ok">{fmt(Number(item.total_paid || 0))}</td>
                      <td className="px-2 py-[5px] text-right font-mono text-mil-muted">{fmt(remaining)}</td>
                      <td className="px-2 py-[5px] text-right">
                        {item.status !== "complete" ? (
                          <input type="number" min={0} max={remaining} value={invoiceAmounts[item.id] || ""} onChange={(e) => handleInvoiceChange(item.id, e.target.value)} className="w-[90px] bg-[rgba(201,168,76,0.08)] border border-gold/20 text-gold font-mono text-[11px] px-2 py-1 text-right outline-none focus:border-gold" placeholder="$0" />
                        ) : <span className="font-mono text-[10px] text-mil-muted">—</span>}
                      </td>
                      <td className={`px-2 py-[5px] font-raj text-[9px] tracking-[1px] uppercase font-bold ${item.status === "complete" ? "text-ok" : "text-mil-muted"}`}>{item.status?.replace("_", " ")}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BillingHubTab;
