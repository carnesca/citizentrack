import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { SiteFooter } from "@/components/site-footer";
import { TopNav } from "@/components/top-nav";
import { getDashboardStats } from "@/lib/data";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    next?: string;
    token_hash?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;

  if (params.code || (params.token_hash && params.type)) {
    const callbackParams = new URLSearchParams();
    const next = getSafeRedirectPath(params.next, "http://localhost", "/app/setup");

    if (params.code) callbackParams.set("code", params.code);
    if (params.token_hash) callbackParams.set("token_hash", params.token_hash);
    if (params.type) callbackParams.set("type", params.type);
    callbackParams.set("next", next);

    redirect(`/auth/confirm?${callbackParams.toString()}`);
  }

  const stats = await getDashboardStats();

  return (
    <main className="app-grid flex min-h-screen flex-col">
      <TopNav />
      <div className="flex-1">
        <Dashboard stats={stats} />
      </div>
      <SiteFooter />
    </main>
  );
}
