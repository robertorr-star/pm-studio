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

const TEST_TYPE_LABELS: Record<string, { name: string; why: string; enables: string; days: number }> = {
  water_flow: { name: 'Water Flow Test', why: 'Required for fire sprinkler hydraulic calculations', enables: 'OCFA fire sprinkler submittal', days: 10 },
  soils_geotech: { name: 'Soils / Geotechnical Investigation', why: 'Required for foundation design and building permit', enables: 'Structural foundation design + permit submittal', days: 35 },
  hers_pre_permit: { name: 'HERS Pre-Permit Energy Review', why: 'Required to generate CF1R compliance certificate', enables: 'Building permit submittal', days: 7 },
  hers_insulation: { name: 'HERS Insulation Field Verification', why: 'Required before insulation rough inspection', enables: 'Insulation inspection pass', days: 3 },
  hers_duct_leakage: { name: 'HERS Duct Leakage Test', why: 'Required before HVAC can be covered', enables: 'HVAC rough inspection pass', days: 3 },
  boundary_survey: { name: 'Boundary Survey', why: 'Required for accurate site plan and setback verification', enables: 'Site plan + grading plan', days: 21 },
  topo_survey: { name: 'Topographic Survey', why: 'Required for grading plan design', enables: 'Grading plan + grading permit', days: 21 },
  special_inspection: { name: 'Special Inspections Program', why: 'Required when structural engineer specifies', enables: 'Concrete pours, structural steel inspections', days: 0 },
};

const UTILITY_DEFAULTS: Record<string, any> = {
  electric: { company: 'Southern California Edison', portal: 'https://www.sce.com', days: 5, critical: true },
  gas: { company: 'Southern California Gas', portal: 'https://www.socalgas.com', days: 7, critical: false },
  water: { company: 'Mutual Water Company', portal: '', days: 7, critical: true },
  sewer: { company: 'OC Sanitation District', portal: 'https://www.ocsan.gov', days: 10, critical: true },
  telecom: { company: 'AT&T or Spectrum', portal: '', days: 14, critical: false },
};

const UTIL_COLORS: Record<string, string> = {
  not_started: 'text-danger', applied: 'text-warn', under_review: 'text-warn',
  rep_assigned: 'text-info', design_complete: 'text-info', scheduled: 'text-gold',
  installed: 'text-ok', complete: 'text-ok',
};

const DesignPermitTab = ({ job, jobId }: { job: any; jobId: string }) => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [utilities, setUtilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubmittalId, setActiveSubmittalId] = useState<string | null>(null);
  const [expandedUtility, setExpandedUtility] = useState<string | null>(null);
  const [showCallLog, setShowCallLog] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [newDel, setNewDel] = useState({ type: 'architectural_plans', name: '', assigned_to: 'Sigfried', due_date: '', is_required: true });

  const [showAddSubmittal, setShowAddSubmittal] = useState(false);
  const [newSub, setNewSub] = useState({ agency_name: '', submitted_date: new Date().toISOString().split('T')[0], expected_turnaround_days: 21 });

  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState({ comment_number: '', sheet_reference: '', discipline: 'architectural', description: '', assigned_to: 'Sigfried' });

  const [showAddConsultant, setShowAddConsultant] = useState(false);
  const [newCon, setNewCon] = useState({ name: '', company: '', role: 'soils_engineer', email: '', phone: '', contract_amount: '', deliverable: '', due_date: '' });

  const [showAddTest, setShowAddTest] = useState(false);
  const [newTest, setNewTest] = useState({ test_type: 'water_flow', test_name: 'Water Flow Test', why_required: '', enables_what: '', provider_name: '', provider_phone: '', estimated_turnaround_days: 14, estimated_cost: '', follow_up_frequency_days: 5 });

  const [showAddUtility, setShowAddUtility] = useState(false);
  const [newUtility, setNewUtility] = useState({ utility_type: 'electric', utility_company: 'Southern California Edison', portal_url: 'https://www.sce.com', follow_up_frequency_days: 5, is_critical_path: true });
  const [newCallLog, setNewCallLog] = useState({ contacted_by: 'Sonny', utility_rep_name: '', reference_number: '', status_reported: '', next_step: '', notes: '' });

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
    const { data: testData } = await supabase.from('project_required_tests').select('*').eq('job_id', jobId).order('created_at');
    setTests(testData || []);
    const { data: utilData } = await supabase.from('utility_coordination').select('*').eq('job_id', jobId).order('utility_type');
    setUtilities(utilData || []);
    const { data: checklistData } = await supabase.from('submittal_checklist_items').select('*').eq('job_id', jobId).order('sort_order');
    setChecklist(checklistData || []);
    setLoading(false);
  };

  const addTest = async () => {
    const defaults = TEST_TYPE_LABELS[newTest.test_type] || { name: '', why: '', enables: '', days: 14 };
    const { data } = await supabase.from('project_required_tests').insert({
      job_id: jobId, job_name: job.name,
      test_type: newTest.test_type,
      test_name: newTest.test_name || defaults.name,
      why_required: newTest.why_required || defaults.why,
      enables_what: newTest.enables_what || defaults.enables,
      provider_name: newTest.provider_name,
      provider_phone: newTest.provider_phone,
      estimated_turnaround_days: newTest.estimated_turnaround_days || defaults.days,
      estimated_cost: newTest.estimated_cost ? parseFloat(newTest.estimated_cost) : null,
      status: 'not_ordered',
      follow_up_frequency_days: newTest.follow_up_frequency_days,
      next_follow_up_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    } as any).select().single();
    if (data) setTests(prev => [...prev, data]);
    setShowAddTest(false);
    toast.success('Test requirement added');
  };

  const updateTestStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'complete') updates.completed_date = new Date().toISOString().split('T')[0];
    await supabase.from('project_required_tests').update(updates).eq('id', id);
    setTests(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const addUtility = async () => {
    const defaults = UTILITY_DEFAULTS[newUtility.utility_type] || {};
    const nextFollowUp = new Date();
    nextFollowUp.setDate(nextFollowUp.getDate() + (newUtility.follow_up_frequency_days || 5));
    const { data } = await supabase.from('utility_coordination').insert({
      job_id: jobId, job_name: job.name,
      utility_type: newUtility.utility_type,
      utility_company: newUtility.utility_company || defaults.company,
      portal_url: newUtility.portal_url || defaults.portal,
      follow_up_frequency_days: newUtility.follow_up_frequency_days || defaults.days,
      is_critical_path: newUtility.is_critical_path,
      status: 'not_started',
      follow_up_count: 0,
      next_follow_up_date: nextFollowUp.toISOString().split('T')[0],
    } as any).select().single();
    if (data) setUtilities(prev => [...prev, data]);
    setShowAddUtility(false);
    toast.success('Utility tracking added');
  };

  const logCall = async (utilityId: string) => {
    const { data } = await supabase.from('utility_contact_log').insert({
      utility_coordination_id: utilityId, job_id: jobId,
      contact_date: new Date().toISOString().split('T')[0],
      contacted_by: newCallLog.contacted_by,
      utility_rep_name: newCallLog.utility_rep_name,
      reference_number: newCallLog.reference_number,
      status_reported: newCallLog.status_reported,
      next_step: newCallLog.next_step,
      notes: newCallLog.notes,
    } as any).select().single();
    if (data) {
      const util = utilities.find(u => u.id === utilityId);
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (util?.follow_up_frequency_days || 5));
      await supabase.from('utility_coordination').update({
        last_contact_date: new Date().toISOString().split('T')[0],
        last_contact_person: newCallLog.utility_rep_name,
        last_contact_notes: newCallLog.notes,
        last_contact_reference: newCallLog.reference_number,
        status: newCallLog.status_reported || util?.status,
        follow_up_count: (util?.follow_up_count || 0) + 1,
        next_follow_up_date: nextDate.toISOString().split('T')[0],
      } as any).eq('id', utilityId);
      setUtilities(prev => prev.map(u => u.id === utilityId ? {
        ...u, last_contact_date: new Date().toISOString().split('T')[0],
        last_contact_person: newCallLog.utility_rep_name,
        follow_up_count: (u.follow_up_count || 0) + 1,
        next_follow_up_date: nextDate.toISOString().split('T')[0],
      } : u));
      setNewCallLog({ contacted_by: 'Sonny', utility_rep_name: '', reference_number: '', status_reported: '', next_step: '', notes: '' });
      setShowCallLog(null);
      toast.success('Call logged. Next follow-up: ' + nextDate.toLocaleDateString());
    }
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

  const toggleChecklistItem = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'complete' ? 'not_started' : 'complete';
    await supabase.from('submittal_checklist_items').update({ status: newStatus } as any).eq('id', id);
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const deferredItems = checklist.filter(c => c.is_deferred && c.status !== 'complete' && c.status !== 'not_applicable');
  const permitIssued = submittals.some((s: any) => s.permit_number && s.permit_issued_date);

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

      {/* ─── SECTION 2: REQUIRED TESTS ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label>Required Tests</Label>
            <div className="text-[9px] text-mil-muted mt-1">Must be ordered and completed BEFORE the submittals that depend on them</div>
          </div>
          <Btn size="sm" onClick={() => setShowAddTest(!showAddTest)}>{showAddTest ? 'CANCEL' : '+ ADD TEST'}</Btn>
        </div>

        {showAddTest && (
          <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-3 mb-3">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Test Type</label>
                <select value={newTest.test_type}
                  onChange={e => {
                    const defaults = TEST_TYPE_LABELS[e.target.value] || { name: '', why: '', enables: '', days: 14 };
                    setNewTest(f => ({ ...f, test_type: e.target.value, test_name: defaults.name, why_required: defaults.why, enables_what: defaults.enables, estimated_turnaround_days: defaults.days }));
                  }}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none">
                  {Object.entries(TEST_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Provider</label>
                <input value={newTest.provider_name} onChange={e => setNewTest(f => ({...f, provider_name: e.target.value}))}
                  placeholder="Company name" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Why Required</label>
                <input value={newTest.why_required} onChange={e => setNewTest(f => ({...f, why_required: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Enables</label>
                <input value={newTest.enables_what} onChange={e => setNewTest(f => ({...f, enables_what: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
            </div>
            <Btn variant="green" size="sm" onClick={addTest}>ADD TEST</Btn>
          </div>
        )}

        {tests.length === 0 ? (
          <div className="text-mil-muted text-xs p-3">No required tests added yet. Common for new construction: water flow test, soils investigation, boundary survey, HERS pre-permit.</div>
        ) : (
          <div className="space-y-2">
            {tests.map(test => {
              const isOverdue = test.next_follow_up_date && new Date(test.next_follow_up_date) < new Date() && !['complete'].includes(test.status);
              return (
                <div key={test.id} className={`px-3 py-2 ${isOverdue ? 'bg-[rgba(196,56,40,0.05)] border border-danger/20' : 'bg-[rgba(0,0,0,0.15)]'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${test.status === 'complete' ? 'text-ok line-through' : 'text-cream'}`}>{test.test_name}</span>
                        {isOverdue && <span className="text-[8px] text-danger font-raj font-bold">FOLLOW UP NOW</span>}
                      </div>
                      <div className="text-[10px] text-mil-muted">
                        {test.enables_what && <span>Enables: <span className="text-gold">{test.enables_what}</span></span>}
                        {test.provider_name && <span className="ml-2">· {test.provider_name}</span>}
                        {test.estimated_turnaround_days && <span className="ml-2">· ~{test.estimated_turnaround_days}d turnaround</span>}
                      </div>
                      {test.why_required && <div className="text-[10px] text-mil-muted italic">{test.why_required}</div>}
                    </div>
                    <select value={test.status} onChange={e => updateTestStatus(test.id, e.target.value)}
                      className={`bg-transparent border border-[rgba(255,255,255,0.1)] text-[10px] px-2 py-1 outline-none cursor-pointer ml-3 ${test.status === 'complete' ? 'text-ok' : test.status === 'not_ordered' ? 'text-danger' : 'text-warn'}`}>
                      <option value="not_ordered">NOT ORDERED</option>
                      <option value="ordering">ORDERING</option>
                      <option value="ordered">ORDERED</option>
                      <option value="scheduled">SCHEDULED</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="complete">COMPLETE ✓</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── SECTION 3: UTILITY COORDINATION ────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label>Utility Coordination</Label>
            <div className="text-[9px] text-mil-muted mt-1">Track every utility — Edison takes 12-20 weeks. Order on Day 1.</div>
          </div>
          <Btn size="sm" onClick={() => setShowAddUtility(!showAddUtility)}>{showAddUtility ? 'CANCEL' : '+ ADD UTILITY'}</Btn>
        </div>

        {!utilities.some(u => u.utility_type === 'electric') && (
          <div className="mb-3 p-2 bg-[rgba(196,56,40,0.06)] border border-danger/20">
            <div className="text-[10px] text-danger font-raj font-bold">⚠ SOUTHERN CALIFORNIA EDISON NOT ADDED — Edison takes 12-20 WEEKS. Add and apply TODAY.</div>
          </div>
        )}

        {showAddUtility && (
          <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-3 mb-3">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Type</label>
                <select value={newUtility.utility_type}
                  onChange={e => {
                    const d = UTILITY_DEFAULTS[e.target.value] || {};
                    setNewUtility(f => ({ ...f, utility_type: e.target.value, utility_company: d.company || '', portal_url: d.portal || '', follow_up_frequency_days: d.days || 7, is_critical_path: d.critical !== false }));
                  }}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none">
                  <option value="electric">Electric (SCE / Edison)</option>
                  <option value="gas">Gas (SoCalGas)</option>
                  <option value="water">Water District</option>
                  <option value="sewer">Sewer / Wastewater</option>
                  <option value="telecom">Telecom (AT&T / Spectrum)</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Company</label>
                <input value={newUtility.utility_company} onChange={e => setNewUtility(f => ({...f, utility_company: e.target.value}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Follow-Up Every (days)</label>
                <input type="number" value={newUtility.follow_up_frequency_days} onChange={e => setNewUtility(f => ({...f, follow_up_frequency_days: parseInt(e.target.value)}))}
                  className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none" />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" checked={newUtility.is_critical_path} onChange={e => setNewUtility(f => ({...f, is_critical_path: e.target.checked}))} className="accent-gold" />
                <label className="text-[10px] text-cream">Critical path (blocks final inspection)</label>
              </div>
            </div>
            <Btn variant="green" size="sm" onClick={addUtility}>ADD UTILITY</Btn>
          </div>
        )}

        {utilities.length === 0 ? (
          <div className="text-mil-muted text-xs p-3">No utilities added yet.</div>
        ) : (
          <div className="space-y-2">
            {utilities.map(util => {
              const followUpOverdue = util.next_follow_up_date && new Date(util.next_follow_up_date) < new Date() && !['complete', 'installed'].includes(util.status);
              const daysSinceContact = util.last_contact_date ? Math.floor((Date.now() - new Date(util.last_contact_date).getTime()) / 86400000) : null;
              return (
                <div key={util.id} className={`border ${followUpOverdue ? 'border-danger/30 bg-[rgba(196,56,40,0.05)]' : 'border-[rgba(255,255,255,0.06)]'}`}>
                  <div className="flex items-center gap-3 px-3 py-2 cursor-pointer" onClick={() => setExpandedUtility(expandedUtility === util.id ? null : util.id)}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-cream font-bold">{util.utility_company}</span>
                        {util.is_critical_path && <span className="text-[8px] font-raj text-warn">CRITICAL PATH</span>}
                        {followUpOverdue && <span className="text-[8px] font-raj font-bold text-danger bg-[rgba(196,56,40,0.1)] px-1 animate-blink">CALL NOW</span>}
                      </div>
                      <div className="text-[10px] text-mil-muted">
                        {util.follow_up_count > 0 && <span>{util.follow_up_count} follow-ups logged</span>}
                        {daysSinceContact !== null && <span className="ml-2">Last contact: {daysSinceContact}d ago</span>}
                        {util.application_number && <span className="ml-2">App #: {util.application_number}</span>}
                      </div>
                    </div>
                    <span className={`font-raj text-[11px] font-bold ${UTIL_COLORS[util.status] || 'text-mil-muted'}`}>
                      {(util.status || '').replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-[8px] text-mil-muted">{expandedUtility === util.id ? '▲' : '▼'}</span>
                  </div>

                  {expandedUtility === util.id && (
                    <div className="px-3 pb-3 border-t border-[rgba(255,255,255,0.05)]">
                      <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
                        <div>
                          <div className="text-[9px] text-mil-muted font-raj uppercase mb-1">Application #</div>
                          <input defaultValue={util.application_number || ''} onBlur={async e => {
                            await supabase.from('utility_coordination').update({ application_number: e.target.value } as any).eq('id', util.id);
                            setUtilities(prev => prev.map(u => u.id === util.id ? { ...u, application_number: e.target.value } : u));
                          }} placeholder="Enter when received" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none" />
                        </div>
                        <div>
                          <div className="text-[9px] text-mil-muted font-raj uppercase mb-1">Assigned Rep</div>
                          <input defaultValue={util.assigned_rep_name || ''} onBlur={async e => {
                            await supabase.from('utility_coordination').update({ assigned_rep_name: e.target.value } as any).eq('id', util.id);
                          }} placeholder="Get their direct line" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none" />
                        </div>
                        <div>
                          <div className="text-[9px] text-mil-muted font-raj uppercase mb-1">Rep Direct Line</div>
                          <input defaultValue={util.assigned_rep_phone || ''} onBlur={async e => {
                            await supabase.from('utility_coordination').update({ assigned_rep_phone: e.target.value } as any).eq('id', util.id);
                          }} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none" />
                        </div>
                      </div>

                      <div className="flex gap-2 mb-3">
                        <select value={util.status} onChange={async e => {
                          await supabase.from('utility_coordination').update({ status: e.target.value } as any).eq('id', util.id);
                          setUtilities(prev => prev.map(u => u.id === util.id ? { ...u, status: e.target.value } : u));
                        }} className="bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none cursor-pointer">
                          <option value="not_started">Not Started</option>
                          <option value="applied">Applied</option>
                          <option value="under_review">Under Review</option>
                          <option value="rep_assigned">Rep Assigned</option>
                          <option value="design_complete">Design Complete</option>
                          <option value="scheduled">Scheduled for Install</option>
                          <option value="installed">Installed</option>
                          <option value="complete">Complete ✓</option>
                        </select>
                        <button onClick={() => setShowCallLog(showCallLog === util.id ? null : util.id)}
                          className={`px-3 py-1 font-raj text-[10px] font-bold cursor-pointer border bg-transparent ${followUpOverdue ? 'border-danger text-danger hover:bg-[rgba(196,56,40,0.1)]' : 'border-gold/20 text-gold hover:bg-[rgba(201,168,76,0.1)]'}`}>
                          LOG CALL / CONTACT
                        </button>
                        {util.portal_url && (
                          <a href={util.portal_url} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1 font-raj text-[10px] border border-[rgba(255,255,255,0.1)] text-mil-muted hover:text-cream cursor-pointer">
                            PORTAL →
                          </a>
                        )}
                      </div>

                      {showCallLog === util.id && (
                        <div className="bg-[rgba(0,0,0,0.25)] p-3 mb-3 border border-[rgba(255,255,255,0.05)]">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input value={newCallLog.utility_rep_name} onChange={e => setNewCallLog(f => ({...f, utility_rep_name: e.target.value}))}
                              placeholder="Rep name you spoke to" className="bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none" />
                            <input value={newCallLog.reference_number} onChange={e => setNewCallLog(f => ({...f, reference_number: e.target.value}))}
                              placeholder="Reference/ticket number (ALWAYS ASK)" className="bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none" />
                            <input value={newCallLog.status_reported} onChange={e => setNewCallLog(f => ({...f, status_reported: e.target.value}))}
                              placeholder="Status they reported" className="bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none" />
                            <input value={newCallLog.next_step} onChange={e => setNewCallLog(f => ({...f, next_step: e.target.value}))}
                              placeholder="What they said happens next" className="bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none" />
                          </div>
                          <textarea value={newCallLog.notes} onChange={e => setNewCallLog(f => ({...f, notes: e.target.value}))}
                            placeholder="Full notes from the call..." rows={2}
                            className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none resize-none mb-2" />
                          <div className="flex gap-2">
                            <Btn variant="green" size="sm" onClick={() => logCall(util.id)}>LOG CALL</Btn>
                            <div className="text-[9px] text-mil-muted self-center">Next follow-up auto-set to {util.follow_up_frequency_days} days from now</div>
                          </div>
                        </div>
                      )}

                      {util.last_contact_date && (
                        <div className="text-[10px] text-mil-muted bg-[rgba(0,0,0,0.15)] px-2 py-1">
                          Last contact: {util.last_contact_date} — {util.last_contact_person} — {util.last_contact_notes?.substring(0, 100)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── SECTION 4: PLAN CHECK SUBMITTALS ───────────────────── */}
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

      {/* ─── DEFERRED SUBMITTALS ALERT ───────────────────────────── */}
      {permitIssued && deferredItems.length > 0 && (
        <div className="p-3 border-2 border-danger bg-danger/08">
          <div className="font-raj text-danger font-bold tracking-wider text-sm mb-2">
            ⛔ PERMIT ISSUED — {deferredItems.length} DEFERRED SUBMITTAL(S) PENDING
          </div>
          <div className="text-[11px] text-cream mb-2">These must be submitted NOW. Each one can stall a job inspection.</div>
          {deferredItems.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 py-1">
              <span className="text-[8px] text-danger font-raj font-bold">⚠</span>
              <span className="text-[11px] text-cream">{item.item_text}</span>
              <span className="text-[9px] text-mil-muted">→ {item.responsible}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── SECTION 3: PRE-SUBMITTAL CHECKLIST ─────────────────── */}
      {checklist.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <Label>Pre-Submittal Checklist</Label>
              <div className="text-[9px] text-mil-muted mt-1">Click any item to expand WHO / WHAT / WHEN / WHERE / HOW details</div>
            </div>
            <div className="font-mono text-xs text-mil-muted">{checklist.filter(c => c.status === 'complete').length}/{checklist.length}</div>
          </div>
          <div className="border border-[rgba(255,255,255,0.06)] overflow-hidden">
            {checklist.map((item: any) => (
              <div key={item.id} className={`border-b border-[rgba(255,255,255,0.03)] ${item.is_deferred ? 'border-l-2 border-l-danger' : ''}`}>
                {/* COLLAPSED ROW */}
                <div
                  className={`flex items-start gap-2 px-3 py-[7px] cursor-pointer hover:bg-[rgba(255,255,255,0.02)]
                    ${item.status === 'complete' ? 'opacity-50' : ''}
                    ${item.is_blocker && item.status !== 'complete' ? 'bg-[rgba(196,56,40,0.04)]' : ''}
                  `}
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                >
                  <input
                    type="checkbox"
                    checked={item.status === 'complete'}
                    onChange={e => { e.stopPropagation(); toggleChecklistItem(item.id, item.status); }}
                    className="accent-gold mt-[2px] flex-shrink-0 cursor-pointer"
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] ${item.status === 'complete' ? 'line-through text-mil-muted' : 'text-cream'}`}>
                        {item.item_number}. {item.item_text}
                      </span>
                      {item.is_deferred && (
                        <span className="text-[8px] font-raj font-bold text-danger bg-danger/10 px-1 border border-danger/20">DEFERRED</span>
                      )}
                      {item.is_blocker && item.status !== 'complete' && (
                        <span className="text-[8px] font-raj font-bold text-warn bg-warn/10 px-1">BLOCKER</span>
                      )}
                    </div>
                    {item.recipient_who && (
                      <div className="text-[9px] text-mil-muted mt-[2px]">→ {item.recipient_who}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] text-mil-muted">{item.responsible}</span>
                    <span className="text-[8px] text-mil-muted">{expandedItem === item.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* EXPANDED DETAIL */}
                {expandedItem === item.id && (
                  <div className="mx-3 mb-3 px-3 py-3 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.06)]">
                    {item.recipient_who && (
                      <div className="mb-2">
                        <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase mb-1">WHO</div>
                        <div className="text-[11px] text-cream">{item.recipient_who}</div>
                      </div>
                    )}
                    {item.submit_what && (
                      <div className="mb-2">
                        <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase mb-1">WHAT TO SUBMIT</div>
                        <div className="text-[11px] text-cream whitespace-pre-line">{item.submit_what}</div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      {item.submit_when && (
                        <div>
                          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase mb-1">WHEN</div>
                          <div className="text-[11px] text-cream">{item.submit_when}</div>
                        </div>
                      )}
                      {item.submit_where && (
                        <div>
                          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase mb-1">WHERE</div>
                          <div className="text-[11px] text-cream">{item.submit_where}</div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      {item.submit_copies && (
                        <div>
                          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase mb-1">FORMAT / COPIES</div>
                          <div className="text-[11px] text-cream">{item.submit_copies}</div>
                        </div>
                      )}
                      {item.review_timeline && (
                        <div>
                          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase mb-1">REVIEW TIME</div>
                          <div className="text-[11px] text-cream">{item.review_timeline}</div>
                        </div>
                      )}
                    </div>
                    {item.if_missed && (
                      <div className={`p-2 mt-1 ${item.is_deferred ? 'bg-danger/08 border border-danger/20' : 'bg-[rgba(0,0,0,0.2)]'}`}>
                        <div className="text-[9px] text-danger font-raj font-bold tracking-wider uppercase mb-1">⚠ IF MISSED OR DELAYED</div>
                        <div className="text-[11px] text-cream">{item.if_missed}</div>
                      </div>
                    )}
                    {item.is_deferred && item.deferred_trigger && (
                      <div className="mt-2 p-2 bg-warn/05 border border-warn/20">
                        <div className="text-[9px] text-warn font-raj font-bold uppercase mb-1">TRIGGER</div>
                        <div className="text-[11px] text-cream">{item.deferred_trigger}</div>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                      <select
                        value={item.status}
                        onChange={async e => {
                          await supabase.from('submittal_checklist_items').update({ status: e.target.value } as any).eq('id', item.id);
                          setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, status: e.target.value } : c));
                        }}
                        className="bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none cursor-pointer"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="complete">Complete ✓</option>
                        <option value="not_applicable">N/A</option>
                        <option value="blocked">Blocked</option>
                      </select>
                      <input
                        placeholder="Notes..."
                        defaultValue={item.notes || ''}
                        onBlur={async e => {
                          await supabase.from('submittal_checklist_items').update({ notes: e.target.value } as any).eq('id', item.id);
                          setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, notes: e.target.value } : c));
                        }}
                        className="flex-1 bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-[10px] px-2 py-1 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── SECTION 4: EXTERNAL CONSULTANTS ─────────────────────── */}
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
