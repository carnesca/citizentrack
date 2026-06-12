import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { TopNav } from "@/components/top-nav";

export const metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <main className="app-grid min-h-screen">
      <TopNav />
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm font-semibold text-primary">CitizenTrack</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Terms</h1>
        <div className="mt-6 space-y-5 text-base leading-7 text-muted-foreground">
          <p>
            CitizenTrack is a free, open-source community project for tracking and sharing anonymized German citizenship
            application timeline information.
          </p>
          <p>
            CitizenTrack is not a government service, law firm, immigration adviser, or paid product. Nothing on the site is
            legal advice or an official timeline.
          </p>
          <p>
            Please enter only information you are comfortable saving for your own tracking and contributing anonymously to
            community statistics. Do not submit false, harmful, or sensitive third-party information.
          </p>
          <p>
            The service is provided as-is and may change or be unavailable. Because nobody is paying for access, there are no
            paid service commitments or refund terms.
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
