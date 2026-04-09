import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Label, Pill } from "../UIComponents";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  not_started: "pending", in_progress: "info", internal_review: "warn",
  with_consultant: "warn", stamped: "teal", complete: "complete", not_required: "pending",
  pending: "pending", under_review: "info", comments_issued: "overdue",
  corrections_in_progress: "warn", resubmitted: "info", approved: "complete",
  not_engaged: "pending", contacted: "info", proposal_received: "warn",
  engaged: "info", expired: "overdue",
};

const DELIVERABLE_LABELS: Record<string, string> = {
  survey: "Site Survey", architectural_plans: "Architectural Plans",
  structural_plans: "Structural Plans", structural_calcs: "Structural Calculations",
  structural_stamp: "Structural Stamp (CA PE)", soils_report: "Soils Report",
  civil_grading: "Civil / Grading Plans", hydrology: "Hydrology Report",
  title24_energy: "Title 24 / Energy", mep_plans: "MEP Plans", other: "Other",
};

const CONSULTANT_ROLES: Record<string, string> = {
  soils_engineer: "Soils Engineer", civil_engineer: "Civil Engineer",
  structural_engineer: "Structural Engineer (Stamp)", hers_rater: "HERS Rater",
  surveyor: "Surveyor", mep_engineer: "MEP Engineer", other: "Other Consultant",
};

interface Deliverable {
  id: string; deliverable_type: string; name: string; assigned_to: string | null;
  status: string; due_date: string | null; completed_date: string | null;
  file_url: string | null; file_name: string | null; notes: string | null;
  is_required: boolean; sort_order: number; blocker: string | null;
}

interface Submittal {
  id: string; round_number: number; agency_name: string | null; status: string;
  submitted_date: string | null; comments_issued_date: string | null;
  comments_due_date: string | null; approved_date: string | null;
  permit_number: string | null; permit_issued_date: string | null;
  expected_turnaround_days: number | null; notes: string | null;
  agency_contact_name: string | null; agency_contact_phone: string | null;
}

interface Comment {
  id: string; comment_number: string | null; sheet_reference: string | null;
  discipline: string | null; description: string; resolution: string | null;
  resolution_status: string; assigned_to: string | null;
  submittal_round_id?: string;
}

interface Consultant {
  id: string; name: string; company: string | null; role: string;
  email: string | null; phone: string | null; status: string;
  contract_amount: number | null; deliverable: string | null;
  due_date: string | null; notes: string | null;
}

const DesignPermitTab = ({ job, jobId }: { job: any; jobId: string }) => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubmittalId, setActiveSubmittalId] = useState<string | null>(null);

  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [newDel, setNewDel] = useState({ type: 'architectural_plans', name: '', assigned_to: 'Sigfried', due_date: '', is_required: true });

  const [showAddSubmittal, setShowAddSubmittal] = useState(false);
  const [newSub, setNewSub] = useState({ agency_name: '', submitted_date: new Date().toISOString().split('T')[0], expected_turnaround_days: 21 });

  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState({ comment_number: '', sheet_reference: '', discipline: 'architectural', description: '', assigned_to: 'Sigfried' });

  const [showAddConsultant, setShowAddConsultant] = useState(false);
  const [newCon, setNewCon] = useState({ name: '', company: '', role: 'soils_engineer', email: '', phone: '', contract_amount: '', deliverable: '', due_date: '' });

  const loadData = async () => {
    const [delRes, subRes, conRes] = await Promise.all([
      supabase.from('design_deliverables').select('*').eq('job_id', jobId).order('sort_order'),
      supabase.from('submittal_rounds').select('*').eq('job_id', jobId).order('round_number'),
      supabase.from('project_consultants').select('*').eq('job_id', jobId).order('created_at'),
    ]);
    setDeliverables((delRes.data || []) as Deliverable[]);
    setSubmittals((subRes.data || []) as Submittal[]);
    setConsultants((conRes.data || []) as Consultant[]);

    if (subRes.data?.length) {
      const ids = subRes.data.map((s: any) => s.id);
      const { data: commData } = await supabase.from('plan_check_comments').select('*').in('submittal_round_id', ids).order('comment_number');
      setComments((commData || []) as Comment[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [jobId]);

  const updateDeliverableStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'complete') updates.completed_date = new Date().toISOString().split('T')[0];
    await supabase.from('design_deliverables').update(updates).eq('id', id);
    setDeliverables(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    toast.success('Deliverable updated');
  };

  const addDeliverable = async () => {
    if (!newDel.name.trim()) { toast.error('Enter a name'); return; }
    const { data } = await supabase.from('design_deliverables').insert({
      job_id: jobId, job_name: job.name,
      deliverable_type: newDel.type, name: newDel.name,
      assigned_to: newDel.assigned_to, due_date: newDel.due_date || null,
      is_required: newDel.is_required, status: 'not_started',
      sort_order: deliverables.length + 1,
    } as any).select().single();
    if (data) setDeliverables(prev => [...prev, data as Deliverable]);
    setNewDel({ type: 'architectural_plans', name: '', assigned_to: 'Sigfried', due_date: '', is_required: true });
    setShowAddDeliverable(false);
    toast.success('Deliverable added');
  };

  const addSubmittal = async () => {
    const round = submittals.length + 1;
    const { data } = await supabase.from('submittal_rounds').insert({
      job_id: jobId, job_name: job.name,
      round_number: round,
      agency_name: newSub.agency_name,
      submitted_date: newSub.submitted_date,
      expected_turnaround_days: newSub.expected_turnaround_days,
      status: 'under_review',
    } as any).select().single();
    if (data) {
      setSubmittals(prev => [...prev, data as Submittal]);
      setActiveSubmittalId((data as any).id);
      await supabase.from('jobs').update({ workflow_phase: 'plan_check' } as any).eq('id', jobId);
    }
    setShowAddSubmittal(false);
    toast.success(`Submittal Round ${round} logged`);
  };

  const addComment = async () => {
    if (!newComment.description.trim() || !activeSubmittalId) { toast.error('Select a submittal round and enter description'); return; }
    const { data } = await supabase.from('plan_check_comments').insert({
      submittal_round_id: activeSubmittalId, job_id: jobId,
      comment_number: newComment.comment_number || null,
      sheet_reference: newComment.sheet_reference || null,
      discipline: newComment.discipline,
      description: newComment.description,
      assigned_to: newComment.assigned_to,
      resolution_status: 'open',
    } as any).select().single();
    if (data) setComments(prev => [...prev, data as Comment]);
    setNewComment({ comment_number: '', sheet_reference: '', discipline: 'architectural', description: '', assigned_to: 'Sigfried' });
    setShowAddComment(false);
    toast.success('Comment logged');
  };

  const addConsultant = async () => {
    if (!newCon.name.trim()) { toast.error('Enter consultant name'); return; }
    const { data } = await supabase.from('project_consultants').insert({
      job_id: jobId, job_name: job.name,
      name: newCon.name, company: newCon.company || null,
      role: newCon.role, email: newCon.email || null, phone: newCon.phone || null,
      contract_amount: newCon.contract_amount ? parseFloat(newCon.contract_amount) : null,
      deliverable: newCon.deliverable || null, due_date: newCon.due_date || null,
      status: 'not_engaged',
    } as any).select().single();
    if (data) setConsultants(prev => [...prev, data as Consultant]);
    setNewCon({ name: '', company: '', role: 'soils_engineer', email: '', phone: '', contract_amount: '', deliverable: '', due_date: '' });
    setShowAddConsultant(false);
    toast.success('Consultant added');
  };

  const resolveComment = async (id: string) => {
    await supabase.from('plan_check_comments').update({ resolution_status: 'resolved', resolved_date: new Date().toISOString().split('T')[0] } as any).eq('id', id);
    setComments(prev => prev.map(c => c.id === id ? { ...c, resolution_status: 'resolved' } : c));
    toast.success('Comment resolved');
  };

  const totalDeliverables = deliverables.filter(d => d.is_required && d.status !== 'not_required').length;
  const completeDeliverables = deliverables.filter(d => d.status === 'complete' || d.status === 'stamped').length;
  const readyToSubmit = totalDeliverables > 0 && completeDeliverables === totalDeliverables;
  const openComments = comments.filter(c => c.resolution_status === 'open' || c.resolution_status === 'in_progress');

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" /></div>;

  return (
    <div className="animate-fade-up space-y-5">

      {/* STATUS STRIP */}
      <div className="grid grid-cols-4 gap-2 max-md:grid-cols-2">
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-cream">{completeDeliverables}/{totalDeliverables}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Design Docs</div>
        </div>
        <div className={`border px-3 py-2 text-center ${readyToSubmit ? 'border-ok/30' : 'border-[rgba(255,255,255,0.05)]'} bg-[rgba(0,0,0,0.2)]`}>
          <div className={`font-mono text-lg font-bold ${readyToSubmit ? 'text-ok' : 'text-mil-muted'}`}>{readyToSubmit ? '✓' : '—'}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Ready to Submit</div>
        </div>
        <div className={`border px-3 py-2 text-center ${submittals.length > 0 ? 'border-info/30' : 'border-[rgba(255,255,255,0.05)]'} bg-[rgba(0,0,0,0.2)]`}>
          <div className={`font-mono text-lg font-bold ${submittals.length > 0 ? 'text-info' : 'text-mil-muted'}`}>{submittals.length}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Submittal Rounds</div>
        </div>
        <div className={`border px-3 py-2 text-center ${openComments.length > 0 ? 'border-danger/30 bg-[rgba(196,56,40,0.05)]' : 'border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)]'}`}>
          <div className={`font-mono text-lg font-bold ${openComments.length > 0 ? 'text-danger' : 'text-ok'}`}>{openComments.length > 0 ? openComments.length : '✓'}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Open Corrections</div>
        </div>
      </div>

      {/* ALERT: OPEN COMMENTS */}
      {openComments.length > 0 && (
        <div className="bg-[rgba(196,56,40,0.05)] border border-danger/30 border-l-4 border-l-danger p-3">
          <div className="font-raj text-xs font-bold text-danger tracking-wider mb-1">⚠ {openComments.length} OPEN PLAN CHECK CORRECTIONS</div>
          <div className="text-[11px] text-cream">These must be resolved before re-submittal. See Corrections section below.</div>
        </div>
      )}

      {/* ─── SECTION 1: DESIGN DELIVERABLES ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Design Deliverables</Label>
          <Btn size="sm" onClick={() => setShowAddDeliverable(!showAddDeliverable)}>
            {showAddDeliverable ? 'CANCEL' : '+ ADD DELIVERABLE'}
          </Btn>
        </div>

        {showAddDeliverable && (
          <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-3 mb-3">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Type</label>
                <select value={newDel.type} onChange={e => setNewDel(f => ({...f, type: e.target.value, name: DELIVERABLE_LABELS[e.target.value] || ''}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none">
                  {Object.entries(DELIVERABLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Name / Description</label>
                <input value={newDel.name} onChange={e => setNewDel(f => ({...f, name: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Assigned To</label>
                <select value={newDel.assigned_to} onChange={e => setNewDel(f => ({...f, assigned_to: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none">
                  {['Sigfried','Jake','Local PE','Soils Engineer','Civil Engineer','HERS Rater','Surveyor','Andy'].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Due Date</label>
                <input type="date" value={newDel.due_date} onChange={e => setNewDel(f => ({...f, due_date: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
            </div>
            <Btn variant="green" size="sm" onClick={addDeliverable}>ADD DELIVERABLE</Btn>
          </div>
        )}

        {deliverables.length === 0 ? (
          <div className="text-mil-muted text-xs p-4 text-center">
            No design deliverables yet. Add them above, or they auto-populate when the estimate is converted based on job type.
          </div>
        ) : (
          <div className="space-y-1">
            {deliverables.map((d, i) => {
              const isOverdue = d.due_date && new Date(d.due_date) < new Date() && !['complete','stamped','not_required'].includes(d.status);
              return (
                <div key={d.id} className={`flex items-center gap-3 px-3 py-2 ${isOverdue ? 'bg-[rgba(196,56,40,0.04)] border border-danger/15' : 'bg-[rgba(0,0,0,0.15)]'}`}>
                  <div className="font-mono text-[10px] text-mil-muted w-5">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-cream">{d.name}</span>
                      {!d.is_required && <span className="text-[8px] text-mil-muted font-raj">(if applicable)</span>}
                      {isOverdue && <span className="text-[9px] text-danger font-raj font-bold">OVERDUE</span>}
                    </div>
                    <div className="text-[10px] text-mil-muted">
                      {d.assigned_to && <span>{d.assigned_to}</span>}
                      {d.due_date && <span className="ml-2">Due: {d.due_date}</span>}
                      {d.blocker && <span className="ml-2 text-warn">Blocked: {d.blocker}</span>}
                    </div>
                  </div>
                  <select
                    value={d.status}
                    onChange={e => updateDeliverableStatus(d.id, e.target.value)}
                    className={`bg-transparent border border-[rgba(255,255,255,0.1)] text-[10px] font-raj px-2 py-1 outline-none cursor-pointer ${
                      d.status === 'complete' || d.status === 'stamped' ? 'text-ok' :
                      d.status === 'in_progress' ? 'text-info' :
                      d.status === 'internal_review' || d.status === 'with_consultant' ? 'text-warn' : 'text-mil-muted'
                    }`}
                  >
                    <option value="not_started">NOT STARTED</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="internal_review">INTERNAL REVIEW</option>
                    <option value="with_consultant">WITH CONSULTANT</option>
                    <option value="stamped">STAMPED / SIGNED</option>
                    <option value="complete">COMPLETE</option>
                    <option value="not_required">NOT REQUIRED</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {readyToSubmit && (
          <div className="mt-3 p-3 bg-[rgba(46,204,113,0.06)] border border-ok/30">
            <div className="font-raj text-xs font-bold text-ok tracking-wider">✓ ALL DESIGN DOCS COMPLETE — READY TO SUBMIT FOR PLAN CHECK</div>
          </div>
        )}
      </div>

      {/* ─── SECTION 2: PLAN CHECK SUBMITTALS ───────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Plan Check / Submittal Tracker</Label>
          <Btn size="sm" onClick={() => setShowAddSubmittal(!showAddSubmittal)}>
            {showAddSubmittal ? 'CANCEL' : `+ ROUND ${submittals.length + 1}`}
          </Btn>
        </div>

        {showAddSubmittal && (
          <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-3 mb-3">
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Agency</label>
                <input value={newSub.agency_name} onChange={e => setNewSub(f => ({...f, agency_name: e.target.value}))}
                  placeholder="City of Signal Hill Building Dept" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Submit Date</label>
                <input type="date" value={newSub.submitted_date} onChange={e => setNewSub(f => ({...f, submitted_date: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Expected Turnaround (days)</label>
                <input type="number" value={newSub.expected_turnaround_days} onChange={e => setNewSub(f => ({...f, expected_turnaround_days: parseInt(e.target.value)}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
            </div>
            <Btn variant="green" size="sm" onClick={addSubmittal}>LOG SUBMITTAL</Btn>
          </div>
        )}

        {submittals.map(sub => {
          const subComments = comments.filter(c => c.submittal_round_id === sub.id);
          const openCount = subComments.filter(c => c.resolution_status === 'open').length;
          const daysInReview = sub.submitted_date ?
            Math.floor((Date.now() - new Date(sub.submitted_date).getTime()) / 86400000) : 0;

          return (
            <div key={sub.id} className="mb-3 border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between px-3 py-2 bg-[rgba(0,0,0,0.25)] cursor-pointer"
                onClick={() => setActiveSubmittalId(activeSubmittalId === sub.id ? null : sub.id)}>
                <div className="flex items-center gap-3">
                  <span className="font-raj text-[11px] font-bold text-gold">Round {sub.round_number}</span>
                  <span className="text-[10px] text-mil-muted">{sub.agency_name}</span>
                  {sub.submitted_date && <span className="text-[10px] text-mil-muted">Submitted: {sub.submitted_date}</span>}
                  {daysInReview > 0 && !['approved','expired'].includes(sub.status) && (
                    <span className={`text-[9px] font-raj font-bold ${daysInReview > (sub.expected_turnaround_days || 21) ? 'text-danger' : 'text-mil-muted'}`}>
                      {daysInReview}d in review
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {openCount > 0 && <span className="text-[9px] text-danger font-raj">{openCount} open</span>}
                  <Pill variant={STATUS_COLORS[sub.status] || 'pending'}>{sub.status.replace(/_/g, ' ').toUpperCase()}</Pill>
                </div>
              </div>

              {activeSubmittalId === sub.id && (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] text-mil-muted font-raj tracking-wider uppercase">Plan Check Comments ({subComments.length})</div>
                    <button onClick={() => { setActiveSubmittalId(sub.id); setShowAddComment(true); }}
                      className="text-[9px] font-raj text-gold border border-gold/20 px-2 py-0.5 cursor-pointer bg-transparent hover:bg-[rgba(201,168,76,0.1)]">
                      + ADD COMMENT
                    </button>
                  </div>

                  {showAddComment && activeSubmittalId === sub.id && (
                    <div className="bg-[rgba(0,0,0,0.2)] p-3 mb-3 border border-[rgba(255,255,255,0.05)]">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input value={newComment.comment_number} onChange={e => setNewComment(f => ({...f, comment_number: e.target.value}))}
                          placeholder="Comment # (e.g. 1.1)" className="bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-1 outline-none" />
                        <input value={newComment.sheet_reference} onChange={e => setNewComment(f => ({...f, sheet_reference: e.target.value}))}
                          placeholder="Sheet ref (e.g. A-2.1)" className="bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-1 outline-none" />
                      </div>
                      <textarea value={newComment.description} onChange={e => setNewComment(f => ({...f, description: e.target.value}))}
                        placeholder="What the city is requiring..." rows={2}
                        className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-1 outline-none resize-none mb-2" />
                      <div className="flex gap-2 items-center">
                        <select value={newComment.assigned_to} onChange={e => setNewComment(f => ({...f, assigned_to: e.target.value}))}
                          className="bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-1 outline-none">
                          {['Sigfried','Jake','Civil Engineer','Andy'].map(n => <option key={n}>{n}</option>)}
                        </select>
                        <Btn variant="green" size="sm" onClick={addComment}>ADD</Btn>
                        <Btn variant="ghost" size="sm" onClick={() => setShowAddComment(false)}>CANCEL</Btn>
                      </div>
                    </div>
                  )}

                  {subComments.length === 0 ? (
                    <div className="text-mil-muted text-xs p-2">No comments logged yet.</div>
                  ) : (
                    subComments.map(c => (
                      <div key={c.id} className={`flex gap-3 py-2 border-b border-[rgba(255,255,255,0.03)] ${c.resolution_status === 'resolved' ? 'opacity-50' : ''}`}>
                        <div className="font-mono text-[10px] text-mil-muted w-10 flex-shrink-0">{c.comment_number || '—'}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-[10px] text-mil-muted mb-1">
                            {c.sheet_reference && <span>{c.sheet_reference}</span>}
                            {c.discipline && <span className="capitalize">{c.discipline}</span>}
                            {c.assigned_to && <span>→ {c.assigned_to}</span>}
                          </div>
                          <div className="text-xs text-cream">{c.description}</div>
                          {c.resolution && <div className="text-[10px] text-ok mt-1">Resolution: {c.resolution}</div>}
                        </div>
                        {c.resolution_status !== 'resolved' ? (
                          <button onClick={() => resolveComment(c.id)}
                            className="text-[9px] font-raj text-ok border border-ok/20 px-2 py-0.5 cursor-pointer bg-transparent hover:bg-[rgba(46,204,113,0.1)] flex-shrink-0">
                            RESOLVE
                          </button>
                        ) : (
                          <span className="text-[9px] font-raj text-ok flex-shrink-0">✓ RESOLVED</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {submittals.length === 0 && (
          <div className="text-mil-muted text-xs p-3">No submittals logged yet. Complete design docs first, then log the submittal.</div>
        )}
      </div>

      {/* ─── SECTION 3: EXTERNAL CONSULTANTS ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>External Consultants</Label>
          <Btn size="sm" onClick={() => setShowAddConsultant(!showAddConsultant)}>
            {showAddConsultant ? 'CANCEL' : '+ ADD CONSULTANT'}
          </Btn>
        </div>

        {showAddConsultant && (
          <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-3 mb-3">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Role</label>
                <select value={newCon.role} onChange={e => setNewCon(f => ({...f, role: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none">
                  {Object.entries(CONSULTANT_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Name / Company</label>
                <input value={newCon.name} onChange={e => setNewCon(f => ({...f, name: e.target.value}))}
                  placeholder="John Smith, PE" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Phone</label>
                <input value={newCon.phone} onChange={e => setNewCon(f => ({...f, phone: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Fee</label>
                <input type="number" value={newCon.contract_amount} onChange={e => setNewCon(f => ({...f, contract_amount: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Deliverable</label>
                <input value={newCon.deliverable} onChange={e => setNewCon(f => ({...f, deliverable: e.target.value}))}
                  placeholder="Soils report, 3 copies" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Due Date</label>
                <input type="date" value={newCon.due_date} onChange={e => setNewCon(f => ({...f, due_date: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
            </div>
            <Btn variant="green" size="sm" onClick={addConsultant}>ADD CONSULTANT</Btn>
          </div>
        )}

        {consultants.length === 0 ? (
          <div className="text-mil-muted text-xs p-3">No external consultants assigned yet.</div>
        ) : (
          <div className="space-y-2">
            {consultants.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2 bg-[rgba(0,0,0,0.15)]">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-cream font-bold">{c.name}</span>
                    <span className="text-[9px] text-mil-muted">{CONSULTANT_ROLES[c.role] || c.role}</span>
                  </div>
                  <div className="text-[10px] text-mil-muted">
                    {c.phone && <span>{c.phone} · </span>}
                    {c.deliverable && <span>{c.deliverable}</span>}
                    {c.due_date && <span> · Due: {c.due_date}</span>}
                    {c.contract_amount && <span> · ${c.contract_amount.toLocaleString()}</span>}
                  </div>
                </div>
                <Pill variant={STATUS_COLORS[c.status] || 'pending'}>{c.status.replace(/_/g, ' ')}</Pill>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default DesignPermitTab;
