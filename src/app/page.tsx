import { Dashboard } from "@/components/dashboard";
import { SiteFooter } from "@/components/site-footer";
import { TopNav } from "@/components/top-nav";
import { getDashboardStats } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
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
