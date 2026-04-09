import type { Job, JobData } from "@/lib/types";
import { Label } from "../UIComponents";
import { toast } from "sonner";

const DocumentsTab = ({ job, data }: { job: Job; data: JobData }) => {
  const cats = [
    {
      cat: "Contract Documents",
      items: [
        { icon: "📄", name: "Signed Contract", meta: "Original contract — client signature on file" },
        { icon: "📄", name: "Scope of Work", meta: "Detailed specification sheet" },
        { icon: "📋", name: "Approved Plans", meta: "City-stamped permit plans" },
      ],
    },
    {
      cat: "Subs on This Job",
      items: data.subs.map((s) => ({ icon: "🔨", name: `${s.sub_name} Scope`, meta: `${s.trade || ""} — scope of work` })),
    },
    {
      cat: "Permits",
      items: [
        { icon: "🏛️", name: "Building Permit", meta: "City permit — active" },
        { icon: "✅", name: "Inspection Reports", meta: `${data.inspections.filter((i) => i.result === "PASS").length} passed on file` },
      ],
    },
    {
      cat: "Lien Releases",
      items: data.lienReleases.map((l) => ({
        icon: l.status === "received" ? "✅" : "⏳",
        name: `${l.sub_name} — ${l.release_type}`,
        meta: l.status === "received" ? "Received" : "PENDING",
      })),
    },
  ].filter((c) => c.items.length > 0);

  return (
    <div className="animate-fade-up">
      {cats.map((cat) => (
        <div key={cat.cat} className="mb-[18px]">
          <Label>{cat.cat}</Label>
          <div className="grid grid-cols-3 gap-[10px] mt-2 max-md:grid-cols-2">
            {cat.items.map((d, i) => (
              <div
                key={i}
                onClick={() => toast.info(`Opening ${d.name}...`)}
                className="flex items-center gap-[10px] p-3 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] cursor-pointer transition-all hover:border-gold/20"
              >
                <div className="text-xl flex-shrink-0">{d.icon}</div>
                <div>
                  <div className="text-xs font-medium">{d.name}</div>
                  <div className="text-[10px] text-mil-muted mt-[2px]">{d.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentsTab;
