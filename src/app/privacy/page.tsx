import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { TopNav } from "@/components/top-nav";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="app-grid min-h-screen">
      <TopNav />
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm font-semibold text-primary">CitizenTrack</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <div className="mt-6 space-y-5 text-base leading-7 text-muted-foreground">
          <p>
            CitizenTrack helps people track German citizenship application timelines and view community statistics. It is an
            open-source community project and is not a government service.
          </p>
          <p>
            If you create an account, CitizenTrack stores the information needed to keep your account and your saved
            application records working. Public dashboard data and exports are anonymized and do not include account IDs,
            email addresses, or authentication details.
          </p>
          <p>
            CitizenTrack uses Supabase for authentication and database storage. If Google sign-in is used, Google provides
            basic account information needed to sign you in, such as your email address.
          </p>
          <p>
            Do not enter government account passwords, banking details, or other sensitive credentials into CitizenTrack.
            Timeline estimates are informational only and are not official government guidance.
          </p>
          <p>
            You can stop using the service at any time. Because the project is open source, you can also inspect the code on
            GitHub.
          </p>
        </div>
        <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-primary hover:underline">
          Back to dashboard
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
