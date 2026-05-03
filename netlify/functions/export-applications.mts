import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Config } from "@netlify/functions";
import type { SupabaseClient } from "@supabase/supabase-js";

declare const Netlify: {
  env: {
    get(key: string): string | undefined;
  };
};

type RawApplication = {
  id: string;
  owner_id: string | null;
  law_type_id: string;
  is_public: boolean;
  source_spreadsheet_id: string | null;
  source_sheet_gid: string | null;
  source_sheet_name: string | null;
  source_row_number: number | null;
  submission_country: string | null;
  handling_office: string | null;
  handling_office_kind: string | null;
  application_method: string | null;
  submitted_on: string | null;
  submitted_on_precision: string;
  aktenzeichen_on: string | null;
  aktenzeichen_on_precision: string;
  certificate_received_on: string | null;
  certificate_received_on_precision: string;
  info_updated_on: string | null;
  info_updated_on_precision: string;
  months_submission_to_az: number | null;
  months_az_to_certificate: number | null;
  days_az_to_today: number | null;
  days_waiting_for_reply: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  claimed_from_application_id: string | null;
};

type LawType = {
  id: string;
  display_name: string;
  sort_order: number | null;
};

type PublicApplicationRecord = {
  public_record_id: string;
  record_origin: "historical_spreadsheet" | "user_submitted" | "claimed_spreadsheet_case";
  law_type_id: string;
  law_type: string;
  submission_country: string | null;
  handling_office: string | null;
  handling_office_kind: string | null;
  application_method: string | null;
  submitted_on: string | null;
  submitted_on_precision: string;
  file_number_received_on: string | null;
  file_number_received_on_precision: string;
  certificate_received_on: string | null;
  certificate_received_on_precision: string;
  info_updated_on: string | null;
  info_updated_on_precision: string;
  months_submission_to_file_number: number | null;
  months_file_number_to_certificate: number | null;
  days_file_number_to_export_date: number | null;
  days_waiting_for_reply: number | null;
  status: string;
  source_sheet_name: string | null;
  source_sheet_gid: string | null;
  source_row_number: number | null;
  claimed_from_public_record_id: string | null;
  application_created_at: string;
  application_updated_at: string;
};

const EXPORT_BUCKET = "public-exports";
const APPLICATION_COLUMNS = [
  "id",
  "owner_id",
  "law_type_id",
  "is_public",
  "source_spreadsheet_id",
  "source_sheet_gid",
  "source_sheet_name",
  "source_row_number",
  "submission_country",
  "handling_office",
  "handling_office_kind",
  "application_method",
  "submitted_on",
  "submitted_on_precision",
  "aktenzeichen_on",
  "aktenzeichen_on_precision",
  "certificate_received_on",
  "certificate_received_on_precision",
  "info_updated_on",
  "info_updated_on_precision",
  "months_submission_to_az",
  "months_az_to_certificate",
  "days_az_to_today",
  "days_waiting_for_reply",
  "status",
  "created_at",
  "updated_at",
  "claimed_from_application_id",
].join(",");

const handler = async () => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [applications, lawTypes] = await Promise.all([
    fetchAllApplications(supabase),
    fetchLawTypes(supabase),
  ]);
  const records = buildPublicRecords(applications, lawTypes);
  const generatedAt = new Date().toISOString();
  const snapshotDate = generatedAt.slice(0, 10);

  const payload = {
    schema_version: 1,
    generated_at: generatedAt,
    snapshot_date: snapshotDate,
    source: "CitizenTrack public application export",
    privacy:
      "This anonymized export excludes owner_id, applicant labels, comments, emails, auth data, and raw free-text date fields.",
    record_count: records.length,
    records,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const csv = toCsv(records);
  const manifest = JSON.stringify(
    {
      schema_version: 1,
      generated_at: generatedAt,
      latest: {
        json: publicUrl(supabaseUrl, "applications/latest.json"),
        csv: publicUrl(supabaseUrl, "applications/latest.csv"),
      },
      snapshots: {
        json: publicUrl(supabaseUrl, `applications/snapshots/${snapshotDate}.json`),
        csv: publicUrl(supabaseUrl, `applications/snapshots/${snapshotDate}.csv`),
      },
      record_count: records.length,
    },
    null,
    2,
  );

  await uploadObject(supabase, "applications/latest.json", json, "application/json; charset=utf-8");
  await uploadObject(supabase, "applications/latest.csv", csv, "text/csv; charset=utf-8");
  await uploadObject(
    supabase,
    `applications/snapshots/${snapshotDate}.json`,
    json,
    "application/json; charset=utf-8",
  );
  await uploadObject(
    supabase,
    `applications/snapshots/${snapshotDate}.csv`,
    csv,
    "text/csv; charset=utf-8",
  );
  await uploadObject(supabase, "applications/manifest.json", `${manifest}\n`, "application/json; charset=utf-8");

  console.log(`Exported ${records.length} public application records for ${snapshotDate}.`);
};

export default handler;

export const config: Config = {
  schedule: "0 9 * * 1",
};

function requireEnv(key: string) {
  const value = Netlify.env.get(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

async function fetchAllApplications(supabase: SupabaseClient) {
  const rows: RawApplication[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("citizenship_applications")
      .select(APPLICATION_COLUMNS)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;
    rows.push(...((data ?? []) as unknown as RawApplication[]));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function fetchLawTypes(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("citizenship_law_types")
    .select("id,display_name,sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return new Map(((data ?? []) as unknown as LawType[]).map((lawType) => [lawType.id, lawType]));
}

function buildPublicRecords(applications: RawApplication[], lawTypes: Map<string, LawType>) {
  const claimedBySource = new Map<string, RawApplication>();

  for (const application of applications) {
    if (!application.claimed_from_application_id) continue;

    const current = claimedBySource.get(application.claimed_from_application_id);
    if (!current || compareByFreshness(application, current) > 0) {
      claimedBySource.set(application.claimed_from_application_id, application);
    }
  }

  const claimedSourceIds = new Set(claimedBySource.keys());
  const canonical = applications.filter((application) => {
    if (application.claimed_from_application_id) return false;

    const isClaimedHistoricalSource =
      application.owner_id === null && application.is_public && claimedSourceIds.has(application.id);

    return !isClaimedHistoricalSource;
  });

  canonical.push(...claimedBySource.values());

  return canonical
    .sort((a, b) => {
      const dateA = a.submitted_on ?? a.created_at;
      const dateB = b.submitted_on ?? b.created_at;
      return dateA.localeCompare(dateB) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
    })
    .map((application) => toPublicRecord(application, lawTypes));
}

function toPublicRecord(application: RawApplication, lawTypes: Map<string, LawType>): PublicApplicationRecord {
  const origin = application.claimed_from_application_id
    ? "claimed_spreadsheet_case"
    : application.owner_id
      ? "user_submitted"
      : "historical_spreadsheet";

  return {
    public_record_id: publicRecordId(application.id),
    record_origin: origin,
    law_type_id: application.law_type_id,
    law_type: lawTypes.get(application.law_type_id)?.display_name ?? application.law_type_id,
    submission_country: application.submission_country,
    handling_office: application.handling_office,
    handling_office_kind: application.handling_office_kind,
    application_method: application.application_method,
    submitted_on: application.submitted_on,
    submitted_on_precision: application.submitted_on_precision,
    file_number_received_on: application.aktenzeichen_on,
    file_number_received_on_precision: application.aktenzeichen_on_precision,
    certificate_received_on: application.certificate_received_on,
    certificate_received_on_precision: application.certificate_received_on_precision,
    info_updated_on: application.info_updated_on,
    info_updated_on_precision: application.info_updated_on_precision,
    months_submission_to_file_number: application.months_submission_to_az,
    months_file_number_to_certificate: application.months_az_to_certificate,
    days_file_number_to_export_date: application.days_az_to_today,
    days_waiting_for_reply: application.days_waiting_for_reply,
    status: application.status,
    source_sheet_name: application.source_sheet_name,
    source_sheet_gid: application.source_sheet_gid,
    source_row_number: application.source_row_number,
    claimed_from_public_record_id: application.claimed_from_application_id
      ? publicRecordId(application.claimed_from_application_id)
      : null,
    application_created_at: application.created_at,
    application_updated_at: application.updated_at,
  };
}

function compareByFreshness(a: RawApplication, b: RawApplication) {
  return (
    a.updated_at.localeCompare(b.updated_at) ||
    a.created_at.localeCompare(b.created_at) ||
    a.id.localeCompare(b.id)
  );
}

function publicRecordId(id: string) {
  return `ct_${createHash("sha256").update(id).digest("hex").slice(0, 16)}`;
}

function toCsv(records: PublicApplicationRecord[]) {
  const columns = [
    "public_record_id",
    "record_origin",
    "law_type_id",
    "law_type",
    "submission_country",
    "handling_office",
    "handling_office_kind",
    "application_method",
    "submitted_on",
    "submitted_on_precision",
    "file_number_received_on",
    "file_number_received_on_precision",
    "certificate_received_on",
    "certificate_received_on_precision",
    "info_updated_on",
    "info_updated_on_precision",
    "months_submission_to_file_number",
    "months_file_number_to_certificate",
    "days_file_number_to_export_date",
    "days_waiting_for_reply",
    "status",
    "source_sheet_name",
    "source_sheet_gid",
    "source_row_number",
    "claimed_from_public_record_id",
    "application_created_at",
    "application_updated_at",
  ] as const;

  const header = columns.join(",");
  const rows = records.map((record) => columns.map((column) => csvCell(record[column])).join(","));

  return `${[header, ...rows].join("\n")}\n`;
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

async function uploadObject(
  supabase: SupabaseClient,
  path: string,
  body: string,
  contentType: string,
) {
  const { error } = await supabase.storage.from(EXPORT_BUCKET).upload(path, body, {
    contentType,
    upsert: true,
  });

  if (error) throw error;
}

function publicUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${EXPORT_BUCKET}/${path}`;
}
