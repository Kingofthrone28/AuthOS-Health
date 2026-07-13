import { requireSession } from "@/lib/session";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();

  const upstream = await fetch(`${API_URL}/api/voice/stream`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Could not connect to the voice event stream.", {
      status:  upstream.status || 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
