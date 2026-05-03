import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getLatestBvaStag5Stats } from "@/lib/bva-stats";
import { addMonths } from "@/lib/utils";
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
    .select("*")
    .eq("id", parsed.data.application_id)
    .single();

  if (error || !application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const stats = await getDashboardStats();
  const lawStats = stats.law_type_stats.find((law) => law.law_type_id === application.law_type_id);
  const comparableCount = lawStats?.total ?? 0;
  const latestBvaStats = application.law_type_id === "5_stag_erklarung" ? getLatestBvaStag5Stats() : null;
  const azMonths = Number(lawStats?.avg_submission_to_az_months ?? 3);
  const certificateMonths = Number(lawStats?.median_az_to_certificate_months ?? lawStats?.avg_az_to_certificate_months ?? 18);
  const certificateRangePadding = latestBvaStats ? 10 : 4;

  const now = new Date();
  let milestone = "file number";
  let start = addMonths(application.submitted_on ? new Date(application.submitted_on) : now, Math.max(1, azMonths - 2));
  let end = addMonths(application.submitted_on ? new Date(application.submitted_on) : now, azMonths + 2);

  if (application.aktenzeichen_on && !application.certificate_received_on) {
    milestone = "certificate decision";
    start = addMonths(new Date(application.aktenzeichen_on), Math.max(1, certificateMonths - 4));
    end = addMonths(new Date(application.aktenzeichen_on), certificateMonths + certificateRangePadding);
  } else if (application.certificate_received_on) {
    milestone = "completed";
    start = new Date(application.certificate_received_on);
    end = new Date(application.certificate_received_on);
  }

  const officialBvaNote = latestBvaStats
    ? ` This estimate also includes official BVA §5 processing data from 2022-2024; in 2024 BVA recorded ${latestBvaStats.recordedApplications.toLocaleString("en-US")} applications, completed ${latestBvaStats.totalCompleted.toLocaleString("en-US")} cases, issued ${latestBvaStats.certificatesIssued.toLocaleString("en-US")} certificates, and reported ${latestBvaStats.applicationInventory.toLocaleString("en-US")} cases in inventory. That inventory equals roughly ${latestBvaStats.inventoryToCompletionYears} years of 2024 completions, so §5 ranges are treated with extra backlog caution.`
    : "";

  const baseline = {
    predicted_next_milestone: milestone,
    date_range_start: start.toISOString().slice(0, 10),
    date_range_end: end.toISOString().slice(0, 10),
    confidence: comparableCount >= 50 ? "high" : comparableCount >= 10 ? "medium" : "low",
    similar_cases_count: comparableCount,
    basis: `Estimate based on aggregate ${lawStats?.display_name ?? application.law_type_id} timing patterns.${officialBvaNote}`,
    caveats: "This is an estimate, not an official government timeline. Outliers, missing community data, and BVA inventory changes can shift the range.",
  } as const;

  const aiPrediction = await explainWithOpenAI(baseline).catch(() => baseline);
  const prediction = PredictionSchema.parse(aiPrediction);

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
    statistical_snapshot: { lawStats, bvaStag5ProcessingStats: latestBvaStats, baseline },
    ai_model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL ?? "gpt-4.1-mini" : "deterministic-fallback",
  });

  return NextResponse.json(prediction);
}

async function explainWithOpenAI(baseline: z.infer<typeof PredictionSchema>) {
  if (!process.env.OPENAI_API_KEY) return baseline;

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["predicted_next_milestone", "date_range_start", "date_range_end", "confidence", "similar_cases_count", "basis", "caveats"],
    properties: {
      predicted_next_milestone: { type: "string" },
      date_range_start: { type: ["string", "null"] },
      date_range_end: { type: ["string", "null"] },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      similar_cases_count: { type: "number" },
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
          content: "Explain citizenship timeline estimates from supplied aggregate statistics only. Preserve any supplied BVA official-statistics note. Do not invent dates or official guarantees.",
        },
        {
          role: "user",
          content: `Rewrite this estimate clearly for an applicant while preserving all fields and ranges: ${JSON.stringify(baseline)}`,
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

  if (!response.ok) return baseline;
  const data = await response.json();
  const text =
    data.output_text ??
    data.output?.flatMap((item: { content?: unknown[] }) => item.content ?? []).find((item: { type?: string }) => item.type === "output_text")
      ?.text;
  if (!text) return baseline;
  return JSON.parse(text);
}
