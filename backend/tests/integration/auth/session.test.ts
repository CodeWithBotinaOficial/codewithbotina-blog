import { assertEquals, assertMatch, assertStringIncludes } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/auth/callback.ts";
import { handler as refreshHandler } from "../../../routes/api/auth/refresh.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";

Deno.test("Integration: GET /api/auth/callback sets cookies and redirects", async () => {
  const _stub = stub(
    AuthService.prototype,
    "exchangeCodeForSession",
    () =>
      Promise.resolve({
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          token_type: "bearer",
        },
        userId: "user-id",
      }),
  );

  const req = new Request(
    "https://api.codewithbotina.com/api/auth/callback?code=abc",
    { method: "GET", headers: { Cookie: "cwb_pkce=verifier" } },
  );

  const res = await handler.GET!(req, {} as never);

  assertEquals(res.status, 302);
  assertStringIncludes(res.headers.get("Location") || "", "auth/success");
  const setCookie = res.headers.get("set-cookie") || "";
  assertMatch(setCookie, /(cwb_access|cwb_refresh)=/);

  restore();
});

Deno.test("Integration: POST /api/auth/refresh returns new tokens", async () => {
  const _stub = stub(
    AuthService.prototype,
    "refreshAccessToken",
    () =>
      Promise.resolve({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
        token_type: "bearer",
      }),
  );

  const req = new Request("https://api.codewithbotina.com/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: "old-refresh" }),
  });

  const res = await refreshHandler.POST!(req, {} as never);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.access_token, "new-access");

  restore();
});
