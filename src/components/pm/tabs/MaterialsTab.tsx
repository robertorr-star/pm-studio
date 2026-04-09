import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Material } from "@/lib/types";
import { Pill, Label, Panel } from "../UIComponents";
import { toast } from "sonner";

const STATUS_ORDER = ["not_ordered", "ordered", "delivered", "installed"] as const;
const STATUS_LABELS: Record<string, string> = { not_ordered: "NOT ORDERED", ordered: "ORDERED", delivered: "DELIVERED", installed: "INSTALLED" };
const STATUS_VARIANT: Record<string, string> = { not_ordered: "overdue", ordered: "info", delivered: "complete", installed: "teal" };
const UNITS = ["each", "lf", "sf", "sheets", "bags", "gallons", "tons", "yards", "boxes", "rolls", "other"];
const PRIORITIES = ["Normal", "Urgent", "Critical"];
const CREW = ["Leo", "Arnell", "Alberto", "Robert"];

interface BillingMaterial {
  id: string;
  description: string | null;
  phase_name: string | null;
  contract_amount: number | null;
  material_status: string | null;
  material_ordered_date: string | null;
  material_delivered_date: string | null;
  supplier: string | null;
  item_number: number | null;
}

const MaterialsTab = ({ materials: propMaterials, jobId }: { materials: Material[]; jobId: string }) => {
  const [billingMats, setBillingMats] = useState<BillingMaterial[]>([]);
  const [fieldMats, setFieldMats] = useState<Material[]>([]);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("each");
  const [supplier, setSupplier] = useState("");
  const [subcontractor, setSubcontractor] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [notes, setNotes] = useState("");
  const [addedBy, setAddedBy] = useState("Leo");

  useEffect(() => {
    const load = async () => {
      const [billingRes, matRes] = await Promise.all([
        supabase.from("billing_items").select("id, description, phase_name, contract_amount, material_status, material_ordered_date, material_delivered_date, supplier, item_number").eq("job_id", jobId),
        supabase.from("materials").select("*").eq("job_id", jobId).order("needed_by", { ascending: true }),
      ]);
      setBillingMats((billingRes.data as BillingMaterial[]) || []);
      setFieldMats(matRes.data || []);
      setLoading(false);
    };
    load();
  }, [jobId]);

  const billingByPhase = useMemo(() => {
    const groups: Record<string, BillingMaterial[]> = {};
    billingMats.forEach((m) => { const phase = m.phase_name || "General"; if (!groups[phase]) groups[phase] = []; groups[phase].push(m); });
    return groups;
  }, [billingMats]);

  const billingSummary = useMemo(() => {
    const total = billingMats.length;
    const notOrdered = billingMats.filter((m) => !m.material_status || m.material_status === "not_ordered").length;
    const ordered = billingMats.filter((m) => m.material_status === "ordered").length;
    const delivered = billingMats.filter((m) => m.material_status === "delivered" || m.material_status === "installed").length;
    return { total, notOrdered, ordered, delivered };
  }, [billingMats]);

  const cycleBillingStatus = async (item: BillingMaterial) => {
    const current = item.material_status || "not_ordered";
    const idx = STATUS_ORDER.indexOf(current as any);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const updates: Record<string, any> = { material_status: next };
    if (next === "ordered") updates.material_ordered_date = new Date().toISOString().split("T")[0];
    if (next === "delivered") updates.material_delivered_date = new Date().toISOString().split("T")[0];
    await supabase.from("billing_items").update(updates).eq("id", item.id);
    setBillingMats((prev) => prev.map((m) => m.id === item.id ? { ...m, ...updates } : m));
    toast.success(`${item.description} → ${STATUS_LABELS[next]}`);
  };

  const cycleFieldStatus = async (item: Material) => {
    const current = (item as any).status || "not_ordered";
    const idx = STATUS_ORDER.indexOf(current as any);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const updates: Record<string, any> = { status: next };
    if (next === "ordered") updates.ordered_date = new Date().toISOString().split("T")[0];
    if (next === "delivered") updates.delivered_date = new Date().toISOString().split("T")[0];
    await supabase.from("materials").update(updates).eq("id", item.id);
    setFieldMats((prev) => prev.map((m) => m.id === item.id ? { ...m, ...updates } : m));
    toast.success(`${item.item_name} → ${STATUS_LABELS[next]}`);
  };

  const togglePhase = (phase: string) => {
    setCollapsedPhases((prev) => { const next = new Set(prev); next.has(phase) ? next.delete(phase) : next.add(phase); return next; });
  };

  const addFieldMaterial = async () => {
    if (!itemName.trim() || !qty || !neededBy) { toast.error("Item Name, Quantity, and Needed By are required"); return; }
    const { data, error } = await supabase.from("materials").insert({
      job_id: jobId, item_name: itemName.trim(), qty, unit, supplier: supplier || null, status: "not-ordered",
      source: "field_add", priority, subcontractor: subcontractor || null, needed_by: neededBy, added_by: addedBy, quantity: parseFloat(qty),
    } as any).select().single();
    if (error) { toast.error(error.message); return; }
    setFieldMats((prev) => [...prev, data as any]);
    setItemName(""); setQty(""); setSupplier(""); setSubcontractor(""); setNeededBy(""); setNotes(""); setPriority("Normal");
    toast.success(`${itemName} added to field materials`);
  };

  const sortedFieldMats = useMemo(() => {
    return [...fieldMats].sort((a, b) => {
      const ap = (a as any).priority === "Critical" ? 0 : (a as any).priority === "Urgent" ? 1 : 2;
      const bp = (b as any).priority === "Critical" ? 0 : (b as any).priority === "Urgent" ? 1 : 2;
      if (ap !== bp) return ap - bp;
      return ((a as any).needed_by || "9999").localeCompare((b as any).needed_by || "9999");
    });
  }, [fieldMats]);

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" /></div>;

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <div className="font-raj text-sm font-bold text-gold tracking-wider mb-3 uppercase">Spec'd Materials from Estimate</div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Total Spec'd", value: billingSummary.total, cls: "text-cream" },
            { label: "Not Ordered", value: billingSummary.notOrdered, cls: "text-danger" },
            { label: "Ordered", value: billingSummary.ordered, cls: "text-info" },
            { label: "Delivered", value: billingSummary.delivered, cls: "text-ok" },
          ].map((s) => (
            <div key={s.label} className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
              <div className={`font-mono text-lg font-bold ${s.cls}`}>{s.value}</div>
              <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">{s.label}</div>
            </div>
          ))}
        </div>
        {billingMats.length === 0 ? (
          <div className="bg-[rgba(0,0,0,0.15)] border border-warn/20 px-4 py-5 text-xs text-warn">No estimate linked — use Field Add below.</div>
        ) : (
          Object.entries(billingByPhase).map(([phase, items]) => (
            <div key={phase} className="mb-3">
              <button onClick={() => togglePhase(phase)} className="flex items-center justify-between w-full px-3 py-2 bg-[rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.05)] cursor-pointer hover:bg-[rgba(0,0,0,0.35)] transition-all">
                <span className="font-raj text-[13px] font-bold text-cream">{collapsedPhases.has(phase) ? "▸" : "▾"} {phase} <span className="text-mil-muted font-normal ml-2 text-[10px]">{items.length} items</span></span>
              </button>
              {!collapsedPhases.has(phase) && (
                <div className="border border-t-0 border-[rgba(255,255,255,0.05)]">
                  {items.map((item) => {
                    const st = item.material_status || "not_ordered";
                    return (
                      <div key={item.id} className="flex items-center justify-between px-3 py-[9px] border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(190,180,154,0.03)]">
                        <div className="text-xs text-cream flex-1">{item.description}</div>
                        <div className="font-mono text-[11px] text-mil-muted mx-2">${(item.contract_amount || 0).toLocaleString()}</div>
                        <button onClick={() => cycleBillingStatus(item)} className="cursor-pointer bg-transparent border-0 p-0">
                          <Pill variant={STATUS_VARIANT[st] || "pending"}>{STATUS_LABELS[st] || st}</Pill>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div>
        <div className="font-raj text-sm font-bold text-gold tracking-wider mb-3 uppercase">Field Add Materials</div>
        <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Item Name *</label><input value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] font-dm outline-none focus:border-gold/40" /></div>
            <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Quantity *</label><input value={qty} onChange={(e) => setQty(e.target.value)} type="number" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] font-dm outline-none focus:border-gold/40" /></div>
            <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Needed By *</label><input value={neededBy} onChange={(e) => setNeededBy(e.target.value)} type="date" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] font-dm outline-none focus:border-gold/40" /></div>
            <div><label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Supplier</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] font-dm outline-none focus:border-gold/40" /></div>
          </div>
          <button onClick={addFieldMaterial} className="bg-gold/90 text-ink font-raj text-[11px] tracking-wider font-bold px-4 py-[7px] cursor-pointer hover:bg-gold transition-all">+ ADD MATERIAL</button>
        </div>
        {sortedFieldMats.length === 0 ? (
          <div className="text-mil-muted text-xs p-3">No field-add materials yet.</div>
        ) : (
          sortedFieldMats.map((m) => {
            const st = m.status === "not-ordered" ? "not_ordered" : (m.status || "not_ordered");
            return (
              <div key={m.id} className="flex items-center justify-between px-3 py-[8px] border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(190,180,154,0.03)]">
                <div className="flex-1"><div className="text-xs text-cream">{m.item_name}</div><div className="text-[9px] text-mil-muted">{m.qty} {m.unit} · {(m as any).needed_by || "—"}</div></div>
                <button onClick={() => cycleFieldStatus(m)} className="cursor-pointer bg-transparent border-0 p-0"><Pill variant={STATUS_VARIANT[st] || "pending"}>{STATUS_LABELS[st] || st}</Pill></button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MaterialsTab;
