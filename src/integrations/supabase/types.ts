export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      billing_items: {
        Row: {
          contract_amount: number | null; created_at: string; current_invoice_amount: number | null
          description: string | null; estimate_id: string | null; id: string
          invoice_number: string | null; item_number: number | null; job_id: string
          material_delivered_date: string | null; material_ordered_date: string | null
          material_status: string | null; phase_name: string | null
          remaining_balance: number | null; remaining_balance_pct: number | null
          sort_order: number | null; status: string | null; supplier: string | null
          this_invoice: number | null; total_paid: number | null; updated_at: string
        }
        Insert: {
          contract_amount?: number | null; created_at?: string; current_invoice_amount?: number | null
          description?: string | null; estimate_id?: string | null; id?: string
          invoice_number?: string | null; item_number?: number | null; job_id: string
          material_delivered_date?: string | null; material_ordered_date?: string | null
          material_status?: string | null; phase_name?: string | null
          remaining_balance?: number | null; remaining_balance_pct?: number | null
          sort_order?: number | null; status?: string | null; supplier?: string | null
          this_invoice?: number | null; total_paid?: number | null; updated_at?: string
        }
        Update: {
          contract_amount?: number | null; created_at?: string; current_invoice_amount?: number | null
          description?: string | null; estimate_id?: string | null; id?: string
          invoice_number?: string | null; item_number?: number | null; job_id?: string
          material_delivered_date?: string | null; material_ordered_date?: string | null
          material_status?: string | null; phase_name?: string | null
          remaining_balance?: number | null; remaining_balance_pct?: number | null
          sort_order?: number | null; status?: string | null; supplier?: string | null
          this_invoice?: number | null; total_paid?: number | null; updated_at?: string
        }
        Relationships: []
      }
      change_orders: {
        Row: {
          co_number: string | null; created_at: string; days_pending: number | null
          description: string | null; id: string; job_id: string
          status: string | null; updated_at: string
        }
        Insert: {
          co_number?: string | null; created_at?: string; days_pending?: number | null
          description?: string | null; id?: string; job_id: string
          status?: string | null; updated_at?: string
        }
        Update: {
          co_number?: string | null; created_at?: string; days_pending?: number | null
          description?: string | null; id?: string; job_id?: string
          status?: string | null; updated_at?: string
        }
        Relationships: []
      }
      employee_performance_history: {
        Row: {
          actual_hours: number | null; allocated_hours: number | null
          authorization_id: string | null; employee_id: string; employee_name: string | null
          id: string; job_id: string; job_name: string | null
          performance_rating: string | null; period_end: string | null
          period_start: string | null; recorded_at: string
          trade_name: string | null; variance_hours: number | null; variance_pct: number | null
        }
        Insert: {
          actual_hours?: number | null; allocated_hours?: number | null
          authorization_id?: string | null; employee_id: string; employee_name?: string | null
          id?: string; job_id: string; job_name?: string | null
          performance_rating?: string | null; period_end?: string | null
          period_start?: string | null; recorded_at?: string
          trade_name?: string | null; variance_hours?: number | null; variance_pct?: number | null
        }
        Update: {
          actual_hours?: number | null; allocated_hours?: number | null
          authorization_id?: string | null; employee_id?: string; employee_name?: string | null
          id?: string; job_id?: string; job_name?: string | null
          performance_rating?: string | null; period_end?: string | null
          period_start?: string | null; recorded_at?: string
          trade_name?: string | null; variance_hours?: number | null; variance_pct?: number | null
        }
        Relationships: []
      }
      estimate_line_items: {
        Row: {
          cost_type: string | null; description: string | null; estimate_id: string
          ext_cost: number | null; id: string; item_number: number | null
          line_item_total: number | null; notes: string | null; phase_name: string | null
          profit_margin: number | null; quantity: number | null; sort_order: number | null
          trade_group: string | null; unit: string | null; unit_cost: number | null
        }
        Insert: {
          cost_type?: string | null; description?: string | null; estimate_id: string
          ext_cost?: number | null; id?: string; item_number?: number | null
          line_item_total?: number | null; notes?: string | null; phase_name?: string | null
          profit_margin?: number | null; quantity?: number | null; sort_order?: number | null
          trade_group?: string | null; unit?: string | null; unit_cost?: number | null
        }
        Update: {
          cost_type?: string | null; description?: string | null; estimate_id?: string
          ext_cost?: number | null; id?: string; item_number?: number | null
          line_item_total?: number | null; notes?: string | null; phase_name?: string | null
          profit_margin?: number | null; quantity?: number | null; sort_order?: number | null
          trade_group?: string | null; unit?: string | null; unit_cost?: number | null
        }
        Relationships: []
      }
      estimates: {
        Row: {
          approved_date: string | null; client_name: string | null; converted_date: string | null
          created_at: string; created_by: string | null; estimate_number: string | null
          gross_margin_pct: number | null; id: string; job_id: string | null
          notes: string | null; project_address: string | null; project_name: string | null
          status: string | null; submitted_date: string | null
          total_cost: number | null; total_price: number | null
        }
        Insert: {
          approved_date?: string | null; client_name?: string | null; converted_date?: string | null
          created_at?: string; created_by?: string | null; estimate_number?: string | null
          gross_margin_pct?: number | null; id?: string; job_id?: string | null
          notes?: string | null; project_address?: string | null; project_name?: string | null
          status?: string | null; submitted_date?: string | null
          total_cost?: number | null; total_price?: number | null
        }
        Update: {
          approved_date?: string | null; client_name?: string | null; converted_date?: string | null
          created_at?: string; created_by?: string | null; estimate_number?: string | null
          gross_margin_pct?: number | null; id?: string; job_id?: string | null
          notes?: string | null; project_address?: string | null; project_name?: string | null
          status?: string | null; submitted_date?: string | null
          total_cost?: number | null; total_price?: number | null
        }
        Relationships: []
      }
      estimating_accuracy_by_trade: {
        Row: {
          actual_hours: number | null; authorization_id: string | null
          authorized_hours: number | null; estimate_accuracy_rating: string | null
          estimate_vs_actual_pct: number | null; estimate_vs_actual_variance: number | null
          estimated_hours: number | null; id: string; job_id: string
          job_name: string | null; recorded_at: string; trade_name: string
        }
        Insert: {
          actual_hours?: number | null; authorization_id?: string | null
          authorized_hours?: number | null; estimate_accuracy_rating?: string | null
          estimate_vs_actual_pct?: number | null; estimate_vs_actual_variance?: number | null
          estimated_hours?: number | null; id?: string; job_id: string
          job_name?: string | null; recorded_at?: string; trade_name: string
        }
        Update: {
          actual_hours?: number | null; authorization_id?: string | null
          authorized_hours?: number | null; estimate_accuracy_rating?: string | null
          estimate_vs_actual_pct?: number | null; estimate_vs_actual_variance?: number | null
          estimated_hours?: number | null; id?: string; job_id?: string
          job_name?: string | null; recorded_at?: string; trade_name?: string
        }
        Relationships: []
      }
      field_employees: {
        Row: {
          created_at: string; display_name: string | null; first_name: string
          hourly_rate: number | null; id: string; is_active: boolean | null
          last_name: string; notes: string | null; primary_trades: string[] | null; role: string
        }
        Insert: {
          created_at?: string; display_name?: string | null; first_name: string
          hourly_rate?: number | null; id?: string; is_active?: boolean | null
          last_name: string; notes?: string | null; primary_trades?: string[] | null; role?: string
        }
        Update: {
          created_at?: string; display_name?: string | null; first_name?: string
          hourly_rate?: number | null; id?: string; is_active?: boolean | null
          last_name?: string; notes?: string | null; primary_trades?: string[] | null; role?: string
        }
        Relationships: []
      }
      field_logs: {
        Row: { author: string | null; created_at: string; id: string; job_id: string; log_date: string | null; log_text: string }
        Insert: { author?: string | null; created_at?: string; id?: string; job_id: string; log_date?: string | null; log_text: string }
        Update: { author?: string | null; created_at?: string; id?: string; job_id?: string; log_date?: string | null; log_text?: string }
        Relationships: []
      }
      inspections: {
        Row: { action: boolean | null; created_at: string; id: string; inspection_type: string | null; job_id: string; notes: string | null; phase_name: string | null; result: string | null; scheduled_date: string | null }
        Insert: { action?: boolean | null; created_at?: string; id?: string; inspection_type?: string | null; job_id: string; notes?: string | null; phase_name?: string | null; result?: string | null; scheduled_date?: string | null }
        Update: { action?: boolean | null; created_at?: string; id?: string; inspection_type?: string | null; job_id?: string; notes?: string | null; phase_name?: string | null; result?: string | null; scheduled_date?: string | null }
        Relationships: []
      }
      jobs: {
        Row: {
          address: string | null; client_name: string | null; contract_remaining: number | null
          contract_value: number | null; created_at: string; crew: Json | null
          current_phase: string | null; health: string | null; id: string
          indicators: Json | null; last_update_sent: string | null; name: string
          next_milestone: string | null; phase_pct: number | null
          phases_complete: number | null; phases_total: number | null
          prog_color: string | null; score: string | null
          score_breakdown: Json | null; warns: Json | null; weekly_update_draft: string | null
          wins: Json | null
        }
        Insert: {
          address?: string | null; client_name?: string | null; contract_remaining?: number | null
          contract_value?: number | null; created_at?: string; crew?: Json | null
          current_phase?: string | null; health?: string | null; id?: string
          indicators?: Json | null; last_update_sent?: string | null; name: string
          next_milestone?: string | null; phase_pct?: number | null
          phases_complete?: number | null; phases_total?: number | null
          prog_color?: string | null; score?: string | null
          score_breakdown?: Json | null; warns?: Json | null; weekly_update_draft?: string | null
          wins?: Json | null
        }
        Update: {
          address?: string | null; client_name?: string | null; contract_remaining?: number | null
          contract_value?: number | null; created_at?: string; crew?: Json | null
          current_phase?: string | null; health?: string | null; id?: string
          indicators?: Json | null; last_update_sent?: string | null; name?: string
          next_milestone?: string | null; phase_pct?: number | null
          phases_complete?: number | null; phases_total?: number | null
          prog_color?: string | null; score?: string | null
          score_breakdown?: Json | null; warns?: Json | null; weekly_update_draft?: string | null
          wins?: Json | null
        }
        Relationships: []
      }
      lien_releases: {
        Row: { id: string; job_id: string; release_type: string | null; status: string | null; sub_name: string | null }
        Insert: { id?: string; job_id: string; release_type?: string | null; status?: string | null; sub_name?: string | null }
        Update: { id?: string; job_id?: string; release_type?: string | null; status?: string | null; sub_name?: string | null }
        Relationships: []
      }
      macro_schedule_adjustments: {
        Row: { adjustment_type: string | null; approved_by: string | null; created_at: string; days_delta: number | null; id: string; job_id: string; phase_name: string | null; reason: string | null }
        Insert: { adjustment_type?: string | null; approved_by?: string | null; created_at?: string; days_delta?: number | null; id?: string; job_id: string; phase_name?: string | null; reason?: string | null }
        Update: { adjustment_type?: string | null; approved_by?: string | null; created_at?: string; days_delta?: number | null; id?: string; job_id?: string; phase_name?: string | null; reason?: string | null }
        Relationships: []
      }
      man_hours: {
        Row: { actual_hrs: number | null; estimated_hrs: number | null; id: string; job_id: string; note: string | null; sort_order: number | null; status: string | null; trade: string | null }
        Insert: { actual_hrs?: number | null; estimated_hrs?: number | null; id?: string; job_id: string; note?: string | null; sort_order?: number | null; status?: string | null; trade?: string | null }
        Update: { actual_hrs?: number | null; estimated_hrs?: number | null; id?: string; job_id?: string; note?: string | null; sort_order?: number | null; status?: string | null; trade?: string | null }
        Relationships: []
      }
      materials: {
        Row: { id: string; item_name: string; job_id: string; qty: string | null; sort_order: number | null; status: string | null; supplier: string | null; unit: string | null; quantity: number | null }
        Insert: { id?: string; item_name: string; job_id: string; qty?: string | null; sort_order?: number | null; status?: string | null; supplier?: string | null; unit?: string | null; quantity?: number | null }
        Update: { id?: string; item_name?: string; job_id?: string; qty?: string | null; sort_order?: number | null; status?: string | null; supplier?: string | null; unit?: string | null; quantity?: number | null }
        Relationships: []
      }
      messages: {
        Row: { avatar_class: string | null; created_at: string; from_person: string | null; id: string; job_id: string; message_text: string | null; tag: string | null }
        Insert: { avatar_class?: string | null; created_at?: string; from_person?: string | null; id?: string; job_id: string; message_text?: string | null; tag?: string | null }
        Update: { avatar_class?: string | null; created_at?: string; from_person?: string | null; id?: string; job_id?: string; message_text?: string | null; tag?: string | null }
        Relationships: []
      }
      phases: {
        Row: { crew: string | null; end_date: string | null; estimated_hrs: string | null; id: string; job_id: string; name: string; num: number | null; sort_order: number | null; start_date: string | null; status: string | null; trade: string | null }
        Insert: { crew?: string | null; end_date?: string | null; estimated_hrs?: string | null; id?: string; job_id: string; name: string; num?: number | null; sort_order?: number | null; start_date?: string | null; status?: string | null; trade?: string | null }
        Update: { crew?: string | null; end_date?: string | null; estimated_hrs?: string | null; id?: string; job_id?: string; name?: string; num?: number | null; sort_order?: number | null; start_date?: string | null; status?: string | null; trade?: string | null }
        Relationships: []
      }
      punch_items: {
        Row: { added_by: string | null; assigned_to: string | null; cleared_at: string | null; id: string; item: string | null; job_id: string; status: string | null; trade: string | null }
        Insert: { added_by?: string | null; assigned_to?: string | null; cleared_at?: string | null; id?: string; item?: string | null; job_id: string; status?: string | null; trade?: string | null }
        Update: { added_by?: string | null; assigned_to?: string | null; cleared_at?: string | null; id?: string; item?: string | null; job_id?: string; status?: string | null; trade?: string | null }
        Relationships: []
      }
      subs: {
        Row: { id: string; insurance_expiry: string | null; job_id: string; license_num: string | null; status: string | null; sub_name: string; trade: string | null }
        Insert: { id?: string; insurance_expiry?: string | null; job_id: string; license_num?: string | null; status?: string | null; sub_name: string; trade?: string | null }
        Update: { id?: string; insurance_expiry?: string | null; job_id?: string; license_num?: string | null; status?: string | null; sub_name?: string; trade?: string | null }
        Relationships: []
      }
      tasks: {
        Row: { assignee: string | null; created_at: string; done: boolean | null; due_date: string | null; id: string; job_id: string | null; task_name: string | null }
        Insert: { assignee?: string | null; created_at?: string; done?: boolean | null; due_date?: string | null; id?: string; job_id?: string | null; task_name?: string | null }
        Update: { assignee?: string | null; created_at?: string; done?: boolean | null; due_date?: string | null; id?: string; job_id?: string | null; task_name?: string | null }
        Relationships: []
      }
      trade_authorization_crew: {
        Row: { actual_hours_logged: number | null; allocated_hours: number | null; authorization_id: string; employee_id: string; employee_name: string | null; hours_variance: number | null; id: string; job_id: string; role_on_trade: string | null }
        Insert: { actual_hours_logged?: number | null; allocated_hours?: number | null; authorization_id: string; employee_id: string; employee_name?: string | null; hours_variance?: number | null; id?: string; job_id: string; role_on_trade?: string | null }
        Update: { actual_hours_logged?: number | null; allocated_hours?: number | null; authorization_id?: string; employee_id?: string; employee_name?: string | null; hours_variance?: number | null; id?: string; job_id?: string; role_on_trade?: string | null }
        Relationships: []
      }
      trade_authorizations: {
        Row: {
          actual_end_date: string | null; actual_hours: number | null
          authorization_method: string | null; authorization_notes: string | null
          authorized_by: string | null; authorized_date: string | null
          authorized_end_date: string | null; authorized_hours: number | null
          authorized_start_date: string | null; authorized_team_size: number | null
          completion_notes: string | null; created_at: string
          estimated_duration_days: number | null; estimated_hours: number | null
          estimated_labor_cost: number | null; estimated_team_size: number | null
          hours_variance: number | null; hours_variance_pct: number | null
          id: string; job_id: string; line_item_flags: Json | null
          performance_rating: string | null; status: string
          sub_authorized_hours: number | null; sub_contract_amount: number | null
          subcontractor_name: string | null; submitted_by: string | null
          submitted_date: string | null; trade_name: string; trade_sort_order: number | null
        }
        Insert: {
          actual_end_date?: string | null; actual_hours?: number | null
          authorization_method?: string | null; authorization_notes?: string | null
          authorized_by?: string | null; authorized_date?: string | null
          authorized_end_date?: string | null; authorized_hours?: number | null
          authorized_start_date?: string | null; authorized_team_size?: number | null
          completion_notes?: string | null; created_at?: string
          estimated_duration_days?: number | null; estimated_hours?: number | null
          estimated_labor_cost?: number | null; estimated_team_size?: number | null
          hours_variance?: number | null; hours_variance_pct?: number | null
          id?: string; job_id: string; line_item_flags?: Json | null
          performance_rating?: string | null; status?: string
          sub_authorized_hours?: number | null; sub_contract_amount?: number | null
          subcontractor_name?: string | null; submitted_by?: string | null
          submitted_date?: string | null; trade_name: string; trade_sort_order?: number | null
        }
        Update: {
          actual_end_date?: string | null; actual_hours?: number | null
          authorization_method?: string | null; authorization_notes?: string | null
          authorized_by?: string | null; authorized_date?: string | null
          authorized_end_date?: string | null; authorized_hours?: number | null
          authorized_start_date?: string | null; authorized_team_size?: number | null
          completion_notes?: string | null; created_at?: string
          estimated_duration_days?: number | null; estimated_hours?: number | null
          estimated_labor_cost?: number | null; estimated_team_size?: number | null
          hours_variance?: number | null; hours_variance_pct?: number | null
          id?: string; job_id?: string; line_item_flags?: Json | null
          performance_rating?: string | null; status?: string
          sub_authorized_hours?: number | null; sub_contract_amount?: number | null
          subcontractor_name?: string | null; submitted_by?: string | null
          submitted_date?: string | null; trade_name?: string; trade_sort_order?: number | null
        }
        Relationships: []
      }
      weekly_schedule_entries: {
        Row: {
          crew_members: string[] | null; day_of_week: string; end_time: string | null
          equipment_needed: string | null; hours_planned: number | null; id: string
          inspection_scheduled: boolean | null; inspection_time: string | null
          inspection_type: string | null; job_id: string; materials_needed: string | null
          notes: string | null; start_time: string | null; status: string | null
          subcontractor: string | null; task_description: string | null
          weekly_schedule_id: string
        }
        Insert: {
          crew_members?: string[] | null; day_of_week: string; end_time?: string | null
          equipment_needed?: string | null; hours_planned?: number | null; id?: string
          inspection_scheduled?: boolean | null; inspection_time?: string | null
          inspection_type?: string | null; job_id: string; materials_needed?: string | null
          notes?: string | null; start_time?: string | null; status?: string | null
          subcontractor?: string | null; task_description?: string | null
          weekly_schedule_id: string
        }
        Update: {
          crew_members?: string[] | null; day_of_week?: string; end_time?: string | null
          equipment_needed?: string | null; hours_planned?: number | null; id?: string
          inspection_scheduled?: boolean | null; inspection_time?: string | null
          inspection_type?: string | null; job_id?: string; materials_needed?: string | null
          notes?: string | null; start_time?: string | null; status?: string | null
          subcontractor?: string | null; task_description?: string | null
          weekly_schedule_id?: string
        }
        Relationships: []
      }
      weekly_schedules: {
        Row: { created_at: string; created_by: string | null; id: string; published_at: string | null; status: string | null; week_end_date: string | null; week_start_date: string }
        Insert: { created_at?: string; created_by?: string | null; id?: string; published_at?: string | null; status?: string | null; week_end_date?: string | null; week_start_date: string }
        Update: { created_at?: string; created_by?: string | null; id?: string; published_at?: string | null; status?: string | null; week_end_date?: string | null; week_start_date?: string }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
