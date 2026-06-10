"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 5_000;
const REFRESH_DEBOUNCE_MS = 250;

/**
 * Invisible client component that keeps the server-rendered Voice page fresh.
 * Prefers the live SSE stream and falls back to interval refresh if needed.
 */
export function VoiceAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let closed = false;
    let refreshTimer: number | null = null;
    let pollId: number | null = null;
    let stream: EventSource | null = null;

    const scheduleRefresh = () => {
      if (closed || refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const startPolling = () => {
      if (pollId !== null) return;
      pollId = window.setInterval(() => {
        router.refresh();
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollId === null) return;
      window.clearInterval(pollId);
      pollId = null;
    };

    try {
      stream = new EventSource("/api/voice/stream");
      stream.onmessage = () => {
        stopPolling();
        scheduleRefresh();
      };
      stream.onerror = () => {
        stream?.close();
        stream = null;
        startPolling();
      };
    } catch {
      startPolling();
    }

    startPolling();

    return () => {
      closed = true;
      stream?.close();
      stopPolling();
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    };
  }, [router]);

  return null;
}
