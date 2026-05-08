import { renderToStaticMarkup } from "react-dom/server";
import { TranscriptFeed } from "../TranscriptFeed";
import type { TranscriptRowViewModel } from "../../types";

describe("TranscriptFeed", () => {
  it("shows the empty transcript message", () => {
    const html = renderToStaticMarkup(<TranscriptFeed transcripts={[]} />);

    expect(html).toContain("No transcripts yet.");
    expect(html).toContain("Transcripts appear here after the voice worker posts a completed call.");
  });

  it("renders seeded completed and active transcript rows", () => {
    const transcripts: TranscriptRowViewModel[] = [
      {
        id: "transcript-completed",
        caseId: "case-123456789",
        callSid: "CA_COMPLETED_001",
        direction: "inbound",
        status: "COMPLETED",
        startedAt: "Apr 17, 9:12 AM",
        duration: "2m 10s",
        eventCount: 2,
        pendingReviewCount: 1,
        hasText: true,
      },
      {
        id: "transcript-active",
        caseId: null,
        callSid: "CA_ACTIVE_002",
        direction: "outbound",
        status: "IN_PROGRESS",
        startedAt: "Apr 17, 9:20 AM",
        duration: "-",
        eventCount: 0,
        pendingReviewCount: 0,
        hasText: false,
      },
    ];

    const html = renderToStaticMarkup(<TranscriptFeed transcripts={transcripts} />);

    expect(html).toContain("2 total");
    expect(html).toContain("CA_COMPLETED_001");
    expect(html).toContain("Case case-123");
    expect(html).toContain("inbound");
    expect(html).toContain("2m 10s");
    expect(html).toContain("1 pending");
    expect(html).toContain("CA_ACTIVE_002");
    expect(html).toContain("Unlinked");
    expect(html).toContain("Active");
    expect(html).toContain("in progress");
  });
});
