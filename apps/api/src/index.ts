import express from "express";
import cors from "cors";
import { casesRouter } from "./routes/cases.js";
import { requirementsRouter } from "./routes/requirements.js";
import { submissionsRouter } from "./routes/submissions.js";
import { voiceRouter } from "./routes/voice.js";
import { tasksRouter } from "./routes/tasks.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { analyticsRouter } from "./routes/analytics.js";
import { documentsRouter } from "./routes/documents.js";
import { smartRouter } from "./routes/smart.js";
import { authRouter } from "./routes/auth.js";
import { tenantsRouter } from "./routes/tenants.js";
import { auditRouter } from "./routes/audit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { tenantAuth } from "./middleware/tenantAuth.js";
import { getPrismaClient } from "./lib/prisma.js";

const app = express();

const ALLOWED_ORIGINS = (process.env["CORS_ORIGINS"] ?? "http://localhost:3000").split(",");

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
// Raw body parser for binary file uploads (application/octet-stream)
app.use(express.raw({ type: "application/octet-stream", limit: "30mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (_req, res) => {
  try {
    const db = getPrismaClient();
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});

// Public auth routes — no tenant auth required
app.use("/auth", authRouter);

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
app.use("/api/tenants", tenantsRouter);
app.use("/api/audit", auditRouter);

app.use(errorHandler);

const PORT = process.env["PORT"] ?? 3001;
app.listen(PORT, () => {
  console.log(`api listening on port ${PORT}`);
});

export { app };
