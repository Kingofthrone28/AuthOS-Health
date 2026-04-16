// Base API client for server-side fetches from the BFF.
// All lib/ helpers call this — never call the API directly from containers.

const API_BASE = process.env["API_URL"] ?? "http://localhost:3001";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { tenantId: string; accessToken?: string }
): Promise<T> {
  const { tenantId, accessToken, ...fetchOptions } = options ?? { tenantId: "" };

  const authHeader = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
      ...authHeader,
      ...fetchOptions.headers,
    },
    cache: "no-store", // dashboard data is always fresh
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}
