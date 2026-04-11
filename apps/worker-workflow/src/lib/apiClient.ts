const API_URL = () => process.env["API_URL"] ?? "http://localhost:3001";

export async function apiPost(
  path: string,
  tenantId: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${API_URL()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
    },
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
    headers: { "x-tenant-id": tenantId },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} returned ${res.status}: ${text}`);
  }

  return res.json();
}
