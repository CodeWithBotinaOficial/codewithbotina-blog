/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";
import { load } from "https://deno.land/std@0.216.0/dotenv/mod.ts";

// Load environment variables only in local development
if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
  try {
    await load({ export: true });
  } catch (error) {
    // Ignore MissingEnvVarsError
    if (
      !(error instanceof Error) ||
      !error.message.includes("MissingEnvVarsError")
    ) {
      console.warn("Warning: Failed to load .env file:", error);
    }
  }
}

await start(manifest, config);
