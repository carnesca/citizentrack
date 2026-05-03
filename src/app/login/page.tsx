import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { DatabaseZap, TimerReset } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { TopNav } from "@/components/top-nav";

export const metadata = {
  title: "Log In",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const initialError =
    params.error === "invalid-link"
      ? "That sign-in link is invalid or expired. Sign in with your email and password."
      : null;

  return (
    <main className="app-grid min-h-screen">
      <TopNav />
      <div className="mx-auto grid w-full max-w-6xl items-start gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1fr_0.88fr] lg:gap-12">
        <section className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <span className="relative block h-[176px] w-[260px] dark:hidden sm:h-[202px] sm:w-[298px]">
              <Image src="/logo-icon-light.png" alt="CitizenTrack" fill priority sizes="298px" className="object-contain" />
            </span>
            <span className="relative hidden h-[176px] w-[260px] dark:block sm:h-[202px] sm:w-[298px]">
              <Image src="/logo-icon-dark.png" alt="CitizenTrack" fill priority sizes="298px" className="object-contain" />
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Track your path to German citizenship.
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Create a free account to keep your timeline updated and improve the shared dashboard.
          </p>

          <div className="mt-8 space-y-4 text-left">
            <Benefit icon={TimerReset} text="Estimate when your case may reach the next stage." />
            <Benefit icon={DatabaseZap} text="Add anonymized data to improve public statistics." />
          </div>
        </section>

        <section className="mx-auto w-full max-w-md lg:justify-self-end">
          <AuthForm initialError={initialError} />
          <Link href="/" className="mt-5 block text-center text-sm font-semibold text-primary hover:underline">
            Back to public dashboard
          </Link>
        </section>
      </div>
    </main>
  );
}

function Benefit({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-base leading-7 text-foreground">{text}</p>
    </div>
  );
}
