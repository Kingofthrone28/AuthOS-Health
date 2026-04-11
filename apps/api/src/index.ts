import express from "express";
import { casesRouter } from "./routes/cases.js";
import { requirementsRouter } from "./routes/requirements.js";
import { submissionsRouter } from "./routes/submissions.js";
import { voiceRouter } from "./routes/voice.js";
import { tasksRouter } from "./routes/tasks.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { analyticsRouter } from "./routes/analytics.js";
import { documentsRouter } from "./routes/documents.js";
import { smartRouter } from "./routes/smart.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { tenantAuth } from "./middleware/tenantAuth.js";

const app = express();

app.use(express.json());

// Health check — no auth required
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// SMART launch — no tenant auth (EHR redirects here before session exists)
app.use("/smart", smartRouter);

// All API routes require tenant-aware auth
app.use("/api", tenantAuth);
app.use("/api/cases", casesRouter);
app.use("/api/cases", requirementsRouter);
app.use("/api/cases", submissionsRouter);
app.use("/api/cases", attachmentsRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/documents", documentsRouter);

app.use(errorHandler);

const PORT = process.env["PORT"] ?? 3001;
app.listen(PORT, () => {
  console.log(`api listening on port ${PORT}`);
});

export { app };
