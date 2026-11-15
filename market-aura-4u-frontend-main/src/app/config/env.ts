export function normalizeApiBaseUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim().replace(/\/+$/, "");
  // If provided with /api/v1, normalize to /api because client routes are already prefixed with /v1
  if (url.endsWith("/api/v1")) {
    url = url.slice(0, -3);
  } else if (!url.endsWith("/api")) {
    // If provided with bare domain (e.g. https://api.onrender.com), append /api
    url = `${url}/api`;
  }
  return url;
}

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error("VITE_API_BASE_URL or VITE_API_URL is not configured.");
}

const apiUrl = normalizeApiBaseUrl(rawApiUrl);

export const env = {
  apiUrl,
} as const;
