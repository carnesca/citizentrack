import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ClaimSchema = z.object({
  law_type_id: z.string().min(1),
  submission_country: z.string().optional().nullable(),
  handling_office: z.string().optional().nullable(),
  application_method: z.string().optional().nullable(),
  submitted_on: z.string().min(1),
  aktenzeichen_on: z.string().optional().nullable(),
  certificate_received_on: z.string().optional().nullable(),
  aktenzeichen_not_received: z.boolean().optional(),
  certificate_not_received: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = ClaimSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing claim details." }, { status: 400 });
  }

  const claim = parsed.data;
  const { data: applicationId, error } = await supabase.rpc("claim_citizenship_case", {
    p_law_type_id: claim.law_type_id,
    p_submitted_on: claim.submitted_on,
    p_submission_country: blankToNull(claim.submission_country),
    p_handling_office: blankToNull(claim.handling_office),
    p_application_method: blankToNull(claim.application_method),
    p_aktenzeichen_on: blankToNull(claim.aktenzeichen_on),
    p_certificate_received_on: blankToNull(claim.certificate_received_on),
    p_aktenzeichen_not_received: Boolean(claim.aktenzeichen_not_received),
    p_certificate_not_received: Boolean(claim.certificate_not_received),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ application_id: applicationId });
}

function blankToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
