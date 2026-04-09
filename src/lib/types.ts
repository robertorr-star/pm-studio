import type { Database } from "@/integrations/supabase/types";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type Phase = Database["public"]["Tables"]["phases"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type FieldLog = Database["public"]["Tables"]["field_logs"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Inspection = Database["public"]["Tables"]["inspections"]["Row"];
export type ManHour = Database["public"]["Tables"]["man_hours"]["Row"];
export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type Sub = Database["public"]["Tables"]["subs"]["Row"];
export type LienRelease = Database["public"]["Tables"]["lien_releases"]["Row"];
export type ChangeOrder = Database["public"]["Tables"]["change_orders"]["Row"];
export type PunchItem = Database["public"]["Tables"]["punch_items"]["Row"];
export type WeeklySchedule = Database["public"]["Tables"]["weekly_schedules"]["Row"];
export type WeeklyScheduleEntry = Database["public"]["Tables"]["weekly_schedule_entries"]["Row"];
export type MacroScheduleAdjustment = Database["public"]["Tables"]["macro_schedule_adjustments"]["Row"];
export type TradeAuthorization = Database["public"]["Tables"]["trade_authorizations"]["Row"];
export type TradeAuthorizationCrew = Database["public"]["Tables"]["trade_authorization_crew"]["Row"];
export type EmployeePerformanceHistory = Database["public"]["Tables"]["employee_performance_history"]["Row"];
export type EstimatingAccuracyByTrade = Database["public"]["Tables"]["estimating_accuracy_by_trade"]["Row"];

export interface JobData {
  phases: Phase[];
  messages: Message[];
  fieldLogs: FieldLog[];
  tasks: Task[];
  inspections: Inspection[];
  manHours: ManHour[];
  materials: Material[];
  subs: Sub[];
  lienReleases: LienRelease[];
  changeOrders: ChangeOrder[];
}
