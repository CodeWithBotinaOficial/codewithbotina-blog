import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/auth/google.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = (hostname: string) =>
  ({
    remoteAddr: { transport: "tcp", hostname, port: 8000 },
  }) as FreshContext;

Deno.test("Integration: GET /api/auth/google redirects to Google OAuth", async () => {
  const _stub = stub(
    AuthService.prototype,
    "getGoogleAuthUrl",
    () => Promise.resolve("https://accounts.google.com/o/oauth2/v2/auth"),
  );

  const req = new Request("https://api.codewithbotina.com/api/auth/google", {
    method: "GET",
    headers: { Origin: "https://blog.codewithbotina.com" },
  });

  const res = await handler.GET!(req, mockContext("127.0.0.2"));

  assertEquals(res.status, 302);
  assertEquals(
    res.headers.get("Location"),
    "https://accounts.google.com/o/oauth2/v2/auth",
  );

  restore();
});

Deno.test("Integration: GET /api/auth/google rate limit returns 429", async () => {
  const req = new Request("https://api.codewithbotina.com/api/auth/google", {
    method: "GET",
    headers: { Origin: "https://blog.codewithbotina.com" },
  });

  const ctx = mockContext("127.0.0.3");
  for (let i = 0; i < 6; i++) {
    await handler.GET!(req, ctx);
  }

  const res = await handler.GET!(req, ctx);
  const body = await res.json();

  assertEquals(res.status, 429);
  assertStringIncludes(body.error, "Too many requests");
});
