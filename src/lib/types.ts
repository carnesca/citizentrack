export type LawTypeStat = {
  law_type_id: string;
  display_name: string;
  sort_order: number;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  avg_submission_to_az_months: number | null;
  avg_az_to_certificate_months: number | null;
  avg_total_submission_to_certificate_months: number | null;
  median_az_to_certificate_months: number | null;
  min_az_to_certificate_months: number | null;
  max_az_to_certificate_months: number | null;
  avg_waiting_since_submission_months: number | null;
  min_waiting_since_submission_months: number | null;
  max_waiting_since_submission_months: number | null;
};

export type DashboardStats = {
  total_applications: number;
  pending_applications: number;
  approved_applications: number;
  rejected_applications: number;
  law_type_stats: LawTypeStat[];
  monthly_trends: MonthlyTrend[];
  approval_queue_stats: ApprovalQueueStats | null;
  activity_highlights: DashboardActivityHighlights | null;
  refreshed_at: string;
};

export type DashboardDataQualitySummary = {
  refreshed_at: string;
  imported_spreadsheet_rows_included: boolean;
  user_rows_included: boolean;
  claim_handling: "canonical_claims_counted_once";
};

export type ApprovalQueueStats = {
  generated_at: string | null;
  total_approved_with_submission_date: number;
  newest_approved_submitted_on: string | null;
  newest_approved_certificate_received_on: string | null;
  newest_approved_submission_period_label: string | null;
  median_submission_to_certificate_months: number | null;
  cohorts: ApprovalQueueCohort[];
};

export type ApprovalQueueCohort = {
  period_key: string;
  period_label: string;
  year_number: number;
  month_number: number;
  approved_count: number;
  avg_submission_to_certificate_months: number | null;
  min_submission_to_certificate_months: number | null;
  max_submission_to_certificate_months: number | null;
  latest_certificate_received_on: string | null;
  law_type_breakdown?: Array<{
    law_type_id: string;
    approved_count: number;
  }>;
};

export type DashboardActivityHighlights = {
  latest_application_added_at: string | null;
  latest_application_updated_at: string | null;
  latest_application_activity_at?: string | null;
  latest_application_activity_kind?: "added" | "updated" | null;
  latest_approval_recorded_on: string | null;
  applications_added_today?: number;
  applications_updated_today?: number;
  applications_added_last_7_days?: number;
  applications_added_previous_7_days?: number;
  applications_added_last_30_days: number;
  applications_updated_last_7_days?: number;
  applications_updated_previous_7_days?: number;
  applications_updated_last_30_days?: number;
  most_active_application_law_type?: {
    law_type_id: string;
    display_name: string;
    activity_count: number;
  } | null;
  applications_approved_last_30_days: number;
  approvals_recent_period_days?: number;
  approvals_recent_period_count?: number;
  approvals_previous_period_count?: number;
  approvals_recent_period_change?: number;
  most_active_approved_law_type?: {
    law_type_id: string;
    display_name: string;
    approvals_recent_period_count: number;
  } | null;
  approved_cases_with_file_number_count: number;
  avg_approved_submission_to_file_months: number | null;
  avg_approved_file_to_certificate_months: number | null;
  avg_approved_total_months: number | null;
};

export type MonthlyTrend = {
  year_number: number;
  month_number: number;
  month_label: string;
  period_key: string;
  period_label: string;
  submissions: number;
  approvals: number;
};

export type CitizenshipApplication = {
  id: string;
  owner_id: string | null;
  law_type_id: string;
  applicant_label: string | null;
  submission_country: string | null;
  handling_office: string | null;
  handling_office_kind: string | null;
  application_method: string | null;
  submitted_on: string | null;
  aktenzeichen_on: string | null;
  certificate_received_on: string | null;
  status: "submitted" | "aktenzeichen_received" | "certificate_received" | "rejected" | "withdrawn" | "unknown";
  comments: string | null;
  claimed_from_application_id: string | null;
  updated_at: string;
};

export type TimelinePredictionMetadata = {
  matched_law_type: {
    id: string;
    display_name: string;
  };
  comparable_cases_count: number;
  timing_fields_used: Array<{
    field: string;
    label: string;
    value_months: number;
    source: "law_type_stats" | "fallback_default" | "bva_official_stats" | "application_record";
  }>;
  bva_official_data: {
    included: boolean;
    source_label: string | null;
    latest_year: number | null;
    reason: string;
  };
  confidence_reason: string;
};

export type TimelinePrediction = {
  predicted_next_milestone: string;
  date_range_start: string | null;
  date_range_end: string | null;
  confidence: "low" | "medium" | "high";
  similar_cases_count: number;
  basis: string;
  caveats: string;
  metadata: TimelinePredictionMetadata;
};
