import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, FilePlus2, LayoutDashboard, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AccountSetupCardProps = {
  displayName?: string | null;
  email?: string | null;
};

const options: Array<{
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
}> = [
  {
    title: "Add application",
    description: "Create a new private application record so you can track your own timeline and estimates.",
    href: "/app/application",
    cta: "Add my application",
    icon: FilePlus2,
  },
  {
    title: "Claim existing case",
    description: "Match a case you entered in the legacy spreadsheet so it stays linked to your account.",
    href: "/app/claim",
    cta: "Claim a case",
    icon: Search,
  },
  {
    title: "Continue to dashboard",
    description: "Already set up your data? Go straight to your dashboard and manage it later.",
    href: "/app",
    cta: "Open dashboard",
    icon: LayoutDashboard,
  },
];

export function AccountSetupCard({ displayName, email }: AccountSetupCardProps) {
  const label = displayName?.trim() || email?.trim() || "there";

  return (
    <Card>
      <CardHeader className="border-b border-border bg-surface-elevated/70 pb-5">
        <CardTitle>Welcome, {label}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Choose the best next step for your account. If you already have an application on file, you can claim it or skip ahead to the dashboard.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
        {options.map(({ title, description, href, cta, icon: Icon }) => (
          <article key={href} className="flex h-full flex-col rounded-lg border border-border bg-background/80 p-4">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
            <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-4 w-full justify-between")}>
              {cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
