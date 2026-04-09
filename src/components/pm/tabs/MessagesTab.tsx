import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/lib/types";
import { Btn, FormInput, FormSelect } from "../UIComponents";
import { toast } from "sonner";

const MessagesTab = ({ messages, jobId, onMessagesChange }: { messages: Message[]; jobId: string; onMessagesChange: (msgs: Message[]) => void }) => {
  const [text, setText] = useState("");
  const [from, setFrom] = useState("Leo");

  const addMessage = async () => {
    if (!text.trim()) return;
    const tagMap: Record<string, string> = { Leo: "FIELD", Robert: "MGMT", Alberto: "DELIVERY" };
    const avMap: Record<string, string> = { Leo: "av-gold", Arnell: "av-green", Robert: "av-blue" };
    const { data } = await supabase.from("messages").insert({
      job_id: jobId, from_person: from, avatar_class: avMap[from] || "av-muted",
      tag: tagMap[from] || "OFFICE", message_text: text.trim(),
    }).select().single();
    if (data) onMessagesChange([...messages, data]);
    setText("");
  };

  const avatarStyles: Record<string, string> = {
    "av-gold": "bg-[rgba(190,180,154,0.2)] text-gold border border-[rgba(190,180,154,0.3)]",
    "av-green": "bg-[rgba(106,170,72,0.2)] text-ok border border-[rgba(106,170,72,0.3)]",
    "av-blue": "bg-[rgba(74,138,170,0.2)] text-info border border-[rgba(74,138,170,0.3)]",
    "av-muted": "bg-[rgba(122,140,104,0.15)] text-mil-muted border border-[rgba(122,140,104,0.2)]",
  };

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col gap-[2px] mb-[14px] max-h-[340px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-mil-muted p-5">No messages yet.</div>
        ) : (
          messages.map((m) => {
            const initials = (m.from_person || "?").split(" ").map((p) => p[0]).join("").substring(0, 2);
            const time = new Date(m.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
            return (
              <div key={m.id} className="flex gap-[10px] px-3 py-[10px] border-b border-[rgba(255,255,255,0.03)] transition-colors hover:bg-[rgba(190,180,154,0.03)]">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-raj text-[11px] font-bold flex-shrink-0 mt-[1px] ${avatarStyles[m.avatar_class || "av-muted"]}`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-raj text-xs font-bold text-cream">{m.from_person}</span>
                    <span className="text-[10px] text-mil-muted">{time}</span>
                    {m.tag && <span className="font-raj text-[9px] tracking-[1px] text-gold bg-[rgba(190,180,154,0.1)] px-[6px] py-[1px]">{m.tag}</span>}
                  </div>
                  <div className="text-xs text-cream leading-[1.5]" dangerouslySetInnerHTML={{ __html: (m.message_text || "").replace(/@(\w+)/g, '<span class="text-gold">@$1</span>') }} />
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] p-4">
        <div className="flex gap-2 mb-2 flex-wrap">
          <FormSelect value={from} onChange={(e) => setFrom(e.target.value)} className="!w-[100px] flex-[0_0_100px]">
            <option>Leo</option><option>Arnell</option><option>Robert</option><option>Sonny</option><option>Alberto</option>
          </FormSelect>
          <FormInput value={text} onChange={(e) => setText(e.target.value)} placeholder="Message... use @Leo @Arnell @Robert to tag" onKeyDown={(e) => e.key === "Enter" && addMessage()} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-mil-muted">All messages timestamped and permanent — no deleting</span>
          <Btn size="sm" onClick={addMessage}>SEND</Btn>
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;
