import { Dashboard } from "@/components/dashboard";
import { OAuthCodeHandler } from "@/components/oauth-code-handler";
import { SiteFooter } from "@/components/site-footer";
import { TopNav } from "@/components/top-nav";
import { getDashboardStats } from "@/lib/data";

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
    return <OAuthCodeHandler code={params.code ?? null} fallbackNext={params.next ?? "/app/setup"} />;
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
