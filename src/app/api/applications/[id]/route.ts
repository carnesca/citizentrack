import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return NextResponse.json({ error: "Invalid application id." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const dataClient = hasServiceRole ? createAdminClient() : supabase;
  const { data: application, error: lookupError } = await dataClient
    .from("citizenship_applications")
    .select("id, owner_id")
    .eq("id", params.data.id)
    .single();

  if (lookupError || !application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (application.owner_id !== user.id) {
    return NextResponse.json({ error: "You can only delete applications that belong to your account." }, { status: 403 });
  }

  await dataClient.from("application_predictions").delete().eq("application_id", params.data.id).eq("owner_id", user.id);

  const { error: deleteError } = await dataClient
    .from("citizenship_applications")
    .delete()
    .eq("id", params.data.id)
    .eq("owner_id", user.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
