import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  if (process.env.DISABLE_AUTH_PROXY === "1") {
    return NextResponse.next({ request });
  }

  const { createServerClient } = await import("@supabase/ssr");
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  await Promise.race([
    supabase.auth.getUser(),
    new Promise((resolve) => setTimeout(resolve, 2_500)),
  ]);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
