import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ManHour } from "@/lib/types";
import { Pill, Btn, Label, StatCard, BudgetMeter, FormSelect, FormInput } from "../UIComponents";
import { toast } from "sonner";

const meterColor = (pct: number | null) => !pct || pct <= 90 ? "var(--ok)" : pct <= 100 ? "var(--warn)" : "var(--danger)";

const ManHoursTab = ({ manHours, jobId, onManHoursChange }: { manHours: ManHour[]; jobId: string; onManHoursChange: (mh: ManHour[]) => void }) => {
  const [showEntry, setShowEntry] = useState(false);
  const [tradeId, setTradeId] = useState(manHours[0]?.id || "");
  const [hours, setHours] = useState("");

  const done = manHours.filter((t) => Number(t.estimated_hrs) > 0 && Number(t.actual_hrs) > 0 && t.status === "complete");
  const totalEst = done.reduce((s, t) => s + Number(t.estimated_hrs), 0);
  const totalAct = done.reduce((s, t) => s + Number(t.actual_hrs), 0);
  const totalVar = Math.round(totalAct - totalEst);
  const totalRate = totalEst > 0 ? Math.round((totalAct / totalEst) * 100) : 0;
  const allEst = manHours.filter((t) => Number(t.estimated_hrs) > 0).reduce((s, t) => s + Number(t.estimated_hrs), 0);
  const allAct = manHours.reduce((s, t) => s + Number(t.actual_hrs), 0);

  const over = manHours.filter((t) => Number(t.actual_hrs) > 0 && Number(t.estimated_hrs) > 0 && Math.round(Number(t.actual_hrs) / Number(t.estimated_hrs) * 100) > 115);

  const logHours = async () => {
    const hrs = parseFloat(hours);
    if (!hrs || !tradeId) return;
    const trade = manHours.find((t) => t.id === tradeId);
    if (!trade) return;
    const newAct = Number(trade.actual_hrs) + hrs;
    await supabase.from("man_hours").update({ actual_hrs: newAct }).eq("id", tradeId);
    onManHoursChange(manHours.map((t) => t.id === tradeId ? { ...t, actual_hrs: newAct } : t));
    setHours("");
    toast.success(`${hrs} hrs logged to ${trade.trade}`);
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <Label>Estimated vs actual hours</Label>
        <Btn size="sm" onClick={() => setShowEntry(!showEntry)}>+ LOG HOURS</Btn>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5 max-md:grid-cols-2">
        <StatCard label="Total Est. Hours" value={`${Math.round(allEst)} hrs`} />
        <StatCard label="Actual Logged" value={`${Math.round(allAct)} hrs`} color={allAct > allEst * 0.5 ? "text-warn" : "text-ok"} />
        <StatCard label="Completed Rate" value={totalRate ? `${totalRate}%` : "--"} color={`text-[${meterColor(totalRate)}]`} />
        <StatCard label="Variance" value={`${totalVar > 0 ? "+" : ""}${totalVar} hrs`} color={totalVar > 0 ? "text-danger" : "text-ok"} />
      </div>

      {over.length >= 2 && (
        <div className="bg-[rgba(243,156,18,0.07)] border border-[rgba(243,156,18,0.2)] border-l-4 border-l-warn p-[12px_16px] mb-4">
          <div className="font-raj text-xs font-bold text-warn mb-[6px]">ESTIMATING ISSUE — {over.length} TRADES OVER BUDGET</div>
          <div className="text-[11px] text-cream">{over.map((t) => `${t.trade} at ${Math.round(Number(t.actual_hrs) / Number(t.estimated_hrs) * 100)}%`).join(", ")}</div>
        </div>
      )}

      {manHours.map((t) => {
        const pct = Number(t.estimated_hrs) > 0 && Number(t.actual_hrs) > 0 ? Math.round(Number(t.actual_hrs) / Number(t.estimated_hrs) * 100) : null;
        const col = meterColor(pct);
        const statusPills: Record<string, string> = { complete: "complete", active: "active", pending: "pending" };
        return (
          <div key={t.id} className="px-[14px] py-[10px] border-b border-[rgba(255,255,255,0.04)] transition-colors hover:bg-[rgba(201,168,76,0.03)]">
            <div className="flex items-center justify-between mb-[6px]">
              <div className="flex items-center gap-[10px]">
                <span className="text-xs font-medium text-cream">{t.trade}</span>
                <Pill variant={statusPills[t.status || "pending"] || "pending"}>{(t.status || "pending").charAt(0).toUpperCase() + (t.status || "pending").slice(1)}</Pill>
                {pct && pct > 100 && <span className="font-raj text-[9px] tracking-[1.5px] font-bold px-2 text-danger">↑ {pct - 100}% OVER</span>}
              </div>
              <span className="font-mono text-[13px] font-bold tracking-[0.5px]" style={{ color: col }}>{pct ? `${pct}%` : t.status === "pending" ? "--" : "In progress"}</span>
            </div>
            <BudgetMeter pct={pct} />
            <div className="flex gap-4 mt-1 flex-wrap">
              <div><span className="font-raj text-[9px] tracking-[1px] text-mil-muted uppercase block">Estimated</span><span className="font-mono text-xs font-bold text-mil-muted">{Number(t.estimated_hrs) > 0 ? `${t.estimated_hrs} hrs` : "Sub"}</span></div>
              <div><span className="font-raj text-[9px] tracking-[1px] text-mil-muted uppercase block">Actual</span><span className="font-mono text-xs font-bold">{Number(t.actual_hrs) > 0 ? `${t.actual_hrs} hrs` : t.status === "pending" ? "Not started" : "In progress"}</span></div>
              <div><span className="font-raj text-[9px] tracking-[1px] text-mil-muted uppercase block">Note</span><span className="font-dm text-[11px] text-mil-muted font-normal">{t.note || "--"}</span></div>
            </div>
          </div>
        );
      })}

      {showEntry && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] p-4 mt-4">
          <Label>Log Actual Hours — by trade</Label>
          <div className="flex gap-2 mt-[10px] flex-wrap">
            <FormSelect value={tradeId} onChange={(e) => setTradeId(e.target.value)} className="!w-[200px] flex-[0_0_200px]">
              {manHours.map((t) => <option key={t.id} value={t.id}>{t.trade}</option>)}
            </FormSelect>
            <FormInput type="number" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours worked" className="!w-[130px] flex-[0_0_130px]" />
            <Btn onClick={logHours}>LOG</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManHoursTab;
