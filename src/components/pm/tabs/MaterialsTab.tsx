import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Material } from "@/lib/types";
import { Btn, Label, Pill, SectionHeader } from "../UIComponents";
import { toast } from "sonner";

const STATUS_ORDER = ["not_ordered", "requested", "ordered", "delivered", "installed"] as const;
const STATUS_LABELS: Record<string, string> = {
  not_ordered: "NOT ORDERED", requested: "REQUESTED",
  ordered: "ORDERED", delivered: "DELIVERED", installed: "INSTALLED"
};
const STATUS_VARIANT: Record<string, string> = {
  not_ordered: "overdue", requested: "pending",
  ordered: "info", delivered: "complete", installed: "teal"
};

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

const getBurnGrade = (burnPct: number, completionPct: number): { grade: string; color: string } => {
  if (burnPct === 0 && completionPct === 0) return { grade: "—", color: "var(--mil-muted)" };
  if (completionPct === 0 && burnPct > 0) return { grade: "F", color: "var(--danger)" };
  const ratio = burnPct / Math.max(completionPct, 1);
  if (ratio <= 1.0) return { grade: "A", color: "var(--ok)" };
  if (ratio <= 1.15) return { grade: "B", color: "var(--ok)" };
  if (ratio <= 1.35) return { grade: "C", color: "var(--warn)" };
  if (ratio <= 1.6) return { grade: "D", color: "var(--danger)" };
  return { grade: "F", color: "var(--danger)" };
};

interface EstLineItem {
  id: string;
  description: string | null;
  cost_type: string | null;
  quantity: number | null;
  unit: string | null;
  unit_cost: number | null;
  line_item_total: number | null;
  trade_group: string | null;
  phase_name: string | null;
}

const MaterialsTab = ({ materials: _propMaterials, jobId }: { materials: Material[]; jobId: string }) => {
  const [estimateItems, setEstimateItems] = useState<EstLineItem[]>([]);
  const [fieldMats, setFieldMats] = useState<Material[]>([]);
  const [phases, setPhases] = useState<{ trade: string | null; phase_pct: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [collapsedTrades, setCollapsedTrades] = useState<Set<string>>(new Set());
  const [showFieldAdd, setShowFieldAdd] = useState(false);
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("each");
  const [supplier, setSupplier] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [fieldNotes, setFieldNotes] = useState("");
  const [addingField, setAddingField] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: estData } = await supabase.from("estimates").select("id").eq("job_id", jobId).single();
      if (estData?.id) {
        const { data: lineItems } = await supabase
          .from("estimate_line_items")
          .select("id, description, cost_type, quantity, unit, unit_cost, line_item_total, trade_group, phase_name")
          .eq("estimate_id", estData.id)
          .in("cost_type", ["Materials", "Equipment", "Subcontract"]);
        setEstimateItems(lineItems || []);
      }
      const { data: mats } = await supabase.from("materials").select("*").eq("job_id", jobId).order("sort_order");
      setFieldMats((mats || []) as Material[]);
      const { data: phaseData } = await supabase.from("phases").select("trade, phase_pct").eq("job_id", jobId);
      setPhases(phaseData || []);
      setLoading(false);
    };
    load();
  }, [jobId]);

  const byTrade = useMemo(() => {
    const groups: Record<string, EstLineItem[]> = {};
    estimateItems.forEach((item) => {
      const trade = item.trade_group || item.phase_name || "General";
      if (!groups[trade]) groups[trade] = [];
      groups[trade].push(item);
    });
    return groups;
  }, [estimateItems]);

  const orderedByTrade = useMemo(() => {
    const totals: Record<string, number> = {};
    fieldMats.forEach((m) => {
      if (["ordered", "delivered", "installed"].includes((m as any).status || "")) {
        const trade = (m as any).trade || "General";
        totals[trade] = (totals[trade] || 0) + (Number((m as any).unit_cost || 0) * Number((m as any).quantity || 0));
      }
    });
    return totals;
  }, [fieldMats]);

  const completionByTrade = useMemo(() => {
    const map: Record<string, number> = {};
    phases.forEach((p) => { if (p.trade) map[p.trade] = p.phase_pct || 0; });
    return map;
  }, [phases]);

  const requestMaterial = async (item: EstLineItem) => {
    setRequestingId(item.id);
    const { error: matErr } = await supabase.from("materials").insert({
      job_id: jobId, item_name: item.description || "Unknown item",
      qty: String(item.quantity || 1), quantity: item.quantity || 1,
      unit: item.unit || "each", unit_cost: item.unit_cost || 0,
      trade: item.trade_group || null, phase_name: item.phase_name || null,
      status: "requested", source: "estimate_request", priority: "Normal", added_by: "Leo",
    } as any);
    if (matErr) { toast.error("Request failed"); setRequestingId(null); return; }
    await supabase.from("notifications").insert([
      { type: "material_request", title: `Material request: ${item.description}`, body: `${item.quantity} ${item.unit} needed · Trade: ${item.trade_group || "General"} · Est. cost: ${fmt((item.unit_cost || 0) * (item.quantity || 1))}`, job_id: jobId, from_user: "Leo", to_user: "Sonny", priority: "normal" },
      { type: "material_request", title: `Material request: ${item.description}`, body: `${item.quantity} ${item.unit} needed · Trade: ${item.trade_group || "General"}`, job_id: jobId, from_user: "Leo", to_user: "Arnel", priority: "normal" },
    ]);
    const { data: mats } = await supabase.from("materials").select("*").eq("job_id", jobId);
    setFieldMats((mats || []) as Material[]);
    setRequestingId(null);
    toast.success(`Requested: ${item.description} — Sonny and Arnel notified`);
  };

  const addFieldMaterial = async () => {
    if (!itemName.trim() || !qty) { toast.error("Item name and quantity required"); return; }
    setAddingField(true);
    const { data, error } = await supabase.from("materials").insert({
      job_id: jobId, item_name: itemName.trim(), qty, quantity: parseFloat(qty),
      unit, supplier: supplier || null, status: "not_ordered", source: "field_add",
      priority, needed_by: neededBy || null, added_by: "Leo", notes: fieldNotes || null,
    } as any).select().single();
    if (error) { toast.error(error.message); setAddingField(false); return; }
    setFieldMats((prev) => [...prev, data as any]);
    setItemName(""); setQty(""); setSupplier(""); setNeededBy(""); setFieldNotes(""); setPriority("Normal");
    setAddingField(false); setShowFieldAdd(false);
    toast.success(`${itemName} added`);
  };

  const cycleStatus = async (m: Material) => {
    const st = (m as any).status || "not_ordered";
    const idx = STATUS_ORDER.indexOf(st as any);
    const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
    await supabase.from("materials").update({ status: next } as any).eq("id", m.id);
    setFieldMats((prev) => prev.map((fm) => fm.id === m.id ? { ...fm, status: next } as any : fm));
    toast.success(`${m.item_name} → ${STATUS_LABELS[next]}`);
  };

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" /></div>;

  const tradeList = Object.entries(byTrade);
  const totalEstimated = estimateItems.reduce((s, i) => s + (i.line_item_total || 0), 0);
  const totalOrdered = Object.values(orderedByTrade).reduce((s, v) => s + v, 0);

  return (
    <div className="animate-fade-up space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-cream">{fmt(totalEstimated)}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Estimated Materials</div>
        </div>
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-info">{fmt(totalOrdered)}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Committed / Ordered</div>
        </div>
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-ok">{totalEstimated > 0 ? pct(totalOrdered, totalEstimated) : 0}%</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Budget Consumed</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-raj text-sm font-bold text-gold tracking-wider uppercase">Estimated Materials by Trade</div>
          {estimateItems.length === 0 && <span className="text-[10px] text-warn font-raj">No estimate linked to this job yet</span>}
        </div>
        {tradeList.map(([trade, items]) => {
          const estTotal = items.reduce((s, i) => s + (i.line_item_total || 0), 0);
          const ordTotal = orderedByTrade[trade] || 0;
          const burnPct = pct(ordTotal, estTotal);
          const completionPct = completionByTrade[trade] || 0;
          const { grade, color } = getBurnGrade(burnPct, completionPct);
          const isCollapsed = collapsedTrades.has(trade);
          const requestedFromTrade = fieldMats.filter((m) => (m as any).trade === trade && (m as any).source === "estimate_request");
          return (
            <div key={trade} className="mb-3 border border-[rgba(255,255,255,0.05)]">
              <button onClick={() => setCollapsedTrades((prev) => { const n = new Set(prev); n.has(trade) ? n.delete(trade) : n.add(trade); return n; })} className="flex items-center justify-between w-full px-3 py-2 bg-[rgba(0,0,0,0.25)] cursor-pointer hover:bg-[rgba(0,0,0,0.35)] transition-all">
                <div className="flex items-center gap-3">
                  <span className="font-raj text-[13px] font-bold text-cream">{isCollapsed ? "▸" : "▾"} {trade}</span>
                  <span className="text-[10px] text-mil-muted">{items.length} items · {fmt(estTotal)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-[120px]">
                    <div className="flex-1 h-[6px] bg-[rgba(255,255,255,0.08)] relative overflow-visible">
                      <div style={{ position: "absolute", left: `${Math.min(completionPct, 100)}%`, top: "-3px", width: "2px", height: "12px", background: "rgba(255,255,255,0.3)", zIndex: 2 }} />
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(burnPct, 100)}%`, background: burnPct > 100 ? "var(--danger)" : burnPct > completionPct * 1.15 ? "var(--warn)" : "var(--ok)" }} />
                    </div>
                    <span className="font-mono text-[10px]" style={{ color }}>{burnPct}%</span>
                  </div>
                  <div className="font-raj text-[13px] font-bold w-[20px] text-center" style={{ color }}>{grade}</div>
                </div>
              </button>
              {!isCollapsed && (
                <div>
                  {items.map((item) => {
                    const alreadyRequested = requestedFromTrade.some((m) => m.item_name === item.description);
                    return (
                      <div key={item.id} className="flex items-center justify-between px-3 py-[8px] hover:bg-[rgba(190,180,154,0.03)]">
                        <div className="flex-1">
                          <div className="text-xs text-cream">{item.description}</div>
                          <div className="text-[10px] text-mil-muted">{item.quantity} {item.unit} · {fmt(item.unit_cost || 0)}/unit · {fmt(item.line_item_total || 0)} total</div>
                        </div>
                        <div className="text-[10px] text-mil-muted mx-3 font-raj">{item.cost_type}</div>
                        {alreadyRequested ? (
                          <Pill variant="pending">REQUESTED</Pill>
                        ) : (
                          <button onClick={() => requestMaterial(item)} disabled={requestingId === item.id} className="px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] bg-transparent border border-gold/30 text-gold hover:bg-gold/10 transition-all cursor-pointer disabled:opacity-50">
                            {requestingId === item.id ? "..." : "REQUEST →"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {tradeList.length === 0 && (
          <div className="bg-[rgba(0,0,0,0.15)] border border-warn/20 px-4 py-4 text-xs text-warn">No estimate line items found. Convert an estimate to link materials to this job.</div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-raj text-sm font-bold text-gold tracking-wider uppercase">Field Add / Substitutions</div>
          <Btn size="sm" onClick={() => setShowFieldAdd(!showFieldAdd)}>{showFieldAdd ? "CANCEL" : "+ ADD FIELD MATERIAL"}</Btn>
        </div>
        {showFieldAdd && (
          <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Item Name *</label><input value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40" /></div>
              <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Qty *</label><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40" /></div>
              <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Needed By</label><input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40" /></div>
              <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Priority</label><select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40"><option>Normal</option><option>Urgent</option><option>Critical</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Supplier</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40" /></div>
              <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Notes</label><input value={fieldNotes} onChange={(e) => setFieldNotes(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40" /></div>
            </div>
            <Btn variant="green" size="sm" onClick={addFieldMaterial} disabled={addingField}>{addingField ? "ADDING..." : "+ ADD MATERIAL"}</Btn>
          </div>
        )}
        {fieldMats.filter((m) => (m as any).source !== "estimate_request" || ["ordered","delivered","installed"].includes((m as any).status || "")).length === 0 ? (
          <div className="text-mil-muted text-xs p-3">No field materials added yet.</div>
        ) : (
          fieldMats.filter((m) => (m as any).source !== "estimate_request" || ["ordered","delivered","installed"].includes((m as any).status || "")).sort((a, b) => {
            const p: Record<string, number> = { Critical: 0, Urgent: 1, Normal: 2 };
            return (p[(a as any).priority] ?? 2) - (p[(b as any).priority] ?? 2);
          }).map((m) => {
            const st = ((m as any).status || "not_ordered").replace("-", "_");
            return (
              <div key={m.id} className="flex items-center justify-between px-3 py-[8px] hover:bg-[rgba(190,180,154,0.03)]">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-cream">{m.item_name}</span>
                    {(m as any).priority === "Critical" && <span className="text-[9px] text-danger font-raj font-bold">CRITICAL</span>}
                    {(m as any).priority === "Urgent" && <span className="text-[9px] text-warn font-raj font-bold">URGENT</span>}
                  </div>
                  <div className="text-[10px] text-mil-muted">{m.qty} {m.unit} {(m as any).needed_by ? `· needed ${(m as any).needed_by}` : ""} {(m as any).supplier ? `· ${(m as any).supplier}` : ""}</div>
                </div>
                <button onClick={() => cycleStatus(m)} className="cursor-pointer bg-transparent border-0 p-0">
                  <Pill variant={STATUS_VARIANT[st] || "pending"}>{STATUS_LABELS[st] || st}</Pill>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MaterialsTab;
