import type { Sub, LienRelease } from "@/lib/types";
import { Pill, Label } from "../UIComponents";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SubsTab = ({ subs, lienReleases, jobId, jobName }: { subs: Sub[]; lienReleases: LienRelease[]; jobId: string; jobName: string }) => {
  const statusMap: Record<string, string> = { active: "active", complete: "complete", pending: "pending" };
  const notifSteps = [
    { days: "21 DAYS", msg: "Scope sent, availability confirmed" },
    { days: "14 DAYS", msg: "Reminder + site access details" },
    { days: "7 DAYS", msg: "Materials check + confirm start time" },
    { days: "3 DAYS", msg: "Final confirmation + crew count" },
    { days: "DAY OF", msg: "Morning check-in from Leo" },
  ];

  return (
    <div className="animate-fade-up">
      <div className="font-raj text-[11px] tracking-[3px] text-mil-muted uppercase mb-3"><span className="text-gold mr-2">//</span> NOTIFICATION PIPELINE</div>
      <div className="grid grid-cols-5 gap-[10px] mb-4 max-md:grid-cols-2">
        {notifSteps.map((s, i) => (
          <div key={i} className="text-center px-2 py-3 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)]">
            <div className="font-mono text-base font-bold text-gold mb-1">{s.days}</div>
            <div className="text-[10px] text-mil-muted leading-[1.4]">{s.msg}</div>
            <div className="mt-2"><Pill variant="pending">AUTO</Pill></div>
          </div>
        ))}
      </div>

      <div className="font-raj text-[11px] tracking-[3px] text-mil-muted uppercase mb-3"><span className="text-gold mr-2">//</span> SUB DIRECTORY — THIS JOB</div>
      <div className="w-full overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["Sub / Company", "Trade", "License", "Ins. Exp.", "Status", "Actions"].map((h) => (
                <th key={h} className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase p-[8px_10px] text-left border-b border-[rgba(255,255,255,0.06)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr><td colSpan={6} className="text-mil-muted p-4">No subs on this job.</td></tr>
            ) : (
              subs.map((s) => (
                <tr key={s.id} className="hover:bg-[rgba(190,180,154,0.03)]">
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{s.sub_name}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{s.trade || ""}</td>
                  <td className="p-[9px_10px] text-[10px] text-mil-muted border-b border-[rgba(255,255,255,0.03)]">{s.license_num || ""}</td>
                  <td className="p-[9px_10px] text-xs border-b border-[rgba(255,255,255,0.03)]">{s.insurance_expiry || ""}</td>
                  <td className="p-[9px_10px] border-b border-[rgba(255,255,255,0.03)]"><Pill variant={statusMap[s.status || "pending"] || "pending"}>{(s.status || "pending").charAt(0).toUpperCase() + (s.status || "pending").slice(1)}</Pill></td>
                  <td className="p-[9px_10px] border-b border-[rgba(255,255,255,0.03)]">
                    <button onClick={async () => {
                      await supabase.from('notifications').insert({
                        type: 'general',
                        title: `Sub contacted: ${s.sub_name}`,
                        body: `Notification sent regarding job work scope`,
                        job_id: jobId,
                        job_name: jobName,
                        from_user: 'Leo',
                        to_user: 'Sonny',
                        priority: 'normal',
                      });
                      toast.success(`Sonny notified about ${s.sub_name}`);
                    }} className="px-3 py-1 font-raj text-[10px] font-bold tracking-[1px] bg-transparent border border-gold/20 text-mil-muted hover:text-cream hover:border-gold transition-all cursor-pointer">NOTIFY</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <div className="font-raj text-[11px] tracking-[3px] text-mil-muted uppercase mb-[10px]"><span className="text-gold mr-2">//</span> LIEN RELEASE TRACKER</div>
        <div className="flex gap-2 flex-wrap">
          {lienReleases.map((l) => (
            <div key={l.id} className={`text-[10px] px-[10px] py-[3px] font-raj tracking-[0.5px] cursor-pointer transition-all ${
              l.status === "received"
                ? "bg-[rgba(106,170,72,0.1)] border border-[rgba(106,170,72,0.2)] text-ok"
                : "bg-[rgba(196,56,40,0.1)] border border-[rgba(196,56,40,0.2)] text-danger"
            }`}>
              {l.status === "received" ? "OK" : "PENDING"} {l.sub_name} — {l.release_type}
            </div>
          ))}
          {lienReleases.length === 0 && <span className="text-mil-muted text-[11px]">No lien releases tracked.</span>}
        </div>
      </div>
    </div>
  );
};

export default SubsTab;
