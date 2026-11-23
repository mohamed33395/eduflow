/**
 * Client-side API client. All requests go through the BFF catch-all proxy
 * (`/api/bff/[...path]`), which attaches the httpOnly access-token cookie
 * and performs token refresh. Never calls the Nest API directly from the
 * browser.
 */

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    // Nest puts the specific reason in `message` (often an array of validation
    // errors); `error` is just the HTTP name like "Bad Request".
    const msg =
      (data as { message?: unknown }).message ??
      (data as { error?: unknown }).error;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.join("; ");
  }
  return fallback;
}

/** Fetch through the BFF proxy. `path` starts with `/` (e.g. `/centers`). */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      ...(options.body !== undefined && { "Content-Type": "application/json" }),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(data, `Request failed (${res.status})`), data);
  }
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body }),
  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

/** Build a query string, skipping undefined/empty values. */
export function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}
