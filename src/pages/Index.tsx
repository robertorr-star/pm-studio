import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job, Task, JobData } from "@/lib/types";
import Header from "@/components/pm/Header";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import MetricsStrip, { type MetricData } from "@/components/pm/MetricsStrip";
import AlertStrips from "@/components/pm/AlertStrips";
import JobCard from "@/components/pm/JobCard";
import JobDetail from "@/components/pm/JobDetail";
import { SectionHeader, Btn } from "@/components/pm/UIComponents";
import GlobalCalendar from "@/components/pm/GlobalCalendar";
import GlobalInspectionsCalendar from "@/components/pm/GlobalInspectionsCalendar";
import GlobalMaterialsView from "@/components/pm/GlobalMaterialsView";
import WeeklyScheduleView from "@/components/pm/WeeklyScheduleView";
import EmployeesSettings from "@/components/pm/EmployeesSettings";
import ScorecardView from "@/components/pm/ScorecardView";
import { toast } from "sonner";

const Index = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [globalTasks, setGlobalTasks] = useState<Task[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [pendingAuthCount, setPendingAuthCount] = useState(0);
  const jobDetailRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [jobsRes, tasksRes, authRes] = await Promise.all([
      supabase.from("jobs").select("*").order("name"),
      supabase.from("tasks").select("*").order("due_date"),
      supabase.from("trade_authorizations").select("id").eq("status", "pending_authorization"),
    ]);
    setJobs(jobsRes.data || []);
    setGlobalTasks(tasksRes.data || []);
    setPendingAuthCount(authRes.data?.length || 0);
    setLoading(false);
    if (jobsRes.data?.length) toast.success(`OCD PM Studio — ${jobsRes.data.length} active jobs loaded`);
  }, []);

  const loadDataSilent = useCallback(async () => {
    const [jobsRes, tasksRes, authRes] = await Promise.all([
      supabase.from("jobs").select("*").order("name"),
      supabase.from("tasks").select("*").order("due_date"),
      supabase.from("trade_authorizations").select("id").eq("status", "pending_authorization"),
    ]);
    setJobs(jobsRes.data || []);
    setGlobalTasks(tasksRes.data || []);
    setPendingAuthCount(authRes.data?.length || 0);
  }, []);

  const { containerRef: pullRef, pullDistance, refreshing } = usePullToRefresh({
    onRefresh: async () => { await loadDataSilent(); toast.success("Dashboard refreshed"); },
  });

  useEffect(() => { loadData(); }, [loadData]);

  const selectJob = async (id: string) => {
    setSelectedJobId(id);
    setLoading(true);
    const [phases, messages, fieldLogs, tasks, inspections, manHours, materials, subs, lienReleases, changeOrders] = await Promise.all([
      supabase.from("phases").select("*").eq("job_id", id).order("sort_order"),
      supabase.from("messages").select("*").eq("job_id", id).order("created_at"),
      supabase.from("field_logs").select("*").eq("job_id", id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("job_id", id).order("due_date"),
      supabase.from("inspections").select("*").eq("job_id", id),
      supabase.from("man_hours").select("*").eq("job_id", id).order("sort_order"),
      supabase.from("materials").select("*").eq("job_id", id).order("sort_order"),
      supabase.from("subs").select("*").eq("job_id", id),
      supabase.from("lien_releases").select("*").eq("job_id", id),
      supabase.from("change_orders").select("*").eq("job_id", id),
    ]);
    setJobData({
      phases: phases.data || [], messages: messages.data || [], fieldLogs: fieldLogs.data || [],
      tasks: tasks.data || [], inspections: inspections.data || [], manHours: manHours.data || [],
      materials: materials.data || [], subs: subs.data || [], lienReleases: lienReleases.data || [],
      changeOrders: changeOrders.data || [],
    });
    setLoading(false);
    setTimeout(() => { jobDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  };

  const closeDetail = () => { setSelectedJobId(null); setJobData(null); };
  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdueCount = globalTasks.filter((t) => !t.done && t.due_date && new Date(t.due_date) < today).length;
  const openTasks = globalTasks.filter((t) => !t.done).length;
  const onTimePct = openTasks > 0 ? Math.round(((openTasks - overdueCount) / openTasks) * 100) : 100;
  const aGrade = jobs.filter((j) => j.score === "A").length;
  const greenHealth = jobs.filter((j) => j.health === "h-green").length;

  const metrics: MetricData[] = [
    { label: "Active Jobs", value: jobs.length, sub: `${aGrade} A-grade jobs`, cls: "m-gold", bar: Math.min(jobs.length * 14, 100), barColor: "var(--gold)" },
    { label: "Schedule Health", value: `${greenHealth}/${jobs.length}`, sub: "Jobs with green health", cls: greenHealth === jobs.length ? "m-green" : "m-amber", bar: jobs.length ? Math.round((greenHealth / jobs.length) * 100) : 0, barColor: greenHealth === jobs.length ? "var(--ok)" : "var(--warn)" },
    { label: "Tasks On Time", value: overdueCount === 0 ? "Clean" : `${overdueCount} LATE`, sub: `${onTimePct}% on schedule`, cls: overdueCount === 0 ? "m-green" : overdueCount <= 3 ? "m-amber" : "m-red", bar: onTimePct, barColor: overdueCount === 0 ? "var(--ok)" : "var(--warn)" },
    { label: "Phases Complete", value: jobs.reduce((s, j) => s + (j.phases_complete || 0), 0), sub: "Across all active jobs", cls: "m-blue", bar: 60, barColor: "var(--info)" },
    { label: "Remaining Work", value: `$${Math.round(jobs.reduce((s, j) => s + Number(j.contract_remaining || 0), 0) / 1000)}K`, sub: "Est. remaining to invoice", cls: "m-amber", bar: 72, barColor: "var(--warn)" },
  ];

  const warns = jobs.length === 0 ? [{ text: "No jobs loaded — add data to database", jid: "" }] : jobs.flatMap((j) => ((j.warns as string[]) || []).filter((w) => ["mat-overdue", "no-log", "insp-needed"].includes(w)).map((w) => ({ text: `${j.name?.split("--")[0].trim()}: ${w}`, jid: j.id })));
  const cautions = jobs.flatMap((j) => ((j.warns as string[]) || []).filter((w) => ["mat-soon", "sub-unconfirmed"].includes(w)).map((w) => ({ text: `${j.name?.split("--")[0].trim()}: ${w}`, jid: j.id })));
  const wins = jobs.flatMap((j) => ((j.wins as string[]) || []).map((w) => ({ text: `${j.name?.split("--")[0].trim()}: ${w}`, jid: j.id })));

  if (loading && jobs.length === 0) {
    return (
      <div className="fixed inset-0 z-[500] bg-[rgba(13,27,42,0.92)] flex items-center justify-center flex-col gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" />
        <div className="font-raj text-[13px] tracking-[2px] text-mil-muted uppercase">Loading OCD PM Studio...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" ref={pullRef}>
      {(pullDistance > 0 || refreshing) && (
        <div className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out" style={{ height: pullDistance > 0 ? pullDistance : refreshing ? 48 : 0 }}>
          <div className={`flex items-center gap-2 ${refreshing ? "animate-pulse" : ""}`}>
            <div className={`w-5 h-5 rounded-full border-2 border-gold/30 border-t-gold ${refreshing ? "animate-spin-custom" : ""}`} style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }} />
            <span className="font-raj text-[11px] tracking-[1.5px] text-mil-muted uppercase">{refreshing ? "Refreshing…" : pullDistance >= 80 ? "Release to refresh" : "Pull to refresh"}</span>
          </div>
        </div>
      )}
      <Header activeView={activeView} onViewChange={setActiveView} taskBadge={overdueCount || openTasks} />

      <div className="relative z-[1] p-[20px_24px] max-w-[1600px] mx-auto max-md:p-[14px]">
        {activeView === "dashboard" && (
          <>
            {pendingAuthCount > 0 && (
              <div className="bg-[rgba(196,56,40,0.12)] border border-[rgba(196,56,40,0.3)] px-4 py-3 mb-4 animate-blink cursor-pointer" onClick={() => setActiveView("scorecard")}>
                <span className="font-raj text-sm font-bold text-danger tracking-[1px]">🔴 {pendingAuthCount} TRADE{pendingAuthCount > 1 ? "S" : ""} PENDING AUTHORIZATION — REVIEW NOW</span>
              </div>
            )}
            <MetricsStrip metrics={metrics} />
            <AlertStrips warns={warns} cautions={cautions} wins={wins} onJobClick={selectJob} />
            <SectionHeader label="JOB SCORECARDS"><Btn variant="ghost" size="sm" onClick={() => toast.info("Create the estimate in Estimating Studio, then convert it to activate the job here.", { duration: 5000 })}>+ NEW JOB</Btn></SectionHeader>
            {selectedJob && jobData && (
              <div ref={jobDetailRef}>
                <JobDetail job={selectedJob} data={jobData} onClose={closeDetail} onDataChange={setJobData} onJobUpdate={(updates) => setJobs(jobs.map((j) => j.id === selectedJobId ? { ...j, ...updates } : j))} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 mb-5 max-lg:grid-cols-2 max-md:grid-cols-1">
              {jobs.map((job) => <JobCard key={job.id} job={job} selected={selectedJobId === job.id} onSelect={selectJob} />)}
              {jobs.length === 0 && <div className="text-mil-muted p-10 col-span-full text-center">No jobs found. Add job data to your database to get started.</div>}
            </div>
          </>
        )}

        {activeView === "tasks-global" && (
          <>
            <SectionHeader label="ALL TASKS — ALL JOBS" />
            {globalTasks.length === 0 ? <div className="text-mil-muted p-5">No tasks yet.</div> : (
              [...globalTasks].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)).map((t) => {
                const dueDate = new Date(t.due_date || ""); dueDate.setHours(0, 0, 0, 0);
                const diff = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
                let cls = "border-l-ok"; let cd = `${diff}d`; let cdColor = "text-ok";
                if (t.done) { cls = "border-l-mil-muted opacity-45"; cd = "Done"; cdColor = "text-mil-muted"; }
                else if (diff < 0) { cls = "border-l-danger"; cd = `${Math.abs(diff)}d OVERDUE`; cdColor = "text-danger"; }
                else if (diff <= 2) { cls = "border-l-warn"; cd = `${diff}d`; cdColor = "text-warn"; }
                return (
                  <div key={t.id} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-[14px] py-[10px] border border-[rgba(255,255,255,0.04)] border-l-[3px] bg-[rgba(0,0,0,0.18)] mb-[6px] ${cls}`}>
                    <div><div className={`text-xs ${t.done ? "line-through" : ""}`}>{t.task_name}</div><div className="text-[10px] text-mil-muted mt-[3px]"><span className="text-gold">{t.job_id || "ALL"}</span> — {t.assignee || "--"} — {t.due_date || "--"}</div></div>
                    <div className={`font-mono text-[11px] font-bold ${cdColor}`}>{cd}</div>
                    <button onClick={async () => { const done = !t.done; await supabase.from("tasks").update({ done }).eq("id", t.id); setGlobalTasks(globalTasks.map((gt) => gt.id === t.id ? { ...gt, done } : gt)); }} className="w-[22px] h-[22px] bg-transparent border border-[rgba(255,255,255,0.1)] text-mil-muted cursor-pointer flex items-center justify-center text-[11px] hover:bg-[rgba(106,170,72,0.1)] hover:text-ok hover:border-ok transition-all">✓</button>
                  </div>
                );
              })
            )}
          </>
        )}

        {activeView === "materials-global" && <GlobalMaterialsView onJobClick={selectJob} />}
        {activeView === "manhours-global" && <><SectionHeader label="MAN HOURS ANALYSIS — ALL JOBS" /><div className="text-mil-muted p-5">Select a job from the dashboard to view man hours data.</div></>}
        {activeView === "inspections-global" && <GlobalInspectionsCalendar />}
        {activeView === "weekly-schedule" && <WeeklyScheduleView jobs={jobs} />}
        {activeView === "scorecard" && <ScorecardView />}
        {activeView === "calendar-global" && <GlobalCalendar />}
        {activeView === "settings" && <EmployeesSettings />}
      </div>
    </div>
  );
};

export default Index;
