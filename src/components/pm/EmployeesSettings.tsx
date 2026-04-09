import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, Panel, Btn, Pill, FormInput, FormSelect, Label } from "./UIComponents";
import { toast } from "sonner";

const ROLES = ["Foreman", "Carpenter", "Laborer", "Apprentice", "Lead", "Admin"];
const TRADES = ["General", "Framing", "Drywall", "Plumbing", "Electrical", "HVAC", "Roofing", "Concrete", "Painting", "Flooring", "Tile", "Demolition", "Finish Carpentry", "Insulation"];

interface FieldEmployee { id: string; first_name: string; last_name: string; display_name: string | null; role: string; primary_trades: string[]; hourly_rate: number | null; is_active: boolean | null; notes: string | null; created_at: string; }

const EmployeesSettings = () => {
  const [employees, setEmployees] = useState<FieldEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<FieldEmployee> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => { setLoading(true); const { data } = await supabase.from("field_employees").select("*").order("first_name"); setEmployees((data as FieldEmployee[]) || []); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ first_name: "", last_name: "", role: "Laborer", primary_trades: [], hourly_rate: 0, is_active: true, notes: "" }); setShowForm(true); };
  const openEdit = (emp: FieldEmployee) => { setEditing({ ...emp }); setShowForm(true); };

  const save = async () => {
    if (!editing?.first_name || !editing?.last_name) { toast.error("Name required"); return; }
    const payload = { first_name: editing.first_name, last_name: editing.last_name, display_name: `Crew — ${editing.first_name} ${editing.last_name?.charAt(0)}.`, role: editing.role || "Laborer", primary_trades: editing.primary_trades || [], hourly_rate: editing.hourly_rate || 0, is_active: editing.is_active ?? true, notes: editing.notes || null };
    if (editing.id) { await supabase.from("field_employees").update(payload).eq("id", editing.id); toast.success(`${editing.first_name} updated`); }
    else { await supabase.from("field_employees").insert(payload); toast.success(`${editing.first_name} added`); }
    setShowForm(false); setEditing(null); load();
  };

  const toggleActive = async (emp: FieldEmployee) => {
    await supabase.from("field_employees").update({ is_active: !emp.is_active }).eq("id", emp.id);
    setEmployees(employees.map(e => e.id === emp.id ? { ...e, is_active: !e.is_active } : e));
  };

  const toggleTrade = (trade: string) => {
    if (!editing) return;
    const trades = editing.primary_trades || [];
    setEditing({ ...editing, primary_trades: trades.includes(trade) ? trades.filter(t => t !== trade) : [...trades, trade] });
  };

  const active = employees.filter(e => e.is_active);
  const inactive = employees.filter(e => !e.is_active);

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin" /></div>;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4"><SectionHeader label="FIELD LABOR — EMPLOYEE ROSTER" /><Btn variant="gold" onClick={openNew}>+ ADD EMPLOYEE</Btn></div>
      <Panel>
        <Label>ACTIVE CREW ({active.length})</Label>
        <div className="mt-3 space-y-1">
          {active.length === 0 && <div className="text-mil-muted text-xs p-3">No employees yet.</div>}
          {active.map(emp => (
            <div key={emp.id} className="px-3 py-2 border border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.15)] hover:bg-[rgba(201,168,76,0.04)]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-[rgba(201,168,76,0.15)] border border-gold/20 flex items-center justify-center font-raj text-[11px] font-bold text-gold flex-shrink-0">{emp.first_name.charAt(0)}{emp.last_name.charAt(0)}</div>
                <div className="flex-1"><div className="text-xs font-bold text-cream">{emp.display_name || `${emp.first_name} ${emp.last_name}`}</div><div className="text-[10px] text-mil-muted">{emp.role} — {(emp.primary_trades || []).slice(0, 3).join(", ") || "No trades"}</div></div>
                <span className="font-mono text-[10px] text-mil-muted">${emp.hourly_rate}/hr</span>
              </div>
              <div className="flex items-center gap-2 pl-10">
                <Pill variant="complete">ACTIVE</Pill>
                <Btn variant="ghost" size="sm" onClick={() => openEdit(emp)}>EDIT</Btn>
                <Btn variant="ghost" size="sm" onClick={() => toggleActive(emp)}>DEACTIVATE</Btn>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {showForm && editing && (
        <div className="fixed inset-0 z-[300] bg-[rgba(0,0,0,0.7)] flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="bg-[#0D1B2A] border border-gold/20 w-full max-w-lg max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="font-raj text-sm font-bold text-gold mb-4">{editing.id ? "EDIT EMPLOYEE" : "ADD NEW EMPLOYEE"}</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>First Name *</Label><FormInput value={editing.first_name || ""} onChange={e => setEditing({ ...editing, first_name: e.target.value })} /></div>
                <div><Label>Last Name *</Label><FormInput value={editing.last_name || ""} onChange={e => setEditing({ ...editing, last_name: e.target.value })} /></div>
              </div>
              <div><Label>Role</Label><FormSelect value={editing.role || "Laborer"} onChange={e => setEditing({ ...editing, role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</FormSelect></div>
              <div><Label>Trades</Label><div className="flex flex-wrap gap-1 mt-1">{TRADES.map(trade => (
                <button key={trade} onClick={() => toggleTrade(trade)} className={`px-2 py-1 text-[10px] font-raj tracking-[1px] border cursor-pointer ${(editing.primary_trades || []).includes(trade) ? "bg-[rgba(201,168,76,0.15)] border-gold/30 text-gold" : "bg-transparent border-[rgba(255,255,255,0.08)] text-mil-muted"}`}>{trade}</button>
              ))}</div></div>
              <div><Label>Hourly Rate ($)</Label><FormInput type="number" value={editing.hourly_rate || 0} onChange={e => setEditing({ ...editing, hourly_rate: Number(e.target.value) })} /></div>
            </div>
            <div className="flex gap-2 mt-4"><Btn variant="gold" onClick={save}>{editing.id ? "UPDATE" : "ADD"}</Btn><Btn variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}>CANCEL</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesSettings;
