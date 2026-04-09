import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FieldLog } from "@/lib/types";
import { Btn, FormInput, FormSelect } from "../UIComponents";
import { toast } from "sonner";

const FieldLogTab = ({ logs, jobId, onLogsChange }: { logs: FieldLog[]; jobId: string; onLogsChange: (logs: FieldLog[]) => void }) => {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("Leo");

  const addEntry = async () => {
    if (!text.trim()) return;
    const now = new Date();
    const date = now.toLocaleString("en-US", { month: "short", day: "numeric" });
    const { data } = await supabase.from("field_logs").insert({ job_id: jobId, log_text: text.trim(), author, log_date: date }).select().single();
    if (data) onLogsChange([data, ...logs]);
    setText("");
    toast.success("Field log entry added");
  };

  return (
    <div className="animate-fade-up">
      <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] p-4 mb-[14px]">
        <span className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase block mb-[10px]">Morning Check-In — Leo</span>
        <div className="flex gap-2 flex-wrap">
          <FormInput value={text} onChange={(e) => setText(e.target.value)} placeholder="What's happening on site today..." className="flex-[3] min-w-[200px]" onKeyDown={(e) => e.key === "Enter" && addEntry()} />
          <FormSelect value={author} onChange={(e) => setAuthor(e.target.value)} className="!w-[120px] flex-[0_0_120px]">
            <option>Leo</option><option>Arnell</option><option>Robert</option><option>Alberto</option>
          </FormSelect>
          <Btn onClick={addEntry}>LOG</Btn>
        </div>
      </div>
      {logs.length === 0 ? (
        <div className="text-mil-muted p-5">No log entries yet.</div>
      ) : (
        logs.map((l) => (
          <div key={l.id} className="flex gap-3 py-[10px] border-b border-[rgba(255,255,255,0.04)]">
            <div className="font-mono text-[10px] text-mil-muted min-w-[70px] pt-[1px]">{l.log_date || ""}</div>
            <div className="flex-1">
              <div className="text-xs leading-[1.5]">{l.log_text}</div>
              <div className="text-[10px] text-gold mt-1">— {l.author || "Leo"}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FieldLogTab;
