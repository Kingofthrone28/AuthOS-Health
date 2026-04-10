import express from "express";
import { transcriptRouter } from "./routes/transcript.js";
import { extractionRouter } from "./routes/extraction.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/voice/webhooks", transcriptRouter);
app.use("/voice/webhooks", extractionRouter);

app.use(errorHandler);

const PORT = process.env["PORT"] ?? 3002;
app.listen(PORT, () => {
  console.log(`worker-voice listening on port ${PORT}`);
});

export { app };
