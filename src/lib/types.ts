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
  activity_highlights: DashboardActivityHighlights | null;
  refreshed_at: string;
};

export type DashboardActivityHighlights = {
  latest_application_added_at: string | null;
  latest_application_updated_at: string | null;
  latest_application_activity_on?: string | null;
  latest_approval_recorded_on: string | null;
  applications_added_on_latest_activity_day?: number;
  applications_updated_on_latest_activity_day?: number;
  applications_added_last_30_days: number;
  applications_updated_last_7_days?: number;
  applications_updated_last_30_days?: number;
  applications_active_last_30_days?: number;
  applications_approved_last_30_days: number;
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
