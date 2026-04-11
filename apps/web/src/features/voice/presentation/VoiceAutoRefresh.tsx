"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 15_000; // re-fetch server data every 15 s

/**
 * Invisible client component that triggers a server re-render on an interval.
 * Sits alongside the server-rendered VoicePage — no state or UI of its own.
 * "Real-time" here means post-completion polling, not a streaming connection.
 * A WebSocket/SSE upgrade is deferred to a future phase.
 */
export function VoiceAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
