// Base API client for server-side fetches from the BFF.
// All lib/ helpers call this — never call the API directly from containers.

const API_BASE = process.env["API_URL"] ?? "http://localhost:3001";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { tenantId: string; accessToken?: string }
): Promise<T> {
  const { tenantId, accessToken, ...fetchOptions } = options ?? { tenantId: "" };
  void tenantId;
  if (!accessToken) throw new Error("Authenticated API access token is required");

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...fetchOptions.headers,
    },
    cache: "no-store", // dashboard data is always fresh
  });

  if (!res.ok) {
    const errorMessage = await readErrorMessage(res);
    throw new Error(errorMessage ?? `API ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

async function readErrorMessage(res: Response): Promise<string | null> {
  const contentType = res.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const data = await res.json() as { error?: string; message?: string };
      return data.error ?? data.message ?? null;
    }

    const text = await res.text();
    return text.trim() || null;
  } catch {
    return null;
  }
}
