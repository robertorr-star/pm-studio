import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PunchItem } from "@/lib/types";
import { Btn, FormInput, FormSelect, Label } from "../UIComponents";
import { toast } from "sonner";

const PunchListTab = ({ punchItems, jobId, onItemsChange }: { punchItems: PunchItem[]; jobId: string; onItemsChange: (items: PunchItem[]) => void }) => {
  const [text, setText] = useState("");
  const [trade, setTrade] = useState("");
  const [assign, setAssign] = useState("Leo");

  const trades = ["Plans & Permits","Demo & Prep","Excavation","Footings","Foundations","Concrete","Framing","Roofing","Plumbing","Electrical","Insulation","Drywall","Stucco","Interior Paint","Exterior Paint","Exterior Trim","Interior Trim","Cabinets","Countertops","Tile","Flooring","Doors","Windows","HVAC","Fire Sprinkler","Masonry","Decking","Fencing","Landscape","Appliances","General"];

  const open = punchItems.filter((i) => i.status === "open");
  const cleared = punchItems.filter((i) => i.status === "cleared");
  const total = open.length + cleared.length;
  const pct = total > 0 ? Math.round((cleared.length / total) * 100) : 0;

  const addItem = async () => {
    if (!text.trim()) return;
    const { data } = await supabase.from("punch_items").insert({ job_id: jobId, item: text.trim(), trade, assigned_to: assign, status: "open", added_by: "Robert" }).select().single();
    if (data) onItemsChange([...punchItems, data]);
    setText("");
    toast.success("Punch item added");
  };

  const toggleItem = async (id: string, currentStatus: string | null) => {
    const newStatus = currentStatus === "open" ? "cleared" : "open";
    const patchData: any = { status: newStatus };
    if (newStatus === "cleared") patchData.cleared_at = new Date().toISOString();
    else patchData.cleared_at = null;
    await supabase.from("punch_items").update(patchData).eq("id", id);
    onItemsChange(punchItems.map((i) => i.id === id ? { ...i, status: newStatus, cleared_at: patchData.cleared_at } : i));
    if (newStatus === "cleared") toast.success("Item Cleared — one step closer to final invoice.");
  };

  const deleteItem = async (id: string) => {
    await supabase.from("punch_items").delete().eq("id", id);
    onItemsChange(punchItems.filter((i) => i.id !== id));
  };

  const renderItem = (item: PunchItem) => {
    const isCleared = item.status === "cleared";
    return (
      <div key={item.id} className={`flex items-center gap-3 px-[14px] py-[11px] border-b border-[rgba(255,255,255,0.04)] ${isCleared ? "opacity-50" : ""}`}>
        <button
          onClick={() => toggleItem(item.id, item.status)}
          className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-sm cursor-pointer transition-all ${
            isCleared ? "border-2 border-ok bg-[rgba(46,204,113,0.15)] text-ok" : "border-2 border-[rgba(255,255,255,0.2)] bg-transparent"
          }`}
        >
          {isCleared ? "✓" : ""}
        </button>
        <div className="flex-1">
          <div className={`text-xs ${isCleared ? "line-through text-mil-muted" : ""}`}>{item.item}</div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {item.trade && <span className="bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.15)] px-2 py-[2px] text-[10px] text-gold font-raj">{item.trade}</span>}
            {item.assigned_to && <span className="text-[10px] text-mil-muted">— {item.assigned_to}</span>}
            {item.cleared_at && <span className="text-[10px] text-ok">Cleared {new Date(item.cleared_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
          </div>
        </div>
        {!isCleared && (
          <button onClick={() => deleteItem(item.id)} className="bg-transparent border-none text-mil-muted cursor-pointer text-xl px-[6px] leading-none hover:text-danger">×</button>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-4 mb-4 p-3 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.06)]">
        <div className="flex-1">
          <Label>Punch List Progress</Label>
          <div className="h-[6px] bg-[rgba(255,255,255,0.06)] overflow-hidden mt-1">
            <div className="h-full bg-ok transition-all duration-[600ms]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[22px] font-bold" style={{ color: open.length > 0 ? "var(--warn)" : "var(--mil-muted)" }}>{open.length}</div>
          <Label>Open</Label>
        </div>
        <div className="text-center">
          <div className="font-mono text-[22px] font-bold text-ok">{cleared.length}</div>
          <Label>Cleared</Label>
        </div>
        {open.length === 0 && total > 0 && (
          <div className="px-4 py-2 bg-[rgba(46,204,113,0.08)] border border-[rgba(46,204,113,0.25)] font-raj text-[11px] font-bold text-ok tracking-[1px]">
            ✓ CLEAR — READY FOR FINAL INVOICE
          </div>
        )}
      </div>

      <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] p-4 mb-[14px]">
        <Label>Add Punch Item</Label>
        <div className="flex gap-2 mt-[10px] flex-wrap">
          <FormInput value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the item..." className="flex-[3] min-w-[200px]" onKeyDown={(e) => e.key === "Enter" && addItem()} />
          <FormSelect value={trade} onChange={(e) => setTrade(e.target.value)} className="!w-[140px] flex-[0_0_140px]">
            <option value="">-- Trade --</option>
            {trades.map((t) => <option key={t}>{t}</option>)}
          </FormSelect>
          <FormSelect value={assign} onChange={(e) => setAssign(e.target.value)} className="!w-[110px] flex-[0_0_110px]">
            <option>Leo</option><option>Arnell</option><option>Robert</option><option>Sub</option><option>DLC Crew</option>
          </FormSelect>
          <Btn onClick={addItem}>+ ADD</Btn>
        </div>
      </div>

      {open.length > 0 && (
        <>
          <div className="font-raj text-[9px] tracking-[2px] text-warn uppercase mb-2">OPEN — {open.length} item{open.length > 1 ? "s" : ""}</div>
          {open.map(renderItem)}
        </>
      )}
      {cleared.length > 0 && (
        <>
          <div className="font-raj text-[9px] tracking-[2px] text-ok uppercase mb-2 mt-4">CLEARED — {cleared.length}</div>
          {cleared.map(renderItem)}
        </>
      )}
      {total === 0 && <div className="text-mil-muted p-5 text-xs">No punch items yet.</div>}
    </div>
  );
};

export default PunchListTab;
