import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/cookies/consent.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

Deno.test("Integration: POST /api/cookies/consent requires session_id", async () => {
  const req = new Request("http://localhost/api/cookies/consent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
    },
    body: JSON.stringify({ analytics_cookies: true }),
  });

  const res = await handler.POST!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 400);
  assertEquals(body.success, false);

  restore();
});

Deno.test("Integration: POST /api/cookies/consent stores consent", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const _fromStub = stub(supabaseAny, "from", () => ({
    upsert: () => Promise.resolve({ error: null }),
  }));

  const req = new Request("http://localhost/api/cookies/consent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
    },
    body: JSON.stringify({ session_id: "session-1", analytics_cookies: true }),
  });

  const res = await handler.POST!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  restore();
});
