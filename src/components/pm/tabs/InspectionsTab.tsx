import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Inspection, Job } from "@/lib/types";
import { SectionHeader, Panel, Btn, Label, Pill } from "../UIComponents";
import { toast } from "sonner";

const INSPECTION_TYPES = [
  "Foundation Pre-Pour",
  "Framing Rough",
  "Rough Plumbing",
  "Rough Electrical",
  "HVAC Rough",
  "Insulation",
  "Drywall / Lath",
  "Energy (Title 24)",
  "Final Building",
  "Final Plumbing",
  "Final Electrical",
  "Final HVAC",
  "Other",
];

const statusVariant = (result: string | null) => {
  const r = (result || "").toUpperCase();
  if (r === "PASS") return "pass";
  if (r === "FAIL") return "fail";
  if (r === "SCHEDULED") return "active";
  if (r === "REQUESTED") return "pending";
  return "pending";
};

const InspectionsTab = ({ job, inspections, onUpdate }: { job: Job; inspections: Inspection[]; onUpdate: (inspections: Inspection[]) => void }) => {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState(INSPECTION_TYPES[0]);
  const [phase, setPhase] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = async () => {
    if (!type) { toast.error("Select an inspection type"); return; }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("inspections")
      .insert({
        job_id: job.id,
        inspection_type: type,
        phase_name: phase || null,
        notes: notes || null,
        result: "REQUESTED",
        scheduled_date: null,
        action: true,
      } as any)
      .select()
      .single();
    setSubmitting(false);
    if (error) { toast.error("Failed to submit request"); return; }
    toast.success(`Inspection request submitted — Sonny/Arnel will schedule with the city`);
    onUpdate([...(inspections || []), data as Inspection]);
    setShowForm(false);
    setType(INSPECTION_TYPES[0]);
    setPhase("");
    setNotes("");
  };

  const requested = inspections.filter(i => (i.result || "").toUpperCase() === "REQUESTED");
  const scheduled = inspections.filter(i => (i.result || "").toUpperCase() === "SCHEDULED");
  const completed = inspections.filter(i => ["PASS", "FAIL", "PASSED", "FAILED"].includes((i.result || "").toUpperCase()));

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-[14px]">
        <Label>Inspection Schedule</Label>
        <Btn variant="green" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "CANCEL" : "+ REQUEST INSPECTION"}
        </Btn>
      </div>

      {showForm && (
        <Panel className="mb-4 border border-gold/30">
          <div className="font-raj text-[11px] font-bold text-gold tracking-[1px] mb-3">REQUEST INSPECTION — Sonny/Arnel will schedule with the city</div>
          <div className="grid grid-cols-2 gap-3 mb-3 max-md:grid-cols-1">
            <div>
              <Label>Inspection Type *</Label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full mt-1 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-cream font-raj text-[11px] px-2 py-2 outline-none focus:border-gold">
                {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Phase / Trade (optional)</Label>
              <input type="text" value={phase} onChange={e => setPhase(e.target.value)} placeholder="e.g. Framing, Plumbing" className="w-full mt-1 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-cream font-raj text-[11px] px-2 py-2 outline-none focus:border-gold" />
            </div>
          </div>
          <div className="mb-3">
            <Label>Notes for Sonny/Arnel (optional)</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any specific requirements, access notes, or timing preferences..." className="w-full mt-1 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-cream font-raj text-[11px] px-2 py-2 outline-none focus:border-gold resize-none" />
          </div>
          <Btn variant="green" size="sm" onClick={submitRequest} disabled={submitting}>
            {submitting ? "SUBMITTING..." : "SUBMIT REQUEST →"}
          </Btn>
        </Panel>
      )}

      {requested.length > 0 && (
        <div className="mb-4">
          <div className="font-raj text-[10px] tracking-[2px] text-warn font-bold mb-2">⏳ AWAITING SCHEDULING ({requested.length})</div>
          {requested.map(i => (
            <div key={i.id} className="flex items-center gap-3 px-3 py-2 mb-1 bg-[rgba(201,168,76,0.05)] border border-warn/20">
              <div className="flex-1">
                <div className="text-xs font-raj font-bold text-cream">{i.inspection_type}</div>
                {(i as any).phase_name && <div className="text-[10px] text-mil-muted">Phase: {(i as any).phase_name}</div>}
                {i.notes && <div className="text-[10px] text-mil-muted italic">{i.notes}</div>}
              </div>
              <Pill variant="pending">REQUESTED</Pill>
            </div>
          ))}
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="mb-4">
          <div className="font-raj text-[10px] tracking-[2px] text-info font-bold mb-2">📅 SCHEDULED ({scheduled.length})</div>
          {scheduled.map(i => (
            <div key={i.id} className="flex items-center gap-3 px-3 py-2 mb-1 bg-[rgba(0,149,255,0.05)] border border-info/20">
              <div className="flex-1">
                <div className="text-xs font-raj font-bold text-cream">{i.inspection_type}</div>
                <div className="text-[10px] text-mil-muted">{i.scheduled_date} {(i as any).phase_name ? `— ${(i as any).phase_name}` : ""}</div>
              </div>
              <Pill variant="active">SCHEDULED</Pill>
            </div>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="mb-4">
          <div className="font-raj text-[10px] tracking-[2px] text-mil-muted font-bold mb-2">✅ COMPLETED ({completed.length})</div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>{["Phase", "Type", "Date", "Result", "Notes"].map(h => (
                <th key={h} className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase p-[6px_10px] text-left border-b border-[rgba(255,255,255,0.06)]">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {completed.map(i => (
                <tr key={i.id} className="hover:bg-[rgba(190,180,154,0.03)]">
                  <td className="p-[7px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{(i as any).phase_name || "—"}</td>
                  <td className="p-[7px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{i.inspection_type}</td>
                  <td className="p-[7px_10px] text-xs border-b border-[rgba(255,255,255,0.03)] font-mono">{i.scheduled_date || "—"}</td>
                  <td className="p-[7px_10px] border-b border-[rgba(255,255,255,0.03)]"><Pill variant={statusVariant(i.result)}>{i.result || "PENDING"}</Pill></td>
                  <td className="p-[7px_10px] text-[11px] text-mil-muted border-b border-[rgba(255,255,255,0.03)]">{i.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inspections.length === 0 && !showForm && (
        <div className="text-mil-muted text-xs p-4 text-center">No inspections yet. Use + REQUEST INSPECTION to notify Sonny/Arnel.</div>
      )}
    </div>
  );
};

export default InspectionsTab;
