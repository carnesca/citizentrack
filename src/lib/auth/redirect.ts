const DEFAULT_REDIRECT_PATH = "/app";

export function getSafeRedirectPath(
  next: string | null | undefined,
  requestUrl: string | URL,
  fallback = DEFAULT_REDIRECT_PATH,
) {
  if (!next) return fallback;

  try {
    const baseUrl = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
    const redirectUrl = new URL(next, baseUrl);

    if (redirectUrl.origin !== baseUrl.origin) return fallback;
    if (!redirectUrl.pathname.startsWith("/")) return fallback;

    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthConfirmRedirectUrl(appUrl: string, next: string, fallback = DEFAULT_REDIRECT_PATH) {
  const redirectUrl = new URL("/auth/confirm", appUrl);
  redirectUrl.searchParams.set("next", getSafeRedirectPath(next, redirectUrl, fallback));
  return redirectUrl.toString();
}
