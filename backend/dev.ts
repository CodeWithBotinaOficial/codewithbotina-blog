#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";
import { load } from "https://deno.land/std@0.216.0/dotenv/mod.ts";

// Load environment variables only in local development
if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
  try {
    await load({ export: true });
  } catch (error) {
    // Ignore MissingEnvVarsError during build/dev if .env is missing
    // This allows the build to proceed even if env vars aren't set up yet
    if (
      !(error instanceof Error) ||
      !error.message.includes("MissingEnvVarsError")
    ) {
      console.warn("Warning: Failed to load .env file:", error);
    }
  }
}

await dev(import.meta.url, "./main.ts", config);
