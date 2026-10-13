/** Web sign-in (Apple JS + session cookie). Off by default: the website is read-only. */
export function webSignInEnabled(): boolean {
  return process.env.WEB_SIGN_IN_ENABLED === "true";
}

/** `/auth/dev` exists only on a local dev server that opts in. Never in production. */
export function devAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_AUTH === "true";
}

/** Origins allowed by CORS, from the comma-separated WEB_ORIGIN (plus localhost in development). */
export function corsOrigins(): (string | RegExp)[] {
  const list: (string | RegExp)[] = (process.env.WEB_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (process.env.NODE_ENV === "development") list.push(/^http:\/\/localhost(:\d+)?$/);
  return list;
}
