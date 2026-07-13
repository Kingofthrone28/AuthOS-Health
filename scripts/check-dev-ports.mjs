import { execFileSync } from "node:child_process";
import net from "node:net";

const SERVICES = [
  { name: "apps/web", port: 3000 },
  { name: "apps/api", port: 3001 },
  { name: "apps/worker-voice", port: 3002 },
  { name: "apps/worker-workflow", port: 3003 },
  { name: "apps/mock-crd", port: 3004 },
  { name: "apps/mock-fhir", port: 3005 },
  { name: "apps/mock-payer", port: 3006 },
];

async function checkPort({ name, port }) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (error) => {
      resolve({
        name,
        port,
        available: false,
        code: error.code ?? "UNKNOWN",
        owner: findPortOwner(port),
      });
    });

    server.once("listening", () => {
      server.close(() => {
        resolve({ name, port, available: true });
      });
    });

    server.listen(port);
  });
}

function findPortOwner(port) {
  try {
    return execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split("\n")
      .slice(1)
      .join("\n");
  } catch {
    return "";
  }
}

const results = await Promise.all(SERVICES.map(checkPort));
const blocked = results.filter((result) => !result.available);

if (blocked.length > 0) {
  console.error("Cannot start dev services because these ports are already in use:");
  console.error("");

  for (const result of blocked) {
    console.error(`- ${result.name}: port ${result.port} (${result.code})`);
    if (result.owner) {
      for (const line of result.owner.split("\n")) {
        console.error(`  ${line}`);
      }
    }
  }

  console.error("");
  console.error("Stop the listed process(es), or run one workspace at a time with npm run dev -w <workspace>.");
  process.exit(1);
}

console.log("Dev ports 3000-3006 are available.");
