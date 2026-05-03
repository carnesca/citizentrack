"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setLoading(false);
      setError("Use at least 8 characters for your password.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setLoading(false);
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

      setLoading(false);
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

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/app");
    router.refresh();
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

        <form className="space-y-4" onSubmit={submit}>
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
            {loading ? "Working..." : isSignUp ? "Create account" : "Log In"}
          </Button>

          {message ? <Alert className="border-success/30 text-success">{message}</Alert> : null}
          {error || initialError ? <Alert className="border-danger/30 text-danger">{error ?? initialError}</Alert> : null}
        </form>
      </CardContent>
    </Card>
  );
}
