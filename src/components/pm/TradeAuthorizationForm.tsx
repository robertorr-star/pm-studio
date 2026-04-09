import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Btn, FormInput, FormSelect, Label, Pill } from "./UIComponents";
import { toast } from "sonner";

interface FieldEmployee { id: string; display_name: string | null; first_name: string; last_name: string; role: string; primary_trades: string[]; hourly_rate: number | null; }
interface CrewAllocation { employee_id: string; employee_name: string; role_on_trade: string; allocated_hours: number; }
interface Props { jobId: string; jobName: string; tradeName?: string; estimatedHours?: number; onClose: () => void; onSaved: () => void; existingAuthId?: string; }

const TradeAuthorizationForm = ({ jobId, jobName, tradeName = "", estimatedHours = 0, onClose, onSaved, existingAuthId }: Props) => {
  const [employees, setEmployees] = useState<FieldEmployee[]>([]);
  const [form, setForm] = useState({
    trade_name: tradeName, estimated_hours: estimatedHours, estimated_labor_cost: 0, estimated_team_size: 0,
    estimated_duration_days: 0, authorized_hours: 0, authorized_team_size: 0,
    authorized_start_date: "", authorized_end_date: "", authorization_notes: "",
    subcontractor_name: "", sub_authorized_hours: 0, sub_contract_amount: 0,
  });
  const [crew, setCrew] = useState<CrewAllocation[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("field_employees").select("id, display_name, first_name, last_name, role, primary_trades, hourly_rate").eq("is_active", true).order("first_name");
      setEmployees((data as FieldEmployee[]) || []);
      if (existingAuthId) {
        const { data: auth } = await supabase.from("trade_authorizations").select("*").eq("id", existingAuthId).single();
        if (auth) {
          setForm({ trade_name: auth.trade_name || "", estimated_hours: Number(auth.estimated_hours) || 0, estimated_labor_cost: Number(auth.estimated_labor_cost) || 0, estimated_team_size: auth.estimated_team_size || 0, estimated_duration_days: auth.estimated_duration_days || 0, authorized_hours: Number(auth.authorized_hours) || 0, authorized_team_size: auth.authorized_team_size || 0, authorized_start_date: auth.authorized_start_date || "", authorized_end_date: auth.authorized_end_date || "", authorization_notes: auth.authorization_notes || "", subcontractor_name: auth.subcontractor_name || "", sub_authorized_hours: Number(auth.sub_authorized_hours) || 0, sub_contract_amount: Number(auth.sub_contract_amount) || 0 });
        }
        const { data: crewData } = await supabase.from("trade_authorization_crew").select("*").eq("authorization_id", existingAuthId);
        if (crewData) setCrew(crewData.map(c => ({ employee_id: c.employee_id, employee_name: c.employee_name || "", role_on_trade: c.role_on_trade || "Laborer", allocated_hours: Number(c.allocated_hours) || 0 })));
      }
    };
    load();
  }, [existingAuthId, jobId]);

  const crewTotal = crew.reduce((s, c) => s + c.allocated_hours, 0);

  const addCrew = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp || crew.find(c => c.employee_id === empId)) return;
    setCrew([...crew, { employee_id: empId, employee_name: emp.display_name || `${emp.first_name} ${emp.last_name}`, role_on_trade: emp.role, allocated_hours: 0 }]);
  };

  const submit = async () => {
    if (!form.trade_name) { toast.error("Trade name required"); return; }
    if (form.authorized_hours <= 0) { toast.error("Authorized hours must be > 0"); return; }
    if (crew.length === 0) { toast.error("At least one crew member required"); return; }
    setSubmitting(true);
    try {
      const authData = { job_id: jobId, trade_name: form.trade_name, estimated_hours: form.estimated_hours, authorized_hours: form.authorized_hours, authorized_team_size: crew.length, authorized_start_date: form.authorized_start_date || null, authorized_end_date: form.authorized_end_date || null, authorization_notes: form.authorization_notes || null, subcontractor_name: form.subcontractor_name || null, status: "pending_authorization", submitted_by: "Leo", submitted_date: new Date().toISOString() } as any;
      let authId = existingAuthId;
      if (existingAuthId) {
        await supabase.from("trade_authorizations").update(authData).eq("id", existingAuthId);
        await supabase.from("trade_authorization_crew").delete().eq("authorization_id", existingAuthId);
      } else {
        const { data, error } = await supabase.from("trade_authorizations").insert(authData).select().single();
        if (error) throw error;
        authId = data.id;
      }
      await supabase.from("trade_authorization_crew").insert(crew.map(c => ({ authorization_id: authId!, job_id: jobId, employee_id: c.employee_id, employee_name: c.employee_name, role_on_trade: c.role_on_trade, allocated_hours: c.allocated_hours })));
      toast.success("Trade authorization submitted"); onSaved();
    } catch (e: any) { toast.error("Failed: " + e.message); }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[rgba(0,0,0,0.7)] flex items-start justify-center pt-4 sm:pt-10 overflow-y-auto px-3 sm:px-0 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="bg-[var(--panel)] border border-gold/20 w-full max-w-[700px] mb-10">
        <div className="bg-gradient-to-br from-ink-2 to-ink-3 border-b border-gold/20 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-raj text-lg font-bold text-gold tracking-[1px]">TRADE PRE-AUTHORIZATION</div>
            <div className="text-[10px] text-mil-muted">{form.trade_name || "New Trade"} | {jobName}</div>
          </div>
          <button onClick={onClose} className="bg-transparent border border-gold/20 text-mil-muted px-3 py-2 cursor-pointer font-raj text-[11px] tracking-[1px] hover:text-cream hover:border-gold min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
        </div>
        <div className="p-5 space-y-5">
          <Panel>
            <Label>TRADE DETAILS</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div><Label>Trade Name *</Label><FormInput value={form.trade_name} onChange={e => setForm({ ...form, trade_name: e.target.value })} /></div>
              <div><Label>Est Hours</Label><FormInput type="number" value={form.estimated_hours} onChange={e => setForm({ ...form, estimated_hours: +e.target.value })} /></div>
              <div><Label>Auth Hours *</Label><FormInput type="number" value={form.authorized_hours} onChange={e => setForm({ ...form, authorized_hours: +e.target.value })} /></div>
              <div><Label>Start Date</Label><FormInput type="date" value={form.authorized_start_date} onChange={e => setForm({ ...form, authorized_start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><FormInput type="date" value={form.authorized_end_date} onChange={e => setForm({ ...form, authorized_end_date: e.target.value })} /></div>
            </div>
          </Panel>
          <Panel>
            <Label>CREW ASSIGNMENT ({crew.length} members — {crewTotal}h allocated)</Label>
            <FormSelect className="mt-2" onChange={e => { addCrew(e.target.value); e.target.value = ""; }}>
              <option value="">+ Add crew member...</option>
              {employees.filter(e => !crew.find(c => c.employee_id === e.id)).map(e => <option key={e.id} value={e.id}>{e.display_name || `${e.first_name} ${e.last_name}`} — {e.role}</option>)}
            </FormSelect>
            <div className="mt-2 space-y-1">
              {crew.map(c => (
                <div key={c.employee_id} className="flex items-center gap-2 px-2 py-1 bg-[rgba(0,0,0,0.15)] border border-[rgba(255,255,255,0.04)]">
                  <span className="text-xs text-cream flex-1">{c.employee_name}</span>
                  <FormInput type="number" value={c.allocated_hours} onChange={e => setCrew(crew.map(cr => cr.employee_id === c.employee_id ? { ...cr, allocated_hours: +e.target.value } : cr))} className="!w-20" />
                  <span className="text-[10px] text-mil-muted">hrs</span>
                  <button onClick={() => setCrew(crew.filter(cr => cr.employee_id !== c.employee_id))} className="text-danger text-sm bg-transparent border-none cursor-pointer">×</button>
                </div>
              ))}
            </div>
          </Panel>
          <div className="flex items-center gap-2">
            <Btn variant="gold" onClick={submit} disabled={submitting}>{submitting ? "SUBMITTING..." : existingAuthId ? "UPDATE" : "SUBMIT FOR APPROVAL"}</Btn>
            <Btn variant="ghost" size="sm" onClick={onClose}>CANCEL</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeAuthorizationForm;
