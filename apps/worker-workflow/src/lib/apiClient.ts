const API_URL = () => process.env["API_URL"] ?? "http://localhost:3001";

function internalHeaders(tenantId: string): Record<string, string> {
  const internalSecret = process.env["INTERNAL_SECRET"];
  if (!internalSecret) throw new Error("INTERNAL_SECRET must be configured for workflow API calls");
  return {
    "Content-Type": "application/json",
    "x-internal-secret": internalSecret,
    "x-tenant-id": tenantId,
  };
}

export async function apiPost(
  path: string,
  tenantId: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${API_URL()}${path}`, {
    method: "POST",
    headers: internalHeaders(tenantId),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} returned ${res.status}: ${text}`);
  }

  return res.json();
}

export async function apiGet(
  path: string,
  tenantId: string
): Promise<unknown> {
  const res = await fetch(`${API_URL()}${path}`, {
    headers: internalHeaders(tenantId),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} returned ${res.status}: ${text}`);
  }

  return res.json();
}
