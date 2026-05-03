import { redirect } from "next/navigation";
import { AccountSetupCard } from "@/components/account-setup-card";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Account setup",
};

export default async function AccountSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata.name === "string"
        ? user.user_metadata.name
        : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Finish setting up your account</h1>
        <p className="mt-2 text-muted">
          Choose how you want to connect your citizenship timeline. You can add a new application, claim an older spreadsheet entry, or continue to the dashboard and return later.
        </p>
      </div>
      <AccountSetupCard displayName={displayName} email={user.email ?? null} />
    </div>
  );
}
