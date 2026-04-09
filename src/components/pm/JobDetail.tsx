import { useState } from "react";
import type { Job, JobData } from "@/lib/types";
import OverviewTab from "./tabs/OverviewTab";
import ScheduleTab from "./tabs/ScheduleTab";
import MaterialsTab from "./tabs/MaterialsTab";
import FieldLogTab from "./tabs/FieldLogTab";
import MessagesTab from "./tabs/MessagesTab";
import TasksTab from "./tabs/TasksTab";
import InspectionsTab from "./tabs/InspectionsTab";
import ManHoursTab from "./tabs/ManHoursTab";
import PhotosTab from "./tabs/PhotosTab";
import PunchListTab from "./tabs/PunchListTab";
import ChangeOrdersTab from "./tabs/ChangeOrdersTab";
import DocumentsTab from "./tabs/DocumentsTab";
import SubsTab from "./tabs/SubsTab";
import ClientCommsTab from "./tabs/ClientCommsTab";
import BillingHubTab from "./tabs/BillingHubTab";
import CalendarTab from "./tabs/CalendarTab";
import DesignPermitTab from "./tabs/DesignPermitTab";
import TradeAuthorizationCards from "./TradeAuthorizationCards";

interface JobDetailProps {
  job: Job;
  data: JobData;
  onClose: () => void;
  onDataChange: (data: JobData) => void;
  onJobUpdate: (updates: Record<string, any>) => void;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "design", label: "Design & Permit" },
  { id: "trades", label: "Trades" },
  { id: "schedule", label: "Schedule" },
  { id: "materials", label: "Materials" },
  { id: "fieldlog", label: "Field Log" },
  { id: "messages", label: "Messages" },
  { id: "tasks", label: "Tasks" },
  { id: "inspections", label: "Inspections" },
  { id: "manhours", label: "Man Hours" },
  { id: "photos", label: "Photos" },
  { id: "punchlist", label: "Punch List" },
  { id: "changeorders", label: "Change Orders" },
  { id: "documents", label: "Documents" },
  { id: "subs", label: "Subs" },
  { id: "billing", label: "Billing Hub" },
  { id: "clientcomms", label: "Client Comms" },
  { id: "calendar", label: "Calendar" },
];

const JobDetail = ({ job, data, onClose, onDataChange, onJobUpdate }: JobDetailProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const scoreColor: Record<string, string> = { A: "var(--ok)", B: "var(--gold)", C: "var(--warn)", D: "var(--danger)" };

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab job={job} data={data} />;
      case "design": return <DesignPermitTab job={job} jobId={job.id} />;
      case "trades": return <TradeAuthorizationCards jobId={job.id} jobName={job.name} />;
      case "schedule": return <ScheduleTab phases={data.phases} jobId={job.id} onPhasesChange={(p) => onDataChange({ ...data, phases: p })} onJobUpdate={onJobUpdate} />;
      case "materials": return <MaterialsTab materials={data.materials} jobId={job.id} />;
      case "fieldlog": return <FieldLogTab logs={data.fieldLogs} jobId={job.id} onLogsChange={(l) => onDataChange({ ...data, fieldLogs: l })} />;
      case "messages": return <MessagesTab messages={data.messages} jobId={job.id} onMessagesChange={(m) => onDataChange({ ...data, messages: m })} />;
      case "tasks": return <TasksTab tasks={data.tasks} jobId={job.id} onTasksChange={(t) => onDataChange({ ...data, tasks: t })} />;
      case "inspections": return <InspectionsTab inspections={data.inspections} jobId={job.id} />;
      case "manhours": return <ManHoursTab manHours={data.manHours} jobId={job.id} onManHoursChange={(mh) => onDataChange({ ...data, manHours: mh })} />;
      case "photos": return <PhotosTab jobId={job.id} jobName={job.name} />;
      case "punchlist": return <PunchListTab punchItems={[]} jobId={job.id} onItemsChange={() => {}} />;
      case "changeorders": return <ChangeOrdersTab changeOrders={data.changeOrders} jobId={job.id} />;
      case "documents": return <DocumentsTab job={job} data={data} />;
      case "subs": return <SubsTab subs={data.subs} lienReleases={data.lienReleases} jobId={job.id} jobName={job.name} />;
      case "billing": return <BillingHubTab job={job} />;
      case "clientcomms": return <ClientCommsTab job={job} data={data} />;
      case "calendar": return <CalendarTab phases={data.phases} />;
      default: return null;
    }
  };

  return (
    <div className="bg-[var(--panel)] border border-gold/20 mb-6 animate-fade-up">
      <div className="bg-gradient-to-br from-ink-2 to-ink-3 border-b border-gold/20 px-[22px] py-4 flex items-center justify-between">
        <div>
          <div className="font-raj text-xl font-bold text-gold tracking-[1px]">{job.name}</div>
          <div className="text-[11px] text-mil-muted mt-[2px]">{job.address || ""} — Client: {job.client_name || ""}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-col flex-shrink-0" style={{ border: `2.5px solid ${scoreColor[job.score || "B"]}` }}>
            <div className="font-raj text-[22px] font-bold leading-none" style={{ color: scoreColor[job.score || "B"] }}>{job.score || "B"}</div>
            <div className="font-raj text-[7px] tracking-[1px] text-mil-muted">SCORE</div>
          </div>
          <button onClick={onClose} className="bg-transparent border border-gold/20 text-mil-muted px-[14px] py-[10px] cursor-pointer font-raj text-[11px] tracking-[1px] transition-all hover:text-cream hover:border-gold min-h-[44px] min-w-[44px]">
            ✕ CLOSE
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.05)]">
        <span className="font-raj text-[10px] text-mil-muted tracking-[1px] uppercase mr-2">Quick Actions:</span>
        <button
          onClick={() => setActiveTab("inspections")}
          className="flex items-center gap-[6px] px-3 py-[6px] bg-transparent border border-gold/30 font-raj text-[11px] font-bold text-gold tracking-[1px] hover:bg-[rgba(201,168,76,0.1)] transition-all cursor-pointer"
        >
          🔍 REQUEST INSPECTION
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className="flex items-center gap-[6px] px-3 py-[6px] bg-transparent border border-[rgba(52,152,219,0.3)] font-raj text-[11px] font-bold text-info tracking-[1px] hover:bg-[rgba(52,152,219,0.1)] transition-all cursor-pointer"
        >
          📦 REQUEST MATERIAL
        </button>
        <button
          onClick={() => setActiveTab("manhours")}
          className="flex items-center gap-[6px] px-3 py-[6px] bg-transparent border border-[rgba(255,255,255,0.1)] font-raj text-[11px] font-bold text-mil-muted tracking-[1px] hover:bg-[rgba(255,255,255,0.04)] transition-all cursor-pointer"
        >
          ⏱ LOG HOURS
        </button>
      </div>

      <div className="flex overflow-x-auto border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)] scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-[18px] py-[14px] whitespace-nowrap font-raj text-[11px] tracking-[1.5px] cursor-pointer border-b-2 transition-all uppercase flex-shrink-0 bg-transparent min-h-[48px] ${
              activeTab === tab.id ? "text-gold border-gold" : "text-mil-muted border-transparent hover:text-cream"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-[22px]">{renderTab()}</div>
    </div>
  );
};

export default JobDetail;
