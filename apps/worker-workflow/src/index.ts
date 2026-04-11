import express from "express";
import { slaProcessor } from "./processors/slaProcessor.js";
import { escalationProcessor } from "./processors/escalationProcessor.js";
import { retryProcessor } from "./processors/retryProcessor.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (_req, res) => {
  try {
    const { getPrismaClient } = await import("./lib/prisma.js");
    const db = getPrismaClient();
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});

// Trigger endpoints — called by a job scheduler or message queue consumer.
// In production, wire these to BullMQ, Temporal, or a cron-based queue.
app.post("/triggers/sla-check", async (_req, res, next) => {
  try {
    const result = await slaProcessor.run();
    res.json({ ran: "sla-check", ...result });
  } catch (err) {
    next(err);
  }
});

app.post("/triggers/escalation", async (_req, res, next) => {
  try {
    const result = await escalationProcessor.run();
    res.json({ ran: "escalation", ...result });
  } catch (err) {
    next(err);
  }
});

app.post("/triggers/retry", async (_req, res, next) => {
  try {
    const result = await retryProcessor.run();
    res.json({ ran: "retry", ...result });
  } catch (err) {
    next(err);
  }
});

const PORT = process.env["PORT"] ?? 3003;
app.listen(PORT, () => {
  console.log(`worker-workflow listening on port ${PORT}`);
});

export { app };
