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
  source_record_key: string | null;
  applicant_label: string | null;
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
  comments: string | null;
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
  applicant_label: string | null;
  source_record_key: string | null;
  comments: string | null;
  claimed_from_public_record_id: string | null;
  application_created_at: string;
  application_updated_at: string;
};

type SnapshotStatisticsRow = {
  application_type: string;
  total_applications: number;
  avg_time_to_file_number_since_submission_months: number | null;
  avg_time_to_citizenship_since_file_number_months: number | null;
  total_avg_time_since_submission_months: number | null;
  avg_waiting_since_submission_months: number | null;
  min_waiting_since_submission_months: number | null;
  max_waiting_since_submission_months: number | null;
};

type SnapshotApplicationRow = {
  name_username_id: string;
  country_of_submission: string | null;
  consulate_embassy_submission: string | null;
  date_of_submission: string | null;
  date_of_file_number: string | null;
  time_between_submission_and_file_number_receipt_months: number | null;
  received_certificate_on_date: string | null;
  time_between_file_number_and_citizenship_certificate_receipt_months: number | null;
  when_info_was_last_updated_on_spreadsheet: string | null;
  comments_notes: string | null;
};

type SnapshotApplicationPart = {
  application_type: string;
  law_type_id: string;
  row_count: number;
  rows: SnapshotApplicationRow[];
};

type SnapshotWorkbook = {
  statistics: SnapshotStatisticsRow[];
  application_type_tabs: SnapshotApplicationPart[];
};

type WorksheetRows = {
  name: string;
  rows: Array<Array<string | number | null>>;
};

const EXPORT_BUCKET = "public-exports";
const STATISTICS_COLUMNS = [
  "application_type",
  "total_applications",
  "avg_time_to_file_number_since_submission_months",
  "avg_time_to_citizenship_since_file_number_months",
  "total_avg_time_since_submission_months",
  "avg_waiting_since_submission_months",
  "min_waiting_since_submission_months",
  "max_waiting_since_submission_months",
] as const;
const APPLICATION_COLUMNS_FOR_SNAPSHOT = [
  "name_username_id",
  "country_of_submission",
  "consulate_embassy_submission",
  "date_of_submission",
  "date_of_file_number",
  "time_between_submission_and_file_number_receipt_months",
  "received_certificate_on_date",
  "time_between_file_number_and_citizenship_certificate_receipt_months",
  "when_info_was_last_updated_on_spreadsheet",
  "comments_notes",
] as const;
const APPLICATION_COLUMNS = [
  "id",
  "owner_id",
  "law_type_id",
  "is_public",
  "source_spreadsheet_id",
  "source_sheet_gid",
  "source_sheet_name",
  "source_row_number",
  "source_record_key",
  "applicant_label",
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
  "comments",
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
  const workbook = buildSnapshotWorkbook(records, lawTypes, generatedAt);

  const payload = {
    schema_version: 2,
    generated_at: generatedAt,
    snapshot_date: snapshotDate,
    source: "CitizenTrack public application export",
    privacy:
      "This public export excludes owner_id, emails, auth data, and raw free-text date fields. Applicant labels and comments are included to mirror the source community spreadsheet.",
    record_count: records.length,
    statistics: workbook.statistics,
    application_type_tabs: workbook.application_type_tabs,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const csv = toSpreadsheetCsv(workbook);
  const xlsx = toSpreadsheetXlsx(workbook);
  const manifest = JSON.stringify(
    {
      schema_version: 2,
      generated_at: generatedAt,
      latest: {
        json: publicUrl(supabaseUrl, "applications/latest.json"),
        csv: publicUrl(supabaseUrl, "applications/latest.csv"),
        xlsx: publicUrl(supabaseUrl, "applications/latest.xlsx"),
      },
      snapshots: {
        json: publicUrl(supabaseUrl, `applications/snapshots/${snapshotDate}.json`),
        csv: publicUrl(supabaseUrl, `applications/snapshots/${snapshotDate}.csv`),
        xlsx: publicUrl(supabaseUrl, `applications/snapshots/${snapshotDate}.xlsx`),
      },
      record_count: records.length,
      format:
        "XLSX contains one worksheet named Statistics and one worksheet per application type. JSON contains statistics and application_type_tabs sections. CSV contains the same sections in a single file.",
    },
    null,
    2,
  );

  await uploadObject(supabase, "applications/latest.json", json, "application/json; charset=utf-8");
  await uploadObject(supabase, "applications/latest.csv", csv, "text/csv; charset=utf-8");
  await uploadObject(
    supabase,
    "applications/latest.xlsx",
    xlsx,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
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
  await uploadObject(
    supabase,
    `applications/snapshots/${snapshotDate}.xlsx`,
    xlsx,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
    applicant_label: application.applicant_label,
    source_record_key: application.source_record_key,
    comments: application.comments,
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

function buildSnapshotWorkbook(
  records: PublicApplicationRecord[],
  lawTypes: Map<string, LawType>,
  generatedAt: string,
): SnapshotWorkbook {
  const lawTypeOrder = Array.from(lawTypes.values()).sort(compareLawTypes);
  const recordsByLawType = groupRecordsByLawType(records);

  const application_type_tabs = lawTypeOrder.map((lawType) => {
    const rows = (recordsByLawType.get(lawType.id) ?? [])
      .sort(compareRecordsForSheet)
      .map(toSnapshotApplicationRow);

    return {
      application_type: lawType.display_name,
      law_type_id: lawType.id,
      row_count: rows.length,
      rows,
    };
  });

  const knownLawIds = new Set(lawTypeOrder.map((lawType) => lawType.id));
  for (const [lawTypeId, lawRecords] of recordsByLawType.entries()) {
    if (knownLawIds.has(lawTypeId)) continue;

    application_type_tabs.push({
      application_type: lawRecords[0]?.law_type ?? lawTypeId,
      law_type_id: lawTypeId,
      row_count: lawRecords.length,
      rows: lawRecords.sort(compareRecordsForSheet).map(toSnapshotApplicationRow),
    });
  }

  return {
    statistics: application_type_tabs.map((part) =>
      buildStatisticsRow(part.application_type, recordsByLawType.get(part.law_type_id) ?? [], generatedAt),
    ),
    application_type_tabs,
  };
}

function groupRecordsByLawType(records: PublicApplicationRecord[]) {
  const grouped = new Map<string, PublicApplicationRecord[]>();

  for (const record of records) {
    const existing = grouped.get(record.law_type_id) ?? [];
    existing.push(record);
    grouped.set(record.law_type_id, existing);
  }

  return grouped;
}

function buildStatisticsRow(
  applicationType: string,
  records: PublicApplicationRecord[],
  generatedAt: string,
): SnapshotStatisticsRow {
  const waitingMonths = records
    .map((record) => monthsWaitingSinceSubmission(record, generatedAt))
    .filter(isNumber);

  return {
    application_type: applicationType,
    total_applications: records.length,
    avg_time_to_file_number_since_submission_months: average(
      records.map((record) => record.months_submission_to_file_number),
    ),
    avg_time_to_citizenship_since_file_number_months: average(
      records.map((record) => record.months_file_number_to_certificate),
    ),
    total_avg_time_since_submission_months: average(records.map(totalMonthsSubmissionToCertificate)),
    avg_waiting_since_submission_months: average(waitingMonths),
    min_waiting_since_submission_months: min(waitingMonths),
    max_waiting_since_submission_months: max(waitingMonths),
  };
}

function toSnapshotApplicationRow(record: PublicApplicationRecord): SnapshotApplicationRow {
  return {
    name_username_id: record.applicant_label ?? record.source_record_key ?? record.public_record_id,
    country_of_submission: record.submission_country,
    consulate_embassy_submission: record.handling_office,
    date_of_submission: record.submitted_on,
    date_of_file_number: record.file_number_received_on,
    time_between_submission_and_file_number_receipt_months: record.months_submission_to_file_number,
    received_certificate_on_date: record.certificate_received_on,
    time_between_file_number_and_citizenship_certificate_receipt_months:
      record.months_file_number_to_certificate,
    when_info_was_last_updated_on_spreadsheet: record.info_updated_on,
    comments_notes: record.comments,
  };
}

function toSpreadsheetCsv(workbook: SnapshotWorkbook) {
  const lines: string[] = [];

  lines.push("Statistics");
  lines.push(STATISTICS_COLUMNS.join(","));
  for (const row of workbook.statistics) {
    lines.push(STATISTICS_COLUMNS.map((column) => csvCell(row[column])).join(","));
  }

  for (const part of workbook.application_type_tabs) {
    lines.push("");
    lines.push(part.application_type);
    lines.push(APPLICATION_COLUMNS_FOR_SNAPSHOT.join(","));
    for (const row of part.rows) {
      lines.push(APPLICATION_COLUMNS_FOR_SNAPSHOT.map((column) => csvCell(row[column])).join(","));
    }
  }

  return `${lines.join("\n")}\n`;
}

function toSpreadsheetXlsx(workbook: SnapshotWorkbook) {
  const worksheets = workbookToWorksheetRows(workbook);
  const files = new Map<string, string | Buffer>();

  files.set("[Content_Types].xml", contentTypesXml(worksheets.length));
  files.set("_rels/.rels", packageRelationshipsXml());
  files.set("xl/workbook.xml", workbookXml(worksheets));
  files.set("xl/_rels/workbook.xml.rels", workbookRelationshipsXml(worksheets.length));
  files.set("xl/styles.xml", stylesXml());

  worksheets.forEach((worksheet, index) => {
    files.set(`xl/worksheets/sheet${index + 1}.xml`, worksheetXml(worksheet));
  });

  return zipFiles(files);
}

function workbookToWorksheetRows(workbook: SnapshotWorkbook): WorksheetRows[] {
  return [
    {
      name: "Statistics",
      rows: [
        [...STATISTICS_COLUMNS],
        ...workbook.statistics.map((row) => STATISTICS_COLUMNS.map((column) => row[column])),
      ],
    },
    ...workbook.application_type_tabs.map((part) => ({
      name: part.application_type,
      rows: [
        [...APPLICATION_COLUMNS_FOR_SNAPSHOT],
        ...part.rows.map((row) => APPLICATION_COLUMNS_FOR_SNAPSHOT.map((column) => row[column])),
      ],
    })),
  ];
}

function contentTypesXml(sheetCount: number) {
  const sheetOverrides = Array.from({ length: sheetCount }, (_value, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join("");

  return xmlDeclaration(
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      sheetOverrides +
      `</Types>`,
  );
}

function packageRelationshipsXml() {
  return xmlDeclaration(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
  );
}

function workbookXml(worksheets: WorksheetRows[]) {
  const sheets = worksheets
    .map(
      (worksheet, index) =>
        `<sheet name="${xmlAttr(sheetName(worksheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");

  return xmlDeclaration(
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets>${sheets}</sheets>` +
      `</workbook>`,
  );
}

function workbookRelationshipsXml(sheetCount: number) {
  const sheetRelationships = Array.from({ length: sheetCount }, (_value, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join("");

  return xmlDeclaration(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheetRelationships +
      `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`,
  );
}

function stylesXml() {
  return xmlDeclaration(
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><name val="Aptos"/></font></fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/></cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`,
  );
}

function worksheetXml(worksheet: WorksheetRows) {
  const columnCount = Math.max(...worksheet.rows.map((row) => row.length), 1);
  const columns = Array.from(
    { length: columnCount },
    (_value, index) => `<col min="${index + 1}" max="${index + 1}" width="${columnWidth(index)}" customWidth="1"/>`,
  ).join("");
  const rows = worksheet.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => cellXml(value, rowIndex + 1, columnIndex + 1, rowIndex === 0))
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return xmlDeclaration(
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
      `<cols>${columns}</cols>` +
      `<sheetData>${rows}</sheetData>` +
      `<autoFilter ref="A1:${columnName(columnCount)}${Math.max(worksheet.rows.length, 1)}"/>` +
      `</worksheet>`,
  );
}

function cellXml(value: string | number | null, row: number, column: number, isHeader: boolean) {
  const reference = `${columnName(column)}${row}`;
  const style = isHeader ? ` s="1"` : "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}"${style}><v>${value}</v></c>`;
  }

  const text = value === null ? "" : String(value);
  return `<c r="${reference}" t="inlineStr"${style}><is><t>${xmlText(text)}</t></is></c>`;
}

function columnName(column: number) {
  let name = "";
  let value = column;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function columnWidth(index: number) {
  if (index === 0) return 26;
  if (index >= 5 && index <= 7) return 18;
  if (index === 9) return 42;
  return 20;
}

function sheetName(value: string, index: number) {
  const sanitized = value.replaceAll(/[\[\]:*?/\\]/g, " ").trim().slice(0, 31);
  return sanitized || `Sheet ${index + 1}`;
}

function xmlDeclaration(value: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${value}`;
}

function xmlText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function xmlAttr(value: string) {
  return xmlText(value).replaceAll("\"", "&quot;");
}

function zipFiles(files: Map<string, string | Buffer>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const [path, content] of files.entries()) {
    const name = Buffer.from(path, "utf8");
    const body = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const crc = crc32(body);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(body.length, 18);
    localHeader.writeUInt32LE(body.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, body);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(body.length, 20);
    centralHeader.writeUInt32LE(body.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + body.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function monthsWaitingSinceSubmission(record: PublicApplicationRecord, generatedAt: string) {
  if (!record.submitted_on || record.certificate_received_on) return null;

  const submittedAt = new Date(`${record.submitted_on}T00:00:00.000Z`);
  const exportDate = new Date(generatedAt);
  if (Number.isNaN(submittedAt.getTime()) || Number.isNaN(exportDate.getTime())) return null;

  return roundMonths((exportDate.getTime() - submittedAt.getTime()) / 86_400_000 / 30.4375);
}

function totalMonthsSubmissionToCertificate(record: PublicApplicationRecord) {
  if (
    record.months_submission_to_file_number === null ||
    record.months_file_number_to_certificate === null
  ) {
    return null;
  }

  return roundMonths(record.months_submission_to_file_number + record.months_file_number_to_certificate);
}

function average(values: Array<number | null>) {
  const numbers = values.filter(isNumber);
  if (!numbers.length) return null;
  return roundMonths(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}

function min(values: number[]) {
  if (!values.length) return null;
  return roundMonths(Math.min(...values));
}

function max(values: number[]) {
  if (!values.length) return null;
  return roundMonths(Math.max(...values));
}

function roundMonths(value: number) {
  return Math.round(value * 10) / 10;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function compareRecordsForSheet(a: PublicApplicationRecord, b: PublicApplicationRecord) {
  const dateA = a.submitted_on ?? a.info_updated_on ?? a.application_created_at;
  const dateB = b.submitted_on ?? b.info_updated_on ?? b.application_created_at;
  return dateA.localeCompare(dateB) || a.public_record_id.localeCompare(b.public_record_id);
}

function compareLawTypes(a: LawType, b: LawType) {
  return (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id);
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
  body: string | Buffer,
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
