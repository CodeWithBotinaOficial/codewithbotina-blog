#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

// Load environment variables only in local development
if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
  await import("https://deno.land/std@0.216.0/dotenv/load.ts");
}

await dev(import.meta.url, "./main.ts", config);
