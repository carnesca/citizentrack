import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getLatestBvaStag5Stats } from "@/lib/bva-stats";
import type { LawTypeStat, TimelinePredictionMetadata } from "@/lib/types";
import { addMonths, lawTypeLabel } from "@/lib/utils";
import { getDashboardStats } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  application_id: z.string().uuid(),
});

const PredictionSchema = z.object({
  predicted_next_milestone: z.string(),
  date_range_start: z.string().nullable(),
  date_range_end: z.string().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  similar_cases_count: z.number(),
  basis: z.string(),
  caveats: z.string(),
  metadata: z.object({
    matched_law_type: z.object({
      id: z.string(),
      display_name: z.string(),
    }),
    comparable_cases_count: z.number(),
    timing_fields_used: z.array(
      z.object({
        field: z.string(),
        label: z.string(),
        value_months: z.number(),
        source: z.enum(["law_type_stats", "fallback_default", "bva_official_stats", "application_record"]),
      }),
    ),
    confidence_basis: z.string().optional(),
    primary_window: z.object({
      id: z.enum(["file_number", "certificate"]),
      label: z.string(),
      date_range_start: z.string().nullable(),
      date_range_end: z.string().nullable(),
      typical_months: z.number().nullable(),
      comparable_cases_count: z.number(),
      is_overdue: z.boolean(),
      overdue_message: z.string().nullable(),
    }).optional(),
    secondary_windows: z.array(
      z.object({
        id: z.enum(["file_number", "certificate"]),
        label: z.string(),
        date_range_start: z.string().nullable(),
        date_range_end: z.string().nullable(),
        typical_months: z.number().nullable(),
        comparable_cases_count: z.number(),
        is_overdue: z.boolean(),
        overdue_message: z.string().nullable(),
      }),
    ).optional(),
    comparison: z.object({
      elapsed_submission_months: z.number().nullable(),
      elapsed_current_stage_months: z.number().nullable(),
      average_completed_submission_to_certificate_months: z.number().nullable(),
      average_pending_wait_months: z.number().nullable(),
      status_label: z.string(),
    }).optional(),
    bva_official_data: z.object({
      available: z.boolean().optional(),
      included: z.boolean(),
      used_for_estimate: z.boolean().optional(),
      source_label: z.string().nullable(),
      latest_year: z.number().nullable(),
      latest_period_label: z.string().nullable().optional(),
      latest_backlog: z.number().nullable().optional(),
      recent_average_monthly_processed: z.number().nullable().optional(),
      recent_average_monthly_received: z.number().nullable().optional(),
      reason: z.string(),
    }),
    confidence_reason: z.string(),
  }),
});

const ExplanationSchema = z.object({
  basis: z.string(),
  caveats: z.string(),
});

export async function GET(request: NextRequest) {
  const applicationIds = request.nextUrl.searchParams
    .get("application_ids")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!applicationIds?.length || applicationIds.some((id) => !z.string().uuid().safeParse(id).success)) {
    return NextResponse.json({ error: "Invalid application ids." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const dataClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: applications, error: applicationError } = await dataClient
    .from("citizenship_applications")
    .select("id")
    .eq("owner_id", user.id)
    .in("id", applicationIds);

  if (applicationError) return NextResponse.json({ error: applicationError.message }, { status: 500 });

  const ownedApplicationIds = (applications ?? []).map((application) => application.id as string);
  if (!ownedApplicationIds.length) return NextResponse.json({ predictions: [] });

  const { data: predictions, error } = await dataClient
    .from("application_predictions")
    .select("application_id,predicted_next_milestone,date_range_start,date_range_end,confidence,similar_cases_count,basis,caveats,statistical_snapshot,created_at")
    .eq("owner_id", user.id)
    .in("application_id", ownedApplicationIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const latest = new Map<string, unknown>();
  for (const prediction of predictions ?? []) {
    const applicationId = prediction.application_id as string;
    if (latest.has(applicationId)) continue;

    const shaped = toTimelinePrediction(prediction);
    if (shaped) latest.set(applicationId, shaped);
  }

  return NextResponse.json({ predictions: Array.from(latest.values()) });
}

export async function POST(request: NextRequest) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid application id." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: application, error } = await supabase
    .from("citizenship_applications")
    .select("id, law_type_id, submitted_on, aktenzeichen_on, certificate_received_on")
    .eq("id", parsed.data.application_id)
    .eq("owner_id", user.id)
    .single();

  if (error || !application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const stats = await getDashboardStats();
  const lawStats = stats.law_type_stats.find((law) => law.law_type_id === application.law_type_id);
  const bvaStatsContext = application.law_type_id === "5_stag_erklarung" ? getLatestBvaStag5Stats() : null;
  const azField = getTimingField(lawStats, "avg_submission_to_az_months", 3);
  const certificateField = getCertificateTimingField(lawStats);
  const azMonths = azField.value_months;
  const certificateMonths = certificateField.value_months;
  const totalCertificateField = getTotalCertificateTimingField(lawStats, azMonths + certificateMonths);
  const totalCertificateMonths = totalCertificateField.value_months;
  const certificateRangePadding = 4;

  const today = startOfDay(new Date());
  const submittedOn = application.submitted_on ? parseDateOnly(application.submitted_on) : today;
  const fileNumberOn = application.aktenzeichen_on ? parseDateOnly(application.aktenzeichen_on) : null;
  const certificateOn = application.certificate_received_on ? parseDateOnly(application.certificate_received_on) : null;
  let milestone = "certificate decision";
  let comparableCount = getRelevantComparableCount(lawStats, "submission_to_certificate");
  const timingFieldsUsed: TimelinePredictionMetadata["timing_fields_used"] = [
    {
      field: application.submitted_on ? "submitted_on" : "current_date",
      label: application.submitted_on ? "Submitted date" : "Current date fallback",
      value_months: 0,
      source: application.submitted_on ? "application_record" : "fallback_default",
    },
    totalCertificateField,
  ];
  let start = addMonths(submittedOn, Math.max(1, totalCertificateMonths - 4));
  let end = addMonths(submittedOn, totalCertificateMonths + certificateRangePadding);
  let primaryWindow = createEstimateWindow({
    id: "certificate",
    label: "Estimated certificate window",
    start,
    end,
    typicalMonths: totalCertificateMonths,
    comparableCases: comparableCount,
    today,
  });
  const secondaryWindows = [
    createEstimateWindow({
      id: "file_number",
      label: "Estimated file number window",
      start: addMonths(submittedOn, Math.max(1, azMonths - 2)),
      end: addMonths(submittedOn, azMonths + 2),
      typicalMonths: azMonths,
      comparableCases: getRelevantComparableCount(lawStats, "submission_to_az"),
      today,
    }),
  ];

  if (fileNumberOn && !certificateOn) {
    milestone = "certificate decision";
    comparableCount = getRelevantComparableCount(lawStats, "az_to_certificate");
    timingFieldsUsed.splice(
      0,
      timingFieldsUsed.length,
      {
        field: "aktenzeichen_on",
        label: "File number date",
        value_months: 0,
        source: "application_record",
      },
      certificateField,
      {
        field: "standard_range_padding_months",
        label: "Standard range padding",
        value_months: certificateRangePadding,
        source: "fallback_default",
      },
    );
    start = addMonths(fileNumberOn, Math.max(1, certificateMonths - 4));
    end = addMonths(fileNumberOn, certificateMonths + certificateRangePadding);
    primaryWindow = createEstimateWindow({
      id: "certificate",
      label: "Estimated certificate window",
      start,
      end,
      typicalMonths: certificateMonths,
      comparableCases: comparableCount,
      today,
    });
    secondaryWindows.splice(0, secondaryWindows.length);
  } else if (certificateOn) {
    milestone = "completed";
    comparableCount = getRelevantComparableCount(lawStats, "submission_to_certificate");
    timingFieldsUsed.splice(0, timingFieldsUsed.length, {
      field: "certificate_received_on",
      label: "Certificate received date",
      value_months: 0,
      source: "application_record",
    });
    start = certificateOn;
    end = certificateOn;
    primaryWindow = createEstimateWindow({
      id: "certificate",
      label: "Completed certificate date",
      start,
      end,
      typicalMonths: null,
      comparableCases: comparableCount,
      today,
      allowOverdue: false,
    });
    secondaryWindows.splice(0, secondaryWindows.length);
  }

  const confidence = getConfidence(comparableCount);
  const metadata: TimelinePredictionMetadata = {
    matched_law_type: {
      id: application.law_type_id,
      display_name: lawTypeLabel(lawStats?.display_name ?? application.law_type_id),
    },
    comparable_cases_count: comparableCount,
    confidence_basis: "Confidence is based on comparable cases with the date fields needed for this estimate, not every case of this application type.",
    timing_fields_used: timingFieldsUsed,
    primary_window: primaryWindow,
    secondary_windows: secondaryWindows,
    comparison: {
      elapsed_submission_months: application.submitted_on ? monthsBetween(submittedOn, today) : null,
      elapsed_current_stage_months: fileNumberOn && !certificateOn ? monthsBetween(fileNumberOn, today) : application.submitted_on ? monthsBetween(submittedOn, today) : null,
      average_completed_submission_to_certificate_months: lawStats?.avg_total_submission_to_certificate_months ?? null,
      average_pending_wait_months: lawStats?.avg_waiting_since_submission_months ?? null,
      status_label: getComparisonStatusLabel({
        elapsedSubmissionMonths: application.submitted_on ? monthsBetween(submittedOn, today) : null,
        averageCompletedMonths: lawStats?.avg_total_submission_to_certificate_months ?? null,
        averagePendingMonths: lawStats?.avg_waiting_since_submission_months ?? null,
        primaryWindow,
      }),
    },
    bva_official_data: {
      available: Boolean(bvaStatsContext),
      included: Boolean(bvaStatsContext),
      used_for_estimate: false,
      source_label: bvaStatsContext?.sourceLabel ?? null,
      latest_year: bvaStatsContext?.year ?? null,
      latest_period_label: bvaStatsContext?.monthLabel ?? null,
      latest_backlog: bvaStatsContext?.applicationInventory ?? null,
      recent_average_monthly_processed: bvaStatsContext?.averageMonthlyProcessed
        ? Math.round(bvaStatsContext.averageMonthlyProcessed)
        : null,
      recent_average_monthly_received: bvaStatsContext?.averageMonthlyReceived
        ? Math.round(bvaStatsContext.averageMonthlyReceived)
        : null,
      reason: bvaStatsContext
        ? "Shown as official StAG 5 workload context only. It is not used to calculate this applicant-level estimate because BVA monthly totals do not include individual milestone dates."
        : "Not shown because this application type does not have matching official BVA workload context.",
    },
    confidence_reason: getConfidenceReason(comparableCount, confidence),
  };

  const baseline = {
    predicted_next_milestone: milestone,
    date_range_start: formatDateOnly(start),
    date_range_end: formatDateOnly(end),
    confidence,
    similar_cases_count: comparableCount,
    basis: `Estimate based on aggregate ${lawTypeLabel(lawStats?.display_name ?? application.law_type_id)} timing patterns.`,
    caveats: "This is an estimate, not an official government timeline. Outliers, missing community data, and BVA inventory changes can shift the range.",
    metadata,
  } as const;

  const explanation = await explainWithOpenAI({
    basis: baseline.basis,
    caveats: baseline.caveats,
    metadata: baseline.metadata,
  }).catch(() => ({ basis: baseline.basis, caveats: baseline.caveats }));
  const prediction = PredictionSchema.parse({
    ...baseline,
    basis: explanation.basis,
    caveats: explanation.caveats,
  });

  const { error: predictionInsertError } = await supabase.from("application_predictions").insert({
    application_id: application.id,
    owner_id: user.id,
    predicted_next_milestone: prediction.predicted_next_milestone,
    date_range_start: prediction.date_range_start,
    date_range_end: prediction.date_range_end,
    confidence: prediction.confidence,
    similar_cases_count: prediction.similar_cases_count,
    basis: prediction.basis,
    caveats: prediction.caveats,
    statistical_snapshot: {
      lawStats,
      bvaStag5ProcessingStats: bvaStatsContext,
      metadata: prediction.metadata,
      baseline: {
        predicted_next_milestone: baseline.predicted_next_milestone,
        date_range_start: baseline.date_range_start,
        date_range_end: baseline.date_range_end,
        confidence: baseline.confidence,
        similar_cases_count: baseline.similar_cases_count,
        basis: baseline.basis,
        caveats: baseline.caveats,
      },
    },
    ai_model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL ?? "gpt-4.1-mini" : "deterministic-fallback",
  });

  if (predictionInsertError) {
    return NextResponse.json({ error: `Timeline estimate could not be saved: ${predictionInsertError.message}` }, { status: 500 });
  }

  return NextResponse.json(prediction);
}

function toTimelinePrediction(row: {
  application_id: string;
  predicted_next_milestone: string;
  date_range_start: string | null;
  date_range_end: string | null;
  confidence: "low" | "medium" | "high";
  similar_cases_count: number;
  basis: string;
  caveats: string;
  statistical_snapshot: unknown;
  created_at: string;
}) {
  const snapshot = row.statistical_snapshot as { metadata?: unknown } | null;
  const parsedMetadata = PredictionSchema.shape.metadata.safeParse(snapshot?.metadata);
  if (!parsedMetadata.success) return null;

  return {
    application_id: row.application_id,
    created_at: row.created_at,
    predicted_next_milestone: row.predicted_next_milestone,
    date_range_start: row.date_range_start,
    date_range_end: row.date_range_end,
    confidence: row.confidence,
    similar_cases_count: row.similar_cases_count,
    basis: row.basis,
    caveats: row.caveats,
    metadata: parsedMetadata.data,
  };
}

async function explainWithOpenAI(input: Pick<z.infer<typeof PredictionSchema>, "basis" | "caveats" | "metadata">) {
  if (!process.env.OPENAI_API_KEY) return { basis: input.basis, caveats: input.caveats };

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["basis", "caveats"],
    properties: {
      basis: { type: "string" },
      caveats: { type: "string" },
    },
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: "Rewrite only the explanation text for a citizenship timeline estimate. Use supplied aggregate metadata only. Do not change deterministic dates, counts, confidence, or metadata. Do not ask for or mention private identifiers, comments, or raw rows.",
        },
        {
          role: "user",
          content: `Rewrite basis and caveats clearly for an applicant using only this sanitized aggregate input: ${JSON.stringify(input)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "timeline_prediction",
          schema,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) return { basis: input.basis, caveats: input.caveats };
  const data = await response.json();
  const text =
    data.output_text ??
    data.output?.flatMap((item: { content?: unknown[] }) => item.content ?? []).find((item: { type?: string }) => item.type === "output_text")
      ?.text;
  if (!text) return { basis: input.basis, caveats: input.caveats };
  const parsed = ExplanationSchema.safeParse(JSON.parse(text));
  if (!parsed.success) return { basis: input.basis, caveats: input.caveats };
  return parsed.data;
}

function getTimingField(
  lawStats: LawTypeStat | undefined,
  field: "avg_submission_to_az_months",
  fallbackMonths: number,
): TimelinePredictionMetadata["timing_fields_used"][number] {
  const value = lawStats?.[field];
  return {
    field: value == null ? "default_submission_to_az_months" : field,
    label: value == null ? "Default submission-to-file-number timing" : "Average submission-to-file-number timing",
    value_months: Number(value ?? fallbackMonths),
    source: value == null ? "fallback_default" : "law_type_stats",
  };
}

function getCertificateTimingField(lawStats: LawTypeStat | undefined): TimelinePredictionMetadata["timing_fields_used"][number] {
  if (lawStats?.median_az_to_certificate_months != null) {
    return {
      field: "median_az_to_certificate_months",
      label: "Median file-number-to-certificate timing",
      value_months: Number(lawStats.median_az_to_certificate_months),
      source: "law_type_stats",
    };
  }

  if (lawStats?.avg_az_to_certificate_months != null) {
    return {
      field: "avg_az_to_certificate_months",
      label: "Average file-number-to-certificate timing",
      value_months: Number(lawStats.avg_az_to_certificate_months),
      source: "law_type_stats",
    };
  }

  return {
    field: "default_az_to_certificate_months",
    label: "Default file-number-to-certificate timing",
    value_months: 18,
    source: "fallback_default",
  };
}

function getTotalCertificateTimingField(lawStats: LawTypeStat | undefined, fallbackMonths: number): TimelinePredictionMetadata["timing_fields_used"][number] {
  if (lawStats?.avg_total_submission_to_certificate_months != null) {
    return {
      field: "avg_total_submission_to_certificate_months",
      label: "Average submission-to-certificate timing",
      value_months: Number(lawStats.avg_total_submission_to_certificate_months),
      source: "law_type_stats",
    };
  }

  return {
    field: "combined_submission_to_file_number_and_certificate_months",
    label: "Combined submission-to-certificate timing",
    value_months: Number(fallbackMonths),
    source: "fallback_default",
  };
}

function getRelevantComparableCount(
  lawStats: LawTypeStat | undefined,
  timingKind: "submission_to_az" | "az_to_certificate" | "submission_to_certificate",
) {
  if (!lawStats) return 0;

  if (timingKind === "submission_to_az") {
    return lawStats.submission_to_az_comparable_cases ?? fallbackComparableCount(lawStats, lawStats.avg_submission_to_az_months);
  }

  if (timingKind === "az_to_certificate") {
    return lawStats.az_to_certificate_comparable_cases ?? fallbackComparableCount(lawStats, lawStats.avg_az_to_certificate_months);
  }

  return lawStats.submission_to_certificate_comparable_cases ?? fallbackComparableCount(lawStats, lawStats.avg_total_submission_to_certificate_months);
}

function fallbackComparableCount(lawStats: LawTypeStat, timingValue: number | null) {
  return timingValue == null ? 0 : lawStats.total;
}

function getConfidence(comparableCount: number): "low" | "medium" | "high" {
  if (comparableCount >= 100) return "high";
  if (comparableCount >= 50) return "medium";
  return "low";
}

function getConfidenceReason(comparableCount: number, confidence: "low" | "medium" | "high") {
  if (confidence === "high") return `High confidence because ${comparableCount.toLocaleString("en-US")} comparable cases include the relevant dates for this estimate.`;
  if (confidence === "medium") return `Medium confidence because ${comparableCount.toLocaleString("en-US")} comparable cases include the relevant dates for this estimate.`;
  return `Low confidence because only ${comparableCount.toLocaleString("en-US")} comparable cases include the relevant dates for this estimate.`;
}

function createEstimateWindow({
  id,
  label,
  start,
  end,
  typicalMonths,
  comparableCases,
  today,
  allowOverdue = true,
}: {
  id: "file_number" | "certificate";
  label: string;
  start: Date;
  end: Date;
  typicalMonths: number | null;
  comparableCases: number;
  today: Date;
  allowOverdue?: boolean;
}): NonNullable<TimelinePredictionMetadata["primary_window"]> {
  const isOverdue = allowOverdue && end < today;
  return {
    id,
    label,
    date_range_start: formatDateOnly(start),
    date_range_end: formatDateOnly(end),
    typical_months: typicalMonths,
    comparable_cases_count: comparableCases,
    is_overdue: isOverdue,
    overdue_message: isOverdue ? `The typical ${label.toLowerCase()} has already passed based on comparable cases.` : null,
  };
}

function getComparisonStatusLabel({
  elapsedSubmissionMonths,
  averageCompletedMonths,
  averagePendingMonths,
  primaryWindow,
}: {
  elapsedSubmissionMonths: number | null;
  averageCompletedMonths: number | null;
  averagePendingMonths: number | null;
  primaryWindow: NonNullable<TimelinePredictionMetadata["primary_window"]>;
}) {
  if (primaryWindow.is_overdue) return "This case has passed the typical window shown by comparable completed cases.";
  if (elapsedSubmissionMonths == null) return "Add a submission date to compare this case against similar timelines.";
  if (averageCompletedMonths != null && elapsedSubmissionMonths > averageCompletedMonths) {
    return `This case has waited longer than the ${formatMonthsValue(averageCompletedMonths)} average completed timeline for this application type.`;
  }
  if (averagePendingMonths != null && elapsedSubmissionMonths > averagePendingMonths) {
    return `This case has waited longer than the ${formatMonthsValue(averagePendingMonths)} average pending wait for this application type.`;
  }
  return "This case is still within the typical range shown by comparable cases.";
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date(Number.NaN);
  return startOfDay(new Date(year, month - 1, day));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateOnly(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthsBetween(start: Date, end: Date) {
  const days = (startOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000;
  if (!Number.isFinite(days)) return null;
  return Math.max(0, Math.round((days / 30.4375) * 10) / 10);
}

function formatMonthsValue(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}-month`;
}
