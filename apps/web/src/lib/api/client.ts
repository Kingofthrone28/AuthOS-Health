// Base API client for server-side fetches from the BFF.
// All lib/ helpers call this — never call the API directly from containers.

const API_BASE = process.env["API_URL"] ?? "http://localhost:3001";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { tenantId: string }
): Promise<T> {
  const { tenantId, ...fetchOptions } = options ?? { tenantId: "" };

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
      ...fetchOptions.headers,
    },
    cache: "no-store", // dashboard data is always fresh
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}
