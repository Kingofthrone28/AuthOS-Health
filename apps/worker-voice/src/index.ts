import http from "http";
import express from "express";
import { transcriptRouter } from "./routes/transcript.js";
import { extractionRouter } from "./routes/extraction.js";
import { twimlRouter }      from "./routes/twiml.js";
import { twilioMediaWss }   from "./routes/twilioMedia.js";
import { errorHandler }     from "./middleware/errorHandler.js";

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

// HTTP routes
app.use("/voice/webhooks", transcriptRouter);
app.use("/voice/webhooks", extractionRouter);
app.use("/voice",          twimlRouter);      // GET /voice/twiml

app.use(errorHandler);

// Wrap Express in an http.Server so we can handle the WebSocket upgrade
// for Twilio Media Streams alongside the existing HTTP API.
const server = http.createServer(app);

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/voice/twilio-media")) {
    twilioMediaWss.handleUpgrade(req, socket as never, head, (ws) => {
      twilioMediaWss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

const PORT = process.env["PORT"] ?? 3002;
server.listen(PORT, () => {
  console.log(`worker-voice listening on port ${PORT}`);
  console.log(`  HTTP: POST /voice/webhooks/transcript`);
  console.log(`  HTTP: GET  /voice/twiml`);
  console.log(`  WS:   wss://<host>/voice/twilio-media`);
});

export { app };
