import express from "express";
import { transcriptRouter } from "./routes/transcript.js";
import { extractionRouter } from "./routes/extraction.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (_req, res) => {
  try {
    const apiUrl = process.env["API_URL"] ?? "http://localhost:3001";
    const apiRes = await fetch(`${apiUrl}/health`);
    if (!apiRes.ok) throw new Error("API unreachable");
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});

app.use("/voice/webhooks", transcriptRouter);
app.use("/voice/webhooks", extractionRouter);

app.use(errorHandler);

const PORT = process.env["PORT"] ?? 3002;
app.listen(PORT, () => {
  console.log(`worker-voice listening on port ${PORT}`);
});

export { app };
