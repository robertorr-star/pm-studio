import { useState } from "react";
import type { Job, JobData } from "@/lib/types";
import { Btn, Label, Panel, SectionHeader, Pill } from "../UIComponents";
import { toast } from "sonner";

const ClientCommsTab = ({ job, data }: { job: Job; data: JobData }) => {
  const [tone, setTone] = useState("professional");
  const [draft, setDraft] = useState(job.weekly_update_draft || "");
  const [generating, setGenerating] = useState(false);

  const logs = data.fieldLogs.slice(0, 5);
  const activePh = data.phases.filter((p) => p.status === "active" || p.status === "complete").slice(0, 4);
  const passedInsp = data.inspections.filter((i) => i.result === "PASS");

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  const generateDraft = async () => {
    if (!data.fieldLogs.length) { toast.error("Add field log entries first."); return; }
    setGenerating(true);
    const activeName = data.phases.find((p) => p.status === "active")?.name || job.current_phase || "ongoing work";
    const template = `Dear ${job.client_name || "Client"},\n\nI hope this update finds you well. I'm writing to share the latest progress on your project at ${job.address || "your property"}.\n\nThis week, our team has been focused on ${activeName}. ${logs[0]?.log_text || "Work is progressing well."}\n\n${passedInsp.length > 0 ? `Great news — we passed ${passedInsp.length} inspection(s) including ${passedInsp.map((i) => `${i.phase_name} ${i.inspection_type}`).join(", ")}. ` : ""}The project is currently ${job.phase_pct || 0}% complete.\n\nLooking ahead, we'll be moving into the next phase of work. We'll keep you posted on any developments.\n\nBest regards,\nRobert Orr\nOrr Construction & Development\nCSLB #1028720`;

    setTimeout(() => {
      setDraft(template);
      setGenerating(false);
      toast.success("Draft generated — edit freely before approving");
    }, 1000);
  };

  const approveDraft = () => {
    navigator.clipboard.writeText(draft).then(() => {
      toast.success(`Copied! Paste into email to ${job.client_name || "client"} and send.`);
    });
  };

  return (
    <div className="animate-fade-up grid grid-cols-2 gap-[14px] max-md:grid-cols-1">
      <div>
        <div className="flex items-center justify-between mb-[10px]">
          <SectionHeader label="WEEKLY CLIENT UPDATE" />
        </div>

        <div className="flex gap-2 mb-[10px] flex-wrap">
          {[
            { n: logs.length, label: "Field Logs", color: "var(--gold)" },
            { n: activePh.length, label: "Phases", color: "var(--info)" },
            { n: passedInsp.length, label: "Inspections", color: "var(--ok)" },
            { n: data.materials.length, label: "Materials", color: "var(--mil-muted)" },
          ].map((s, i) => (
            <div key={i} className="bg-[rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.07)] px-[10px] py-1 text-[10px] font-raj tracking-[0.5px]" style={{ color: s.color }}>
              {s.n} {s.label}
            </div>
          ))}
        </div>

        <Panel className="!p-0 overflow-hidden !mb-[10px]">
          {generating && (
            <div className="px-[14px] py-2 bg-[rgba(201,168,76,0.08)] border-b border-[rgba(201,168,76,0.15)] text-[10px] text-gold font-raj tracking-[1px]">
              ■ AI WRITING...
            </div>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={generating}
            placeholder="Click GENERATE to draft a client update from this week's field logs..."
            className="w-full min-h-[260px] bg-transparent border-none p-[14px] text-xs text-cream font-dm leading-[1.8] resize-y outline-none placeholder:text-mil-muted"
          />
        </Panel>

        {wordCount > 0 && <div className="text-[10px] text-mil-muted mb-[10px]">{wordCount} words — edit freely before approving</div>}

        <div className="flex gap-2 flex-wrap mb-3">
          <Btn onClick={generateDraft} disabled={generating}>{generating ? "WRITING..." : draft ? "REGENERATE" : "▶ GENERATE DRAFT"}</Btn>
          {draft && <Btn variant="green" size="sm" onClick={approveDraft}>✓ APPROVE & COPY</Btn>}
          <Btn variant="ghost" size="sm" onClick={() => setDraft("")}>CLEAR</Btn>
        </div>

        <div className="mb-2">
          <Label>Tone</Label>
          <div className="flex gap-[6px] mt-[6px]">
            {["professional", "friendly", "brief"].map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-3 py-1 font-raj text-[10px] tracking-[1.5px] uppercase font-semibold cursor-pointer transition-all ${
                  tone === t
                    ? "bg-[rgba(201,168,76,0.1)] border border-gold text-gold"
                    : "bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] text-mil-muted hover:border-gold/30 hover:text-gold"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-mil-muted mt-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
          {job.last_update_sent ? (
            <><span className="text-ok">✓</span> Last sent {new Date(job.last_update_sent).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
          ) : "No updates sent yet."}
        </div>
      </div>

      <div>
        <SectionHeader label="WHAT AI WILL USE" />
        <Panel className="!text-[11px] !text-mil-muted !leading-[1.8] !mb-[14px]">
          <div className="mb-[6px] text-gold font-raj text-[10px] tracking-[1px]">FIELD LOGS ({logs.length} recent)</div>
          {logs.length ? logs.map((l) => (
            <div key={l.id} className="py-[2px] border-b border-[rgba(255,255,255,0.03)] text-[11px]">{l.log_date || ""} — {(l.log_text || "").substring(0, 80)}</div>
          )) : <div className="text-mil-muted">No logs yet</div>}

          <div className="mt-2 mb-1 text-info font-raj text-[10px] tracking-[1px]">PHASES</div>
          {activePh.length ? activePh.map((p) => (
            <div key={p.id} className="py-[2px] text-[11px]">{p.name} — <span style={{ color: p.status === "complete" ? "var(--ok)" : "var(--gold)" }}>{(p.status || "").toUpperCase()}</span></div>
          )) : <div className="text-mil-muted">None</div>}

          <div className="mt-2 mb-1 text-ok font-raj text-[10px] tracking-[1px]">INSPECTIONS PASSED</div>
          {passedInsp.length ? passedInsp.map((i) => (
            <div key={i.id} className="py-[2px] text-[11px]">{i.phase_name} — {i.inspection_type}</div>
          )) : <div className="text-mil-muted">None yet</div>}
        </Panel>

        <SectionHeader label="PROJECT CLOSEOUT" />
        <Panel className="!text-[11px] !text-mil-muted !leading-[1.9] !mb-[10px]">
          ✉ Thank-you email to client<br />
          ★ Google review request (direct link)<br />
          📄 Warranty documentation packet<br />
          📄 Maintenance schedule summary<br />
          📷 Before/after photo album link
        </Panel>
        <Label>Closeout Status</Label>
        <div className="mt-1">
          <Pill variant={(job.phase_pct || 0) >= 90 ? "celeb" : "pending"}>
            {(job.phase_pct || 0) >= 90 ? "Near completion" : `Project ${job.phase_pct || 0}% complete`}
          </Pill>
        </div>
      </div>
    </div>
  );
};

export default ClientCommsTab;
