import express from "express";
import { createWorkflowRuntime } from "./lib/queues.js";

const app = express();
app.use(express.json());
const workflowRuntime = createWorkflowRuntime();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (_req, res) => {
  try {
    const { getPrismaClient } = await import("./lib/prisma.js");
    const db = getPrismaClient();
    await db.$queryRaw`SELECT 1`;
    if (!workflowRuntime.isReady()) {
      res.status(503).json({ status: "not ready" });
      return;
    }
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});

const PORT = process.env["PORT"] ?? 3003;
app.listen(PORT, () => {
  console.log(`worker-workflow listening on port ${PORT}`);
});

void workflowRuntime.start().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "UnknownError";
  console.error(JSON.stringify({ event: "workflow.runtime_failed", name }));
});

export { app };
