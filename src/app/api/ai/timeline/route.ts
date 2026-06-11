import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getLatestBvaStag5Stats } from "@/lib/bva-stats";
import type { LawTypeStat, TimelinePredictionMetadata } from "@/lib/types";
import { addMonths, lawTypeLabel } from "@/lib/utils";
import { getDashboardStats } from "@/lib/data";
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
    bva_official_data: z.object({
      included: z.boolean(),
      source_label: z.string().nullable(),
      latest_year: z.number().nullable(),
      reason: z.string(),
    }),
    confidence_reason: z.string(),
  }),
});

const ExplanationSchema = z.object({
  basis: z.string(),
  caveats: z.string(),
});

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
  const comparableCount = lawStats?.total ?? 0;
  const latestBvaStats = application.law_type_id === "5_stag_erklarung" ? getLatestBvaStag5Stats() : null;
  const azField = getTimingField(lawStats, "avg_submission_to_az_months", 3);
  const certificateField = getCertificateTimingField(lawStats);
  const azMonths = azField.value_months;
  const certificateMonths = certificateField.value_months;
  const certificateRangePadding = latestBvaStats ? 10 : 4;

  const now = new Date();
  let milestone = "file number";
  const timingFieldsUsed: TimelinePredictionMetadata["timing_fields_used"] = [
    {
      field: application.submitted_on ? "submitted_on" : "current_date",
      label: application.submitted_on ? "Submitted date" : "Current date fallback",
      value_months: 0,
      source: application.submitted_on ? "application_record" : "fallback_default",
    },
    azField,
  ];
  let start = addMonths(application.submitted_on ? new Date(application.submitted_on) : now, Math.max(1, azMonths - 2));
  let end = addMonths(application.submitted_on ? new Date(application.submitted_on) : now, azMonths + 2);

  if (application.aktenzeichen_on && !application.certificate_received_on) {
    milestone = "certificate decision";
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
        field: latestBvaStats ? "bva_backlog_range_padding_months" : "standard_range_padding_months",
        label: latestBvaStats ? "BVA backlog range padding" : "Standard range padding",
        value_months: certificateRangePadding,
        source: latestBvaStats ? "bva_official_stats" : "fallback_default",
      },
    );
    start = addMonths(new Date(application.aktenzeichen_on), Math.max(1, certificateMonths - 4));
    end = addMonths(new Date(application.aktenzeichen_on), certificateMonths + certificateRangePadding);
  } else if (application.certificate_received_on) {
    milestone = "completed";
    timingFieldsUsed.splice(0, timingFieldsUsed.length, {
      field: "certificate_received_on",
      label: "Certificate received date",
      value_months: 0,
      source: "application_record",
    });
    start = new Date(application.certificate_received_on);
    end = new Date(application.certificate_received_on);
  }

  const officialBvaNote = latestBvaStats
    ? ` This estimate also includes official BVA StAG 5 processing data from 2022-2024; in 2024 BVA recorded ${latestBvaStats.recordedApplications.toLocaleString("en-US")} applications, completed ${latestBvaStats.totalCompleted.toLocaleString("en-US")} cases, issued ${latestBvaStats.certificatesIssued.toLocaleString("en-US")} certificates, and reported ${latestBvaStats.applicationInventory.toLocaleString("en-US")} cases in inventory. That inventory equals roughly ${latestBvaStats.inventoryToCompletionYears} years of 2024 completions, so StAG 5 ranges are treated with extra backlog caution.`
    : "";
  const confidence = comparableCount >= 50 ? "high" : comparableCount >= 10 ? "medium" : "low";
  const metadata: TimelinePredictionMetadata = {
    matched_law_type: {
      id: application.law_type_id,
      display_name: lawTypeLabel(lawStats?.display_name ?? application.law_type_id),
    },
    comparable_cases_count: comparableCount,
    timing_fields_used: timingFieldsUsed,
    bva_official_data: {
      included: Boolean(latestBvaStats),
      source_label: latestBvaStats?.sourceLabel ?? null,
      latest_year: latestBvaStats?.year ?? null,
      reason: latestBvaStats
        ? "Included because this application matched StAG 5, where BVA official processing statistics are available."
        : "Not included because this application type does not have a matching BVA official-data adjustment.",
    },
    confidence_reason: getConfidenceReason(comparableCount, confidence),
  };

  const baseline = {
    predicted_next_milestone: milestone,
    date_range_start: start.toISOString().slice(0, 10),
    date_range_end: end.toISOString().slice(0, 10),
    confidence,
    similar_cases_count: comparableCount,
    basis: `Estimate based on aggregate ${lawTypeLabel(lawStats?.display_name ?? application.law_type_id)} timing patterns.${officialBvaNote}`,
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

  await supabase.from("application_predictions").insert({
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
      bvaStag5ProcessingStats: latestBvaStats,
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

  return NextResponse.json(prediction);
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

function getConfidenceReason(comparableCount: number, confidence: "low" | "medium" | "high") {
  if (confidence === "high") return `High confidence because ${comparableCount.toLocaleString("en-US")} comparable cases matched this application type.`;
  if (confidence === "medium") return `Medium confidence because ${comparableCount.toLocaleString("en-US")} comparable cases matched this application type.`;
  return `Low confidence because only ${comparableCount.toLocaleString("en-US")} comparable cases matched this application type.`;
}
