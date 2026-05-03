import { Dashboard } from "@/components/dashboard";
import { SiteFooter } from "@/components/site-footer";
import { TopNav } from "@/components/top-nav";
import { getDashboardStats } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <main className="app-grid min-h-screen">
      <TopNav />
      <Dashboard stats={stats} />
      <SiteFooter />
    </main>
  );
}
