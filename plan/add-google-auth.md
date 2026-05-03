# Plan: Add Google Auth

- Request: Add Google auth for login and account setup for this app.
- Plan File: `plan/add-google-auth.md`
- Status: active
- Status Legend: `[ ]` not started, `[-]` in progress, `[x]` done, `[!]` blocked

## Goal
Add Supabase Google OAuth alongside existing email/password auth, route successful OAuth sessions through the existing server callback, and provide a first-run account setup path that helps users add or claim a citizenship application.

## Architecture Decisions
- Use Supabase Auth Google OAuth; do not add NextAuth or another auth system.
- Reuse `src/app/auth/confirm/route.ts` for OAuth code exchange, but sanitize `next` so redirects stay same-origin/relative.
- Keep email/password auth working unchanged and add Google as an additional option in `AuthForm`.
- Implement account setup as protected App Router pages under `/app`, using existing add-application and claim-case flows instead of adding profile tables unless product scope expands.

## Task Checklist

### [x] T01 - Document Supabase Google OAuth setup
- Depends on: none
- Parallelizable: yes
- Files:
  - `README.md`
  - `.env.example`
- Validation:
  - [x] `README.md` documents Supabase Google provider setup, Google OAuth credentials, and redirect URLs for localhost/prod.
  - [x] `.env.example` still lists all app-required variables and explains `NEXT_PUBLIC_APP_URL` redirect usage if comments are added.
- Notes:
  - Supabase dashboard config is required outside code: enable Google provider and allow `${NEXT_PUBLIC_APP_URL}/auth/confirm` plus localhost callback.
  - Progress: added Google Cloud + Supabase setup steps, Supabase OAuth callback URI, app localhost/production redirect allow-list URLs, and a deploy checklist for `NEXT_PUBLIC_APP_URL`.

### [x] T02 - Harden auth callback redirect handling
- Depends on: none
- Parallelizable: yes
- Files:
  - `src/app/auth/confirm/route.ts`
  - `src/lib/auth/redirect.ts`
- Validation:
  - [x] `npm run lint`
  - [x] `npm run build`
  - [x] Manual artifact (code-verified): `/auth/confirm?next=https://example.com` now sanitizes to `/app` via `getSafeRedirectPath`; live OAuth callback execution is still pending configured provider credentials.
- Notes:
  - Preserve current `code` exchange and `token_hash` OTP support.
  - Follow existing Next 16 App Router patterns: async route handler, `NextRequest`, `NextResponse.redirect`.
  - Progress: added `src/lib/auth/redirect.ts` and limited callback redirects to same-origin/relative destinations.

### [x] T03 - Add Google auth controls to login/signup form
- Depends on: `T02`
- Parallelizable: no
- Files:
  - `src/components/auth-form.tsx`
  - `src/app/login/page.tsx`
- Validation:
  - [x] `npm run lint`
  - [x] `npm run build`
  - [x] Manual artifact (code-verified): the Google button calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })`, preserves password login, and reports OAuth setup errors; a live provider redirect was not exercised in this checkout.
- Notes:
  - Use current browser Supabase client.
  - Keep mode toggle; Google from sign-in can return to `/app`, Google from sign-up can return to setup route.
  - Add clear separator/copy so users understand Google and email/password are alternatives.
  - Progress: added a Google CTA, callback URL generation, and updated login copy/error text.

### [x] T04 - Build protected account setup page
- Depends on: none
- Parallelizable: yes
- Files:
  - `src/app/app/setup/page.tsx`
  - `src/components/account-setup-card.tsx`
- Validation:
  - [x] `npm run lint`
  - [x] `npm run build`
  - [x] Manual artifact (build/code-verified): `/app/setup` now renders Add application, Claim a case, and Continue to dashboard actions behind the authenticated `/app` layout; no interactive authenticated browser session was available here.
- Notes:
  - Page is covered by `src/app/app/layout.tsx` auth guard.
  - Use existing routes `/app/application`, `/app/claim`, and `/app` rather than duplicating form logic.
  - Optionally personalize copy from `user.user_metadata.full_name` or email returned by Google.
  - Progress: added a protected setup page plus reusable account setup card with direct links into existing flows.

### [x] T05 - Wire post-auth account setup routing
- Depends on: `T03, T04`
- Parallelizable: no
- Files:
  - `src/components/auth-form.tsx`
  - `src/app/auth/confirm/route.ts`
  - `src/app/app/setup/page.tsx`
- Validation:
  - [x] `npm run lint`
  - [x] `npm run build`
  - [x] Manual artifact (code-verified): Google sign-up now requests `/app/setup`, Google sign-in requests `/app`, and invalid/expired callbacks still redirect to `/login?error=invalid-link`; end-to-end OAuth remains pending provider credentials.
- Notes:
  - Supabase OAuth may not reveal new-vs-existing before callback; use requested form mode to choose `next`, and keep setup page safe for existing accounts.
  - Progress: the Google CTA now chooses the post-auth destination by form mode, while the shared callback keeps invalid links on the login error state.

### [!] T06 - Final auth flow validation and deploy notes
- Depends on: `T01, T02, T03, T04, T05`
- Parallelizable: no
- Files:
  - `README.md`
  - `src/components/auth-form.tsx`
  - `src/app/auth/confirm/route.ts`
  - `src/app/app/setup/page.tsx`
- Validation:
  - [x] `npm run lint`
  - [x] `npm run build`
  - [!] Manual artifact: local Google OAuth with `http://localhost:3000/auth/confirm` is blocked until Google Cloud + Supabase provider credentials and redirect allow-lists are configured for this checkout.
  - [x] Manual artifact: production Supabase redirect URL, Google Cloud Supabase OAuth callback URI, and Netlify environment values are listed before deploy.
- Notes:
  - No automated test script exists in `package.json`; use lint/build plus manual OAuth checks.
  - Progress: deploy notes are documented, but live OAuth validation still requires external provider setup.

## Risks
- Google OAuth cannot work until Supabase provider credentials and allowed redirect URLs are configured in Supabase and Google Cloud.
- OAuth account-linking behavior depends on Supabase settings when a Google email matches an existing password account.
- The bundled Next.js 16 package docs in this checkout are minimal, so implementation relied on the installed App Router overview/glossary plus successful lint/build validation.

## Coordination Notes
- Group tasks that do not share file ownership into parallel worker batches.
- No project or user subagent definitions were present in `.pi/agents` or `~/.pi/agent/agents`, so safe worker delegation was unavailable and execution stayed in-process.
- The executor should materialize this plan before implementation work begins.
- Do not mark a task done until its validation items have passed or an explicit rationale is recorded.
- Update the checklist in place as work progresses.
