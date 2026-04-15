import {
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/auth/signout.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";

Deno.test("Integration: POST /api/auth/signout clears cookies", async () => {
  const _stub = stub(
    AuthService.prototype,
    "signOut",
    () => Promise.resolve(),
  );

  const req = new Request("https://api.codewithbotina.com/api/auth/signout", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      Origin: "https://blog.codewithbotina.com",
    },
  });

  const res = await handler.POST!(req, {} as never);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  const setCookie = res.headers.get("set-cookie") || "";
  assertMatch(setCookie, /(cwb_access|cwb_refresh)=/);

  restore();
});

Deno.test("Integration: POST /api/auth/signout without token returns 401", async () => {
  const req = new Request("https://api.codewithbotina.com/api/auth/signout", {
    method: "POST",
  });

  const res = await handler.POST!(req, {} as never);
  const body = await res.json();

  assertEquals(res.status, 401);
  assertEquals(body.success, false);
});
