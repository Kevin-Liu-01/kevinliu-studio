// How the deployed checks ask a deployment for a page. A protected preview needs VERCEL_AUTOMATION_BYPASS_SECRET, or
// VERCEL_OIDC_TOKEN from `vercel project token kevinliu-studio` (short-lived, nothing to store); production needs neither.
export function bypassHeaders(env = process.env) {
  return env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET }
    : env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': env.VERCEL_OIDC_TOKEN } : {};
}

// One request, redirects not followed. The bypass headers go only to `base`'s own origin.
export function get(base, url, headers = {}, init = {}) {
  const ours = new URL(url).origin === new URL(base).origin;
  return fetch(url, { ...init, headers: { ...(ours ? bypassHeaders() : {}), ...headers }, redirect: 'manual' });
}

// Follows redirects by hand (five at most), so a redirect that leaves `base` never carries the bypass headers with it.
export async function follow(base, url, headers = {}, init = {}) {
  let r;
  for (let hop = 0; hop < 6; hop++) {
    r = await get(base, url, headers, init);
    const to = r.status >= 300 && r.status < 400 ? r.headers.get('location') : null;
    if (!to) return { r, url };
    await r.body?.cancel();
    url = new URL(to, url).href;
  }
  return { r, url };
}
