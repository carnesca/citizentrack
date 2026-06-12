import Link from "next/link";
import { Code2, Coffee, FileJson, FileSpreadsheet } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-4 border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[116rem] flex-col gap-5 px-4 py-7 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="max-w-3xl">
            <h2 className="text-sm font-semibold text-foreground">About CitizenTrack</h2>
            <p className="mt-2 leading-6">
              CitizenTrack is an open-source project for tracking German citizenship application timelines,
              sharing anonymized aggregate statistics, and making processing trends easier to understand.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              href={siteConfig.publicDataJsonUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open latest CitizenTrack public JSON export"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <FileJson className="h-4 w-4" />
              JSON
            </Link>
            <Link
              href={siteConfig.publicDataXlsxUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open latest CitizenTrack public Excel export"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <FileSpreadsheet className="h-4 w-4" />
              XLSX
            </Link>
            <Link
              href={siteConfig.githubUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open CitizenTrack on GitHub"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Code2 className="h-4 w-4" />
              GitHub
            </Link>
            <Link
              href={siteConfig.buyMeCoffeeUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Support CitizenTrack on Buy Me a Coffee"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-primary/30 bg-primary px-3 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Coffee className="h-4 w-4" />
              Buy Me a Coffee
            </Link>
          </div>
        </div>
        <p className="border-t border-border pt-4 text-xs leading-5">
          Community data is anonymized in public statistics and weekly public exports. Estimates are informational and not official government timelines.
        </p>
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
