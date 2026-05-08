import { config } from "dotenv";
import { resolve } from "path";

// Load .env so Prisma Client has DATABASE_URL without requiring shell export
config({ path: resolve(process.cwd(), ".env") });

/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
  },
  testTimeout: 30000,
};
