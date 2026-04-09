import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/lib/types";
import { Btn, FormInput, FormSelect } from "../UIComponents";
import { toast } from "sonner";

const TasksTab = ({ tasks, jobId, onTasksChange }: { tasks: Task[]; jobId: string; onTasksChange: (tasks: Task[]) => void }) => {
  const [text, setText] = useState("");
  const [who, setWho] = useState("Leo");
  const [due, setDue] = useState(new Date().toISOString().split("T")[0]);

  const addTask = async () => {
    if (!text.trim()) return;
    const { data } = await supabase.from("tasks").insert({ job_id: jobId, task_name: text.trim(), assignee: who, due_date: due, done: false }).select().single();
    if (data) onTasksChange([...tasks, data]);
    setText("");
    toast.success("Task added");
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const done = !task.done;
    await supabase.from("tasks").update({ done }).eq("id", id);
    onTasksChange(tasks.map((t) => t.id === id ? { ...t, done } : t));
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sorted = [...tasks].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || new Date(a.due_date || "").getTime() - new Date(b.due_date || "").getTime());

  return (
    <div className="animate-fade-up">
      <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] p-4 mb-[14px]">
        <div className="flex gap-2 flex-wrap">
          <FormInput value={text} onChange={(e) => setText(e.target.value)} placeholder="Task description..." className="flex-1 min-w-[160px]" onKeyDown={(e) => e.key === "Enter" && addTask()} />
          <FormSelect value={who} onChange={(e) => setWho(e.target.value)} className="!w-[100px] flex-[0_0_100px]">
            <option>Leo</option><option>Arnell</option><option>Robert</option><option>Sonny</option><option>Alberto</option><option>Sigfried</option>
          </FormSelect>
          <FormInput type="date" value={due} onChange={(e) => setDue(e.target.value)} className="!w-[140px] flex-[0_0_140px]" />
          <Btn onClick={addTask}>+ TASK</Btn>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="text-mil-muted p-5">No tasks for this job.</div>
      ) : (
        sorted.map((t) => {
          const dueDate = new Date(t.due_date || ""); dueDate.setHours(0, 0, 0, 0);
          const diff = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
          let cls = "border-l-ok"; let cd = `${diff}d left`; let cdColor = "text-ok";
          if (t.done) { cls = "border-l-mil-muted opacity-45"; cd = "Done"; cdColor = "text-mil-muted"; }
          else if (diff < 0) { cls = "border-l-danger"; cd = `${Math.abs(diff)}d OVERDUE`; cdColor = "text-danger"; }
          else if (diff === 0) { cls = "border-l-danger"; cd = "TODAY"; cdColor = "text-danger"; }
          else if (diff <= 2) { cls = "border-l-warn"; cd = `${diff}d left`; cdColor = "text-warn"; }

          return (
            <div key={t.id} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-[14px] py-[10px] border border-[rgba(255,255,255,0.04)] border-l-[3px] bg-[rgba(0,0,0,0.18)] mb-[6px] transition-all ${cls}`}>
              <div>
                <div className={`text-xs ${t.done ? "line-through" : ""}`}>{t.task_name}</div>
                <div className="text-[10px] text-mil-muted mt-[3px]">Assigned: {t.assignee || "--"} — Due: {t.due_date || "--"}</div>
              </div>
              <div className={`font-mono text-[11px] font-bold whitespace-nowrap min-w-[70px] text-right ${cdColor}`}>{cd}</div>
              <button onClick={() => toggleTask(t.id)} className="w-[22px] h-[22px] bg-transparent border border-[rgba(255,255,255,0.1)] text-mil-muted cursor-pointer flex items-center justify-center text-[11px] transition-all hover:bg-[rgba(106,170,72,0.1)] hover:text-ok hover:border-ok flex-shrink-0">
                ✓
              </button>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TasksTab;
