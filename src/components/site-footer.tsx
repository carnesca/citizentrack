import Link from "next/link";
import { Code2, FileJson, TableProperties } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background/95">
      <div className="mx-auto flex w-full max-w-[116rem] flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold text-foreground">About CitizenTrack</h2>
            <p className="mt-2 leading-6">
              CitizenTrack is an open-source project for tracking German citizenship application timelines,
              sharing anonymized aggregate statistics, and making processing trends easier to understand.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              href={siteConfig.publicDataCsvUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open latest CitizenTrack public CSV export"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <TableProperties className="h-4 w-4" />
              CSV
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
          </div>
        </div>
        <p className="text-xs">
          Community data is anonymized in public statistics and weekly public exports. Estimates are informational and not official government timelines.
        </p>
      </div>
    </footer>
  );
}
