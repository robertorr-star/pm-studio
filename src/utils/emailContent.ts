export const generateWeeklyJobUpdate = async (supabase: any, jobId: string, jobName: string): Promise<string> => {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const nextWeekStart = new Date(today);
  nextWeekStart.setDate(nextWeekStart.getDate() + (1 + 7 - nextWeekStart.getDay()) % 7);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [logsRes, phasesRes, nextSchedRes] = await Promise.all([
    supabase.from("field_logs").select("log_date, log_text, author").eq("job_id", jobId)
      .gte("created_at", weekAgo.toISOString()).order("log_date"),
    supabase.from("phases").select("name, status, trade").eq("job_id", jobId),
    supabase.from("weekly_schedule_entries").select("day_of_week, task_description, crew_members, hours_planned")
      .eq("job_id", jobId)
      .gte("weekly_schedule_id",
        (await supabase.from("weekly_schedules")
          .select("id")
          .gte("week_start_date", fmt(nextWeekStart))
          .limit(1)
          .single()).data?.id || "none"
      )
  ]);

  const logs = logsRes.data || [];
  const phases = phasesRes.data || [];
  const nextSched = nextSchedRes.data || [];
  const activePhases = phases.filter((p: any) => p.status === "active");
  const completePhases = phases.filter((p: any) => p.status === "complete");
  const completePct = phases.length > 0 ? Math.round(completePhases.length / phases.length * 100) : 0;

  let html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
  <div style="background: #1a1a18; padding: 20px; border-bottom: 3px solid #c9a84c;">
    <h2 style="color: #c9a84c; margin: 0; font-size: 18px;">Weekly Update — ${jobName}</h2>
    <p style="color: #888; margin: 4px 0 0; font-size: 12px;">Week of ${today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
  </div>
  <div style="padding: 20px; background: #f9f9f7;">
    <p style="background: #e8f4e8; border-left: 3px solid #5a9a5a; padding: 10px 14px; margin: 0 0 16px;">
      <strong>Overall Progress: ${completePct}% complete</strong> — ${completePhases.length} of ${phases.length} phases done
    </p>`;

  if (activePhases.length > 0) {
    html += `<h3 style="color: #333; font-size: 14px; margin: 0 0 8px;">Currently Active</h3><ul style="margin: 0 0 16px; padding-left: 20px;">`;
    activePhases.forEach((p: any) => { html += `<li style="margin-bottom: 4px; font-size: 13px;">${p.name}</li>`; });
    html += `</ul>`;
  }

  if (logs.length > 0) {
    html += `<h3 style="color: #333; font-size: 14px; margin: 0 0 8px;">Field Notes This Week</h3>`;
    logs.slice(0, 5).forEach((log: any) => {
      html += `<div style="background: #fff; border: 1px solid #e0e0e0; padding: 10px 12px; margin-bottom: 8px; font-size: 12px;">`;
      html += `<strong>${log.log_date || ""}</strong>${log.author ? ` — ${log.author}` : ""}<br/>${log.log_text}`;
      html += `</div>`;
    });
  }

  if (nextSched.length > 0) {
    html += `<h3 style="color: #333; font-size: 14px; margin: 16px 0 8px;">Next Week's Plan</h3><ul style="margin: 0; padding-left: 20px;">`;
    nextSched.forEach((e: any) => {
      html += `<li style="margin-bottom: 4px; font-size: 13px;"><strong>${e.day_of_week}:</strong> ${e.task_description} — ${(e.crew_members || []).join(", ")} (${e.hours_planned}h)</li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p style="color: #888; font-size: 12px; font-style: italic;">Next week not yet scheduled.</p>`;
  }

  html += `
  </div>
  <div style="padding: 12px 20px; background: #f0f0ee; font-size: 11px; color: #888; text-align: center;">
    Orr Construction Company — License #1028720 — (562) 498-0224
  </div>
</div>`;

  return html;
};
