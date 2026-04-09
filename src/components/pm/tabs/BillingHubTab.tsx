import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job } from "@/lib/types";
import { SectionHeader, Btn, Label, StatCard, Pill } from "../UIComponents";
import { toast } from "sonner";

interface BillingItem {
  id: string; job_id: string; item_number: number | null;
  phase_name: string | null; description: string | null;
  contract_amount: number | null; total_paid: number | null;
  remaining_balance: number | null; this_invoice: number | null;
  status: string | null; invoice_number: string | null; sort_order: number | null;
}

interface Invoice {
  id: string; invoice_number: string; invoice_date: string;
  total: number; status: string; client_email: string | null;
  sent_at: string | null; paid_at: string | null; void_reason: string | null;
  line_items: any;
}

const fmt$ = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS: Record<string, string> = {
  draft: "pending", sent: "info", viewed: "warn",
  paid: "complete", void: "overdue", disputed: "overdue", partial_paid: "gold"
};

const BillingHubTab = ({ job }: { job: Job }) => {
  const [items, setItems] = useState<BillingItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceAmounts, setInvoiceAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [clientEmail, setClientEmail] = useState((job as any).client_email || "");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const loadData = async () => {
    const [itemsRes, invoicesRes] = await Promise.all([
      supabase.from("billing_items").select("*").eq("job_id", job.id).order("sort_order"),
      supabase.from("invoices").select("*").eq("job_id", job.id).order("created_at", { ascending: false }),
    ]);
    const rows = (itemsRes.data || []) as BillingItem[];
    setItems(rows);
    setInvoices((invoicesRes.data || []) as Invoice[]);
    const amounts: Record<string, number> = {};
    rows.forEach(r => { amounts[r.id] = 0; });
    setInvoiceAmounts(amounts);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [job.id]);

  const saveClientEmail = async (email: string) => {
    setClientEmail(email);
    await supabase.from("jobs").update({ client_email: email } as any).eq("id", job.id);
  };

  const totalContract = items.reduce((s, i) => s + Number(i.contract_amount || 0), 0);
  const totalPaid = items.reduce((s, i) => s + Number(i.total_paid || 0), 0);
  const totalRemaining = totalContract - totalPaid;
  const totalThisInvoice = Object.values(invoiceAmounts).reduce((s, v) => s + v, 0);
  const linesToBill = items.filter(i => (invoiceAmounts[i.id] || 0) > 0);

  const handleGenerate = () => {
    if (linesToBill.length === 0) { toast.error("No amounts entered"); return; }
    if (totalThisInvoice <= 0) { toast.error("Invoice total must be greater than $0"); return; }
    setShowConfirm(true);
  };

  const sendInvoice = async () => {
    if (!clientEmail.trim()) { toast.error("Enter a client email address first"); return; }
    setSending(true);
    const { data: numData } = await supabase.rpc("next_invoice_number");
    const invoiceNumber = numData || ("INV-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4));
    const lineItems = linesToBill.map(item => ({
      billing_item_id: item.id, description: item.description || item.phase_name,
      contract_amount: item.contract_amount, paid_to_date: item.total_paid,
      this_invoice: invoiceAmounts[item.id],
    }));
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const { data: inv, error: invErr } = await supabase.from("invoices").insert({
      invoice_number: invoiceNumber, job_id: job.id, job_name: job.name,
      client_name: job.client_name, client_email: clientEmail,
      project_address: (job as any).address, invoice_date: new Date().toISOString().split("T")[0],
      due_date: dueDate.toISOString().split("T")[0], subtotal: totalThisInvoice,
      total: totalThisInvoice, balance_due: totalThisInvoice, status: "sent",
      sent_at: new Date().toISOString(), qbo_sync_status: "pending",
      line_items: lineItems, created_by: "Sonny",
    } as any).select().single();
    if (invErr) { toast.error("Failed to create invoice: " + invErr.message); setSending(false); return; }
    for (const item of linesToBill) {
      const amt = invoiceAmounts[item.id];
      const newPaid = Number(item.total_paid || 0) + amt;
      const newRemaining = Number(item.contract_amount || 0) - newPaid;
      await supabase.from("billing_items").update({
        total_paid: newPaid, remaining_balance: newRemaining, invoice_number: invoiceNumber,
        this_invoice: 0, status: newRemaining <= 0 ? "complete" : "in_progress",
      }).eq("id", item.id);
    }
    await supabase.from("jobs").update({ contract_remaining: Math.max(0, totalRemaining - totalThisInvoice) } as any).eq("id", job.id);
    await supabase.from("notifications").insert({
      type: "invoice_generated", title: `Invoice sent: ${invoiceNumber}`,
      body: `${fmt$(totalThisInvoice)} — ${job.name} — ${clientEmail}`,
      job_id: job.id, job_name: job.name, from_user: "Sonny", to_user: "Andy", priority: "normal",
      action_data: { invoice_id: inv.id, invoice_number: invoiceNumber },
    });
    setSending(false);
    setShowConfirm(false);
    await loadData();
    toast.success(`Invoice ${invoiceNumber} sent to ${clientEmail}`);
  };

  const voidInvoice = async () => {
    if (!voidTarget || !voidReason.trim()) { toast.error("Void reason required"); return; }
    await supabase.from("invoices").update({
      status: "void", voided_at: new Date().toISOString(),
      void_reason: voidReason, void_by: "Sonny", qbo_sync_status: "void_pending",
    } as any).eq("id", voidTarget.id);
    await supabase.from("notifications").insert({
      type: "general", title: `Invoice VOIDED: ${voidTarget.invoice_number}`,
      body: `Reason: ${voidReason}`, job_id: job.id, job_name: job.name,
      from_user: "Sonny", to_user: "Andy", priority: "urgent",
    });
    setVoidTarget(null);
    setVoidReason("");
    await loadData();
    toast.success("Invoice voided — QBO sync queued");
  };

  const printSov = () => {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    const rows = items.map((item, i) => {
      const paid = Number(item.total_paid || 0);
      const contract = Number(item.contract_amount || 0);
      const remaining = contract - paid;
      const remPct = contract > 0 ? ((remaining / contract) * 100).toFixed(0) + "%" : "0%";
      return `<tr style="border-bottom:1px solid #e0e0e0;${i % 2 === 0 ? "" : "background:#fafaf8"}">
        <td style="padding:5px 8px;font-size:11px;text-align:center">${item.item_number || i + 1}</td>
        <td style="padding:5px 8px;font-size:11px">${item.description || item.phase_name}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:bold">${fmt$(contract)}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:right">${fmt$(paid)}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:right">${fmt$(Number(item.this_invoice || 0))}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:center">${item.invoice_number || "—"}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:right">${remPct}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:bold">${fmt$(remaining)}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SOV — ${job.name}</title>
<style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px}table{width:100%;border-collapse:collapse}
thead tr{background:#1B4D1B;color:#C9A84C}thead th{padding:7px 8px;font-size:10px;text-align:center;font-weight:bold;letter-spacing:.05em;text-transform:uppercase}
.total-row{background:#1B4D1B;color:#C9A84C;font-weight:bold}.total-row td{padding:7px 8px}
.grand-total{background:#0f2f0f;color:#C9A84C;font-weight:bold}.grand-total td{padding:8px}
@media print{.no-print{display:none}}</style></head><body>
<div style="display:flex;justify-content:space-between;margin-bottom:12px">
  <div><div style="font-weight:bold;font-size:14px">ORR CONSTRUCTION COMPANY</div>
  <div style="font-size:10px;color:#555">1977 Obispo Ave · Signal Hill CA 90755 · (562) 498-0224 · License #1028720</div></div>
  <div style="text-align:right;font-size:10px;color:#555"><div>Date: ${today}</div></div>
</div>
<table style="border:1px solid #1B4D1B;margin-bottom:8px"><tr><td style="padding:6px 10px;font-weight:bold">${job.name}</td><td style="padding:6px 10px;text-align:right">${(job as any).address || ""}</td></tr></table>
<table><thead><tr>
  <th>A<br><span style="font-weight:normal;font-size:8px">ITEM</span></th>
  <th style="text-align:left">B<br><span style="font-weight:normal;font-size:8px">DESCRIPTION</span></th>
  <th>C<br><span style="font-weight:normal;font-size:8px">CONTRACT</span></th>
  <th>D<br><span style="font-weight:normal;font-size:8px">TOTAL PAID</span></th>
  <th>E<br><span style="font-weight:normal;font-size:8px">THIS INVOICE</span></th>
  <th>F<br><span style="font-weight:normal;font-size:8px">INV #</span></th>
  <th>G<br><span style="font-weight:normal;font-size:8px">REM %</span></th>
  <th>H<br><span style="font-weight:normal;font-size:8px">BALANCE</span></th>
</tr></thead><tbody>
${rows}
<tr class="total-row"><td colspan="2" style="text-align:right;padding:7px 8px">CONTRACT TOTAL</td><td style="text-align:right;padding:7px 8px">${fmt$(totalContract)}</td><td style="text-align:right;padding:7px 8px">${fmt$(totalPaid)}</td><td colspan="4"></td></tr>
<tr class="grand-total"><td colspan="2" style="text-align:right;padding:8px">PROJECT TOTAL</td><td style="text-align:right;padding:8px">${fmt$(totalContract)}</td><td style="text-align:right;padding:8px">${fmt$(totalPaid)}</td><td style="text-align:right;padding:8px">$0.00</td><td style="text-align:center;padding:8px">—</td><td style="text-align:right;padding:8px">${totalContract > 0 ? ((totalPaid / totalContract) * 100).toFixed(0) : 0}%</td><td style="text-align:right;padding:8px">${fmt$(totalContract - totalPaid)}</td></tr>
</tbody></table>
<button class="no-print" onclick="window.print()" style="margin-top:24px;padding:8px 20px;background:#1B4D1B;color:#C9A84C;border:none;font-weight:bold;cursor:pointer">PRINT / SAVE PDF</button>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  if (loading) return <div className="text-mil-muted p-5">Loading billing data...</div>;
  if (items.length === 0) return <div className="text-mil-muted p-5">No billing items yet — create an estimate and convert to project first.</div>;

  return (
    <div>
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "64px" }} onClick={() => setShowConfirm(false)}>
          <div style={{ background: "var(--ink)", border: "2px solid var(--warn)", padding: "24px", width: "460px", maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div className="font-raj text-warn text-sm font-bold tracking-wider mb-4">WAIT — REVIEW BEFORE SENDING</div>
            <div className="mb-4">
              <div className="text-[11px] text-mil-muted font-raj tracking-wider uppercase mb-2">Invoice Summary</div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs text-cream">{job.name}</span>
                <span className="font-mono text-gold font-bold">{fmt$(totalThisInvoice)}</span>
              </div>
              <div className="text-[10px] text-mil-muted">{linesToBill.length} billing item{linesToBill.length !== 1 ? "s" : ""} · Due in 2 business days</div>
            </div>
            <div className="mb-4">
              <div className="text-[11px] text-mil-muted font-raj tracking-wider uppercase mb-1">Line Items</div>
              {linesToBill.map(item => (
                <div key={item.id} className="flex justify-between py-1">
                  <span className="text-xs text-cream">{item.description || item.phase_name}</span>
                  <span className="font-mono text-[11px] text-info">{fmt$(invoiceAmounts[item.id])}</span>
                </div>
              ))}
            </div>
            <div className="mb-5">
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Send to (client email) *</label>
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" className="w-full bg-ink border border-gold/30 text-cream text-xs px-3 py-2 outline-none focus:border-gold" />
            </div>
            <div className="mb-4 bg-[rgba(243,156,18,0.08)] border border-warn/20 p-3">
              <div className="text-[10px] text-warn font-raj font-bold mb-1">CHECKLIST BEFORE SENDING</div>
              <div className="text-[10px] text-cream space-y-1">
                <div>✓ Work described is actually complete</div>
                <div>✓ Amounts match what the team agreed</div>
                <div>✓ Client email address is correct</div>
                <div>✓ This is not a duplicate invoice</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={sendInvoice} disabled={sending || !clientEmail.trim()} className="flex-1 bg-ok/10 border border-ok/30 text-ok font-raj text-[11px] font-bold tracking-wider py-2 cursor-pointer hover:bg-ok/20 transition-all disabled:opacity-40">
                {sending ? "SENDING..." : "YES — SEND INVOICE"}
              </button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-transparent border border-[rgba(255,255,255,0.1)] text-mil-muted font-raj text-[11px] font-bold tracking-wider py-2 cursor-pointer hover:text-cream transition-all">
                NOT READY — GO BACK
              </button>
            </div>
          </div>
        </div>
      )}

      {voidTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "64px" }} onClick={() => setVoidTarget(null)}>
          <div style={{ background: "var(--ink)", border: "2px solid var(--danger)", padding: "24px", width: "400px", maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div className="font-raj text-danger text-sm font-bold tracking-wider mb-3">VOID INVOICE {voidTarget.invoice_number}</div>
            <div className="text-xs text-cream mb-4">Amount: {fmt$(voidTarget.total)} · Status: {voidTarget.status}</div>
            <div className="mb-4">
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Void Reason *</label>
              <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3} placeholder="Describe why this invoice is being voided..." className="w-full bg-ink border border-danger/30 text-cream text-xs px-3 py-2 outline-none resize-none focus:border-danger" />
            </div>
            <div className="flex gap-3">
              <button onClick={voidInvoice} className="flex-1 bg-danger/10 border border-danger/30 text-danger font-raj text-[11px] font-bold tracking-wider py-2 cursor-pointer hover:bg-danger/20 transition-all">CONFIRM VOID</button>
              <button onClick={() => setVoidTarget(null)} className="flex-1 bg-transparent border border-[rgba(255,255,255,0.1)] text-mil-muted font-raj text-[11px] py-2 cursor-pointer">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-5 max-md:grid-cols-2">
        <StatCard label="Contract Total" value={fmt$(totalContract)} color="text-info" />
        <StatCard label="Total Billed" value={fmt$(totalPaid)} color="text-ok" />
        <StatCard label="Remaining" value={fmt$(totalRemaining)} color="text-warn" />
        <StatCard label="This Invoice" value={fmt$(totalThisInvoice)} color="text-gold" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <SectionHeader label="BILLING SHEET" />
        <Btn variant="ghost" size="sm" onClick={printSov}>PRINT SOV</Btn>
        <Btn variant="green" size="sm" onClick={handleGenerate}>GENERATE INVOICE</Btn>
      </div>

      {clientEmail ? (
        <div className="flex items-center gap-3 mb-3 p-2 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)]">
          <span className="text-[9px] text-mil-muted font-raj tracking-wider uppercase whitespace-nowrap">Client Email:</span>
          <span className="text-xs text-ok flex-1">{clientEmail}</span>
          <button
            onClick={() => {
              const newEmail = prompt("Update client email:", clientEmail);
              if (newEmail && newEmail !== clientEmail) saveClientEmail(newEmail);
            }}
            className="text-[9px] font-raj text-mil-muted hover:text-gold cursor-pointer bg-transparent border-none"
          >
            EDIT
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-3 p-2 bg-[rgba(196,56,40,0.06)] border border-danger/20">
          <span className="text-[9px] text-mil-muted font-raj tracking-wider uppercase whitespace-nowrap">Client Email:</span>
          <input
            value={clientEmail}
            onChange={e => setClientEmail(e.target.value)}
            onBlur={e => { if (e.target.value) saveClientEmail(e.target.value); }}
            placeholder="Not set — enter email or update in Estimating Studio"
            className="flex-1 bg-transparent border-none text-cream text-xs outline-none placeholder:text-danger/60"
          />
          <span className="text-[9px] text-danger font-raj">REQUIRED TO SEND</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["#", "Description", "Contract", "Paid", "Remaining", "This Invoice", "Status"].map(h => (
                <th key={h} className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase px-2 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const remaining = Number(item.contract_amount || 0) - Number(item.total_paid || 0);
              const isComplete = item.status === "complete";
              return (
                <tr key={item.id}>
                  <td className="px-2 py-[5px] font-mono text-mil-muted">{item.item_number}</td>
                  <td className="px-2 py-[5px] text-cream">{item.description}</td>
                  <td className="px-2 py-[5px] text-right font-mono text-info">{fmt$(Number(item.contract_amount || 0))}</td>
                  <td className="px-2 py-[5px] text-right font-mono text-ok">{fmt$(Number(item.total_paid || 0))}</td>
                  <td className="px-2 py-[5px] text-right font-mono text-mil-muted">{fmt$(remaining)}</td>
                  <td className="px-2 py-[5px] text-right">
                    {!isComplete ? (
                      <input type="number" min={0} max={remaining} value={invoiceAmounts[item.id] || ""} onChange={e => setInvoiceAmounts({ ...invoiceAmounts, [item.id]: Number(e.target.value) || 0 })} className="w-[90px] bg-[rgba(201,168,76,0.08)] border border-gold/20 text-gold font-mono text-[11px] px-2 py-1 text-right outline-none focus:border-gold" placeholder="$0" />
                    ) : <span className="text-ok text-[10px] font-raj">PAID</span>}
                  </td>
                  <td className="px-2 py-[5px]">
                    <span className={`font-raj text-[9px] uppercase font-bold ${isComplete ? "text-ok" : remaining <= 0.01 ? "text-ok" : "text-mil-muted"}`}>
                      {item.status?.replace("_", " ") || "not started"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {invoices.length > 0 && (
        <div className="mt-6">
          <Label>Invoice History</Label>
          <div className="space-y-2 mt-2">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-3 py-2 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-cream">{inv.invoice_number}</span>
                    <Pill variant={STATUS_COLORS[inv.status] || "pending"}>{inv.status.replace("_", " ").toUpperCase()}</Pill>
                  </div>
                  <div className="text-[10px] text-mil-muted mt-[2px]">
                    {new Date(inv.invoice_date).toLocaleDateString()} · {inv.client_email}
                    {inv.void_reason && <span className="text-danger ml-2">Void: {inv.void_reason}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-gold font-bold">{fmt$(inv.total)}</span>
                  {["sent", "viewed", "disputed"].includes(inv.status) && (
                    <button onClick={() => setVoidTarget(inv)} className="text-[9px] font-raj text-danger border border-danger/20 px-2 py-0.5 cursor-pointer hover:bg-danger/10 bg-transparent">VOID</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingHubTab;
