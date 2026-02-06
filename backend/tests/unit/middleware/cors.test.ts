import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { ALLOWED_ORIGIN, corsHeaders } from "../../../middleware/cors.ts";

Deno.test("corsHeaders allows exact origin match", () => {
  const headers = corsHeaders(ALLOWED_ORIGIN);
  assertEquals(headers.get("Access-Control-Allow-Origin"), ALLOWED_ORIGIN);
  assertEquals(headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
});

Deno.test("corsHeaders allows localhost in development", () => {
  const localhost = "http://localhost:3000";
  const headers = corsHeaders(localhost);
  assertEquals(headers.get("Access-Control-Allow-Origin"), localhost);
});

Deno.test("corsHeaders defaults to ALLOWED_ORIGIN for unknown origins", () => {
  const unknownOrigin = "https://evil.com";
  const headers = corsHeaders(unknownOrigin);
  assertEquals(headers.get("Access-Control-Allow-Origin"), ALLOWED_ORIGIN);
});

Deno.test("corsHeaders handles null origin", () => {
  const headers = corsHeaders(null);
  assertEquals(headers.get("Access-Control-Allow-Origin"), ALLOWED_ORIGIN);
});
