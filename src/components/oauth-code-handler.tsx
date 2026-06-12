"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/browser";

type OAuthCodeHandlerProps = {
  code: string | null;
  fallbackNext: string;
};

const NEXT_STORAGE_KEY = "citizentrack.oauth.next";

export function OAuthCodeHandler({ code, fallbackNext }: OAuthCodeHandlerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function exchangeCode() {
      if (!code) {
        router.replace("/login?error=invalid-link");
        return;
      }

      const storedNext = window.sessionStorage.getItem(NEXT_STORAGE_KEY);
      const next = getSafeRedirectPath(storedNext ?? fallbackNext, window.location.href, "/app/setup");
      window.sessionStorage.removeItem(NEXT_STORAGE_KEY);

      const supabase = createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!active) return;

      if (exchangeError) {
        setError("That Google sign-in attempt expired. Start again from the login page.");
        window.history.replaceState(null, "", "/login?error=invalid-link");
        return;
      }

      router.replace(next);
      router.refresh();
    }

    exchangeCode();

    return () => {
      active = false;
    };
  }, [code, fallbackNext, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Finishing sign-in</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert className="border-danger/30 text-danger">{error}</Alert>
          ) : (
            <p className="text-sm text-muted-foreground">Connecting your Google account...</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export function rememberOAuthNext(next: string) {
  window.sessionStorage.setItem(NEXT_STORAGE_KEY, next);
}
