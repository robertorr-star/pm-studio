import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { Job, JobData } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageData?: string;
}

const ROLE_PROMPTS: Record<string, string> = {
  Leo: `You are an expert construction assistant embedded in Orr Construction Company's
project management system. You are helping Leo Gonzalez, the Project Manager, with
on-site questions, inspection coordination, field log entries, and construction
problem-solving. Leo works in the field and often takes photos of issues.

CURRENT JOB CONTEXT:
Job: {JOB_NAME}
Address: {JOB_ADDRESS}
Phase: {JOB_PHASE} ({JOB_PCT}% complete)
Contract value: {CONTRACT_VALUE}
Jurisdiction: {JURISDICTION}

When Leo uploads a photo of a construction issue:
1. Identify what the problem is
2. State which trade is responsible for the fix
3. Give the specific correction needed
4. Note any code reference if relevant

Keep answers short and practical. Leo is usually on site, may be reading on a phone.`,

  Sonny: `You are a construction business assistant embedded in Orr Construction Company's
PM system. You are helping Sonny Andaya, the Office Manager, with invoicing, submittal
coordination, client communications, and administrative tasks.

CURRENT JOB CONTEXT:
Job: {JOB_NAME}
Client: {CLIENT_NAME}
Address: {JOB_ADDRESS}
Contract: {CONTRACT_VALUE}
Billed to date: {BILLED}
Jurisdiction: {JURISDICTION}

You can help Sonny:
- Draft professional client emails and update letters
- Review submittal checklists and identify what's missing
- Write correction response letters to the city
- Clarify invoice amounts and billing schedules

CSLB License: 1028720. Company: Orr Construction Company.`,

  Sigfried: `You are a licensed architect and construction expert embedded in Orr Construction
Company's design system. You are helping Sigfried, the Lead Architect/Draftsman, with
plan checking, code compliance, correction responses, and design coordination.

CURRENT JOB CONTEXT:
Job: {JOB_NAME}
Address: {JOB_ADDRESS}
Project type: {JOB_TYPE}
Jurisdiction: {JURISDICTION}
Design phase: {DESIGN_PHASE}

When Sigfried uploads a plan check correction letter or correction items:
1. Parse each numbered correction item
2. Identify which drawing sheet it affects
3. State the exact code section being cited
4. Describe the specific correction needed
5. Assign to: Sigfried (architectural), Jake (structural), or external consultant

Applicable codes: 2022 CBC (or 2025 if adopted by this jurisdiction), 2022 Title 24,
2022 CALGreen. Always verify which code cycle the city is using before designing.`,

  Andy: `You are an expert construction business analyst embedded in Orr Construction
Company's management system. You are helping Robert "Andy" Orr, the President and Owner,
with business decisions, financial analysis, project oversight, and strategic planning.

COMPANY CONTEXT:
Company: Orr Construction Company (CSLB #1028720, General B + A + C-20 pending)
Revenue peak: $5.23M (2024). Goal: $20M/yr.
19 active jobs, $8.02M contract value, $3.86M remaining to bill.
The 18/5/5/72 cash management system is live.

You can help Andy:
- Analyze which jobs need immediate attention
- Review cost-to-complete projections
- Draft client communication or contracts
- Think through business decisions and tradeoffs
- Understand financial reports and KPIs`,
};

interface AIAssistantPanelProps {
  job: Job;
  data: JobData;
  currentUser?: string;
  currentTab?: string;
}

const AIAssistantPanel = ({ job, data, currentUser = "Leo", currentTab }: AIAssistantPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const buildSystemPrompt = () => {
    const template = ROLE_PROMPTS[currentUser] || ROLE_PROMPTS.Leo;
    return template
      .replace("{JOB_NAME}", job.name)
      .replace("{JOB_ADDRESS}", job.address || "")
      .replace("{JOB_PHASE}", job.current_phase || "")
      .replace("{JOB_PCT}", String(job.phase_pct || 0))
      .replace("{CONTRACT_VALUE}", `$${Number(job.contract_value || 0).toLocaleString()}`)
      .replace("{CLIENT_NAME}", job.client_name || "")
      .replace("{BILLED}", `$${Number((job as any).total_billed || 0).toLocaleString()}`)
      .replace("{JURISDICTION}", (job as any).jurisdiction_name || "California")
      .replace("{JOB_TYPE}", (job as any).job_type || "general_remodel")
      .replace("{DESIGN_PHASE}", (job as any).workflow_phase || "design");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      setImageData(base64);
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if (!input.trim() && !imageData) return;
    const userMessage: Message = { role: "user", content: input };
    if (imageData) userMessage.imageData = imageData;

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setImageData(null);
    setImagePreview(null);
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        toast.error("Add VITE_ANTHROPIC_API_KEY to your .env to enable AI assistant");
        setLoading(false);
        return;
      }

      const apiMessages = updatedMessages.map(m => {
        if (m.imageData) {
          return {
            role: m.role,
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: m.imageData } },
              { type: "text", text: m.content || "What do you see in this image? What's the issue and how should it be fixed?" },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: buildSystemPrompt(),
          messages: apiMessages,
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error?.message || "API error");
      }
      const assistantText = responseData.content?.map((c: any) => c.text || "").join("\n") || "No response";
      setMessages(prev => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err: any) {
      toast.error("AI assistant error — " + (err.message || "check connection"));
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts: Record<string, string[]> = {
    Leo: ["What inspections are next?", "Photo: what's the issue?", "Draft field log entry"],
    Sonny: ["Ready to invoice?", "Draft client email", "What's missing for submittal?"],
    Sigfried: ["Review corrections", "What codes apply here?", "Draft correction response"],
    Andy: ["Which jobs need attention?", "Cash position summary", "Project risk review"],
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 40,
          width: "52px", height: "52px", background: "var(--gold)",
          border: "none", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
        title="AI Assistant"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"
            fill="rgba(26,18,8,0.9)" />
          <circle cx="8.5" cy="12" r="1.5" fill="#C9A84C" />
          <circle cx="12" cy="12" r="1.5" fill="#C9A84C" />
          <circle cx="15.5" cy="12" r="1.5" fill="#C9A84C" />
        </svg>
      </button>

      {/* PANEL */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: "88px", right: "16px", zIndex: 40,
          width: "380px", maxWidth: "calc(100vw - 32px)",
          background: "#0B1A0B", border: "1px solid rgba(201,168,76,0.2)",
          display: "flex", flexDirection: "column", maxHeight: "520px",
        }}>
          {/* Header */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "Rajdhani", fontSize: "12px", fontWeight: 700, color: "#C9A84C", letterSpacing: "2px" }}>
                AI ASSISTANT — {currentUser?.toUpperCase()}
              </div>
              <div style={{ fontSize: "10px", color: "rgba(180,170,140,0.6)", marginTop: "1px" }}>
                Context: {job.name}
              </div>
            </div>
            <button onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "rgba(180,170,140,0.5)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>
              ×
            </button>
          </div>

          {/* Quick prompts */}
          {messages.length === 0 && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "9px", color: "rgba(180,170,140,0.5)", fontFamily: "Rajdhani", letterSpacing: "1.5px", marginBottom: "6px" }}>QUICK ACTIONS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {(quickPrompts[currentUser] || quickPrompts.Leo).map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#C9A84C", fontSize: "10px", padding: "3px 8px", cursor: "pointer", fontFamily: "Rajdhani", letterSpacing: "0.5px" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "8px 10px", fontSize: "12px", lineHeight: 1.5,
                  background: m.role === "user" ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.05)",
                  color: "#e8e0cc",
                  borderLeft: m.role === "assistant" ? "2px solid rgba(201,168,76,0.4)" : "none",
                }}>
                  {m.imageData && (
                    <img src={`data:image/jpeg;base64,${m.imageData}`} alt="uploaded"
                      style={{ width: "100%", marginBottom: "6px", opacity: 0.8 }} />
                  )}
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderLeft: "2px solid rgba(201,168,76,0.4)" }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: "5px", height: "5px", background: "#C9A84C", borderRadius: "50%",
                        animation: `bounce 0.8s ${i * 0.16}s infinite alternate` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div style={{ padding: "6px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={imagePreview} alt="preview" style={{ height: "60px", opacity: 0.8 }} />
                <button onClick={() => { setImageData(null); setImagePreview(null); }}
                  style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, background: "#C9A84C", border: "none", color: "#1A1208", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "6px" }}>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleImageUpload} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(180,170,140,0.6)", cursor: "pointer", padding: "0 8px", fontSize: "14px" }}
              title="Upload photo">
              ⬆
            </button>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Ask anything about this job..."
              style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e0cc", fontSize: "12px", padding: "7px 10px", outline: "none" }}
            />
            <button onClick={sendMessage} disabled={loading}
              style={{ background: loading ? "rgba(201,168,76,0.3)" : "#C9A84C", border: "none", color: "#1A1208", cursor: loading ? "not-allowed" : "pointer", padding: "0 12px", fontFamily: "Rajdhani", fontWeight: 700, fontSize: "11px", letterSpacing: "1px" }}>
              SEND
            </button>
          </div>
          <style>{`@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-5px); } }`}</style>
        </div>
      )}
    </>
  );
};

export default AIAssistantPanel;
