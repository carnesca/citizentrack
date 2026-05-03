import Link from "next/link";
import { HeaderMark } from "@/components/header-mark";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function TopNav() {
  return (
    <header className="safe-area-top sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto w-full max-w-[116rem] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <HeaderMark />
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-lg font-semibold leading-tight text-foreground">CitizenTrack</span>
              <span className="block truncate text-xs text-muted-foreground">Your Path to German Citizenship</span>
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Sign Up
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
