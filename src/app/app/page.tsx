import { Dashboard } from "@/components/dashboard";
import { ApplicationList } from "@/components/application-list";
import { getDashboardStats } from "@/lib/data";

export default async function AppPage() {
  const stats = await getDashboardStats();

  return (
    <div className="mx-auto w-full max-w-[116rem] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <ApplicationList />
      </div>
      <Dashboard stats={stats} />
    </div>
  );
}
