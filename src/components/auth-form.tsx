"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Lock, Mail, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { rememberOAuthNext } from "@/components/oauth-code-handler";
import { createClient } from "@/lib/supabase/browser";

type AuthMode = "sign-in" | "sign-up";
type AuthAction = "credentials" | "google" | null;

export function AuthForm({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingAction, setLoadingAction] = useState<AuthAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";
  const loading = loadingAction !== null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingAction("credentials");
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setLoadingAction(null);
      setError("Use at least 8 characters for your password.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setLoadingAction(null);
      setError("Passwords do not match.");
      return;
    }

    const supabase = createClient();

    if (isSignUp) {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: email.trim().toLowerCase(),
          },
        },
      });

      setLoadingAction(null);
      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.session) {
        router.push("/app");
        router.refresh();
        return;
      }

      setMessage("Account created. If email confirmation is enabled in Supabase, confirm your email once before signing in.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoadingAction(null);
    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  async function continueWithGoogle() {
    setLoadingAction("google");
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const next = isSignUp ? "/app/setup" : "/app";
      rememberOAuthNext(next);
      const redirectTo = new URL("/auth/confirm", getAppUrl()).toString();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (authError) {
        setLoadingAction(null);
        setError(authError.message);
      }
    } catch {
      setLoadingAction(null);
      setError("Google sign-in is unavailable until NEXT_PUBLIC_APP_URL is configured.");
    }
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="border-b border-border bg-surface-elevated/70 pb-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {isSignUp ? <UserRound className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </span>
          <div>
            <CardTitle>{isSignUp ? "Create your account" : "Log In"}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isSignUp ? "Save your case and generate timeline estimates." : "Access your saved applications and estimates."}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="mb-5 grid grid-cols-2 rounded-lg border border-border bg-secondary p-1">
          <Button
            type="button"
            variant={!isSignUp ? "default" : "ghost"}
            size="sm"
            className="h-9"
            onClick={() => {
              setMode("sign-in");
              setError(null);
              setMessage(null);
            }}
          >
            Log In
          </Button>
          <Button
            type="button"
            variant={isSignUp ? "default" : "ghost"}
            size="sm"
            className="h-9"
            onClick={() => {
              setMode("sign-up");
              setError(null);
              setMessage(null);
            }}
          >
            Sign Up
          </Button>
        </div>

        <div className="space-y-4">
          <Button type="button" variant="outline" className="h-11 w-full bg-background" onClick={continueWithGoogle} disabled={loading}>
            {loadingAction === "google" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <GoogleMark />}
            {loadingAction === "google" ? "Redirecting..." : isSignUp ? "Sign up with Google" : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>Or use email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>

        <form className="mt-4 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="pl-10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="At least 8 characters"
                className="pl-10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>

          {isSignUp ? (
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-muted-foreground">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
            </div>
          ) : null}

          <Button className="h-11 w-full" disabled={loading}>
            {loadingAction === "credentials" ? "Working..." : isSignUp ? "Create account" : "Log In"}
          </Button>

          {message ? <Alert className="border-success/30 text-success">{message}</Alert> : null}
          {error || initialError ? <Alert className="border-danger/30 text-danger">{error ?? initialError}</Alert> : null}
        </form>
      </CardContent>
    </Card>
  );
}

function getAppUrl() {
  return window.location.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M21.82 12.23c0-.72-.06-1.25-.2-1.8H12.2v3.56h5.53c-.11.88-.68 2.2-1.93 3.1l-.02.12 2.82 2.14.2.02c1.86-1.68 3.02-4.15 3.02-7.14Z" />
      <path fill="#34A853" d="M12.2 21.91c2.71 0 4.98-.87 6.64-2.37l-3-2.28c-.8.55-1.88.94-3.64.94-2.66 0-4.92-1.72-5.73-4.1l-.12.01-2.93 2.22-.04.11c1.64 3.16 4.98 5.47 8.82 5.47Z" />
      <path fill="#FBBC05" d="M6.47 14.1A5.78 5.78 0 0 1 6.13 12c0-.73.13-1.43.33-2.1l-.01-.14-2.97-2.26-.1.04A9.76 9.76 0 0 0 2.31 12c0 1.58.38 3.08 1.07 4.45l3.09-2.35Z" />
      <path fill="#EA4335" d="M12.2 5.8c2.22 0 3.71.94 4.57 1.72l3.33-3.17C17.17 1.7 14.9.09 12.2.09c-3.84 0-7.18 2.31-8.82 5.45l3.08 2.36c.82-2.38 3.08-4.1 5.74-4.1Z" />
    </svg>
  );
}
