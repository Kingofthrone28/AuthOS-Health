import { config } from "dotenv";
import { resolve } from "path";

// Load local env first, then fall back to the example file for CI.
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.example"), override: false });

/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testPathIgnorePatterns: ["/dist/"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
  },
  testTimeout: 30000,
};
