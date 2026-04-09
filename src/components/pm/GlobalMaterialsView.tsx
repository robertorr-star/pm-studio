import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job } from "@/lib/types";
import { SectionHeader, Pill, Panel } from "./UIComponents";
import { toast } from "sonner";

const STATUS_ORDER = ["not_ordered", "ordered", "delivered", "installed"] as const;
const STATUS_LABELS: Record<string, string> = { not_ordered: "NOT ORDERED", ordered: "ORDERED", delivered: "DELIVERED", installed: "INSTALLED" };
const STATUS_VARIANT: Record<string, string> = { not_ordered: "overdue", ordered: "info", delivered: "complete", installed: "teal" };

interface MatRow { id: string; job_id: string; item_name: string; qty: string | null; unit: string | null; supplier: string | null; status: string | null; source: string | null; priority: string | null; subcontractor: string | null; needed_by: string | null; ordered_date: string | null; delivered_date: string | null; added_by: string | null; phase_name: string | null; }

const GlobalMaterialsView = ({ onJobClick }: { onJobClick: (id: string) => void }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [materials, setMaterials] = useState<MatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const load = async () => {
      const [j, m] = await Promise.all([supabase.from("jobs").select("*").order("name"), supabase.from("materials").select("*").order("needed_by", { ascending: true })]);
      setJobs(j.data || []); setMaterials((m.data as unknown as MatRow[]) || []); setLoading(false);
    }; load();
  }, []);

  const jobMap = useMemo(() => { const m: Record<string, Job> = {}; jobs.forEach(j => { m[j.id] = j; }); return m; }, [jobs]);

  const normalizeStatus = (s: string | null): string => s ? s.replace("-", "_") : "not_ordered";

  const cycleStatus = async (item: MatRow) => {
    const current = normalizeStatus(item.status);
    const idx = STATUS_ORDER.indexOf(current as any);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const updates: Record<string, any> = { status: next };
    if (next === "ordered") updates.ordered_date = new Date().toISOString().split("T")[0];
    if (next === "delivered") updates.delivered_date = new Date().toISOString().split("T")[0];
    await supabase.from("materials").update(updates).eq("id", item.id);
    setMaterials(prev => prev.map(m => m.id === item.id ? { ...m, ...updates } : m));
    toast.success(`${item.item_name} → ${STATUS_LABELS[next]}`);
  };

  const filtered = useMemo(() => materials.filter(m => filterStatus === "all" || normalizeStatus(m.status) === filterStatus), [materials, filterStatus]);

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" /></div>;

  return (
    <div>
      <SectionHeader label="MATERIALS COMMAND — ALL JOBS" />
      <div className="flex flex-wrap gap-2 mb-4">
        {["all", "not_ordered", "ordered", "delivered", "installed"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 font-raj text-[11px] tracking-wider cursor-pointer border ${filterStatus === s ? "bg-gold/20 text-gold border-gold/40" : "bg-transparent text-mil-muted border-gold/20"}`}>{s === "all" ? "ALL" : STATUS_LABELS[s]}</button>
        ))}
      </div>
      <div className="border border-[rgba(255,255,255,0.05)]">
        {filtered.length === 0 ? <div className="text-mil-muted text-xs p-5 text-center">No materials match.</div> : filtered.map(m => {
          const st = normalizeStatus(m.status);
          return (
            <div key={m.id} className="flex items-center gap-2 px-3 py-[8px] border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(190,180,154,0.03)]">
              <button onClick={() => onJobClick(m.job_id)} className="text-gold text-[10px] font-raj font-bold text-left truncate bg-transparent border-0 cursor-pointer hover:text-cream p-0 min-w-[80px]">{jobMap[m.job_id]?.name || m.job_id}</button>
              <div className="flex-1 text-xs text-cream truncate">{m.item_name}</div>
              <div className="font-mono text-[11px] text-mil-muted">{m.qty}{m.unit ? ` ${m.unit}` : ""}</div>
              <button onClick={() => cycleStatus(m)} className="cursor-pointer bg-transparent border-0 p-0"><Pill variant={STATUS_VARIANT[st] || "pending"}>{STATUS_LABELS[st] || st}</Pill></button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GlobalMaterialsView;
