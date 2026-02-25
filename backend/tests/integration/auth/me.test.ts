import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/auth/me.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { AppError } from "../../../utils/errors.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";

Deno.test("Integration: GET /api/auth/me returns user profile", async () => {
  const _stub = stub(
    AuthService.prototype,
    "getUserFromToken",
    () =>
      Promise.resolve({
        id: "user-id",
        email: "diego@example.com",
        full_name: "Diego",
        avatar_url: "https://example.com/avatar.png",
        google_id: "google-123",
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        is_admin: false,
      }),
  );

  const req = new Request("https://api.codewithbotina.com/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: "Bearer token",
      Origin: "https://blog.codewithbotina.com",
    },
  });

  const res = await handler.GET!(req, {} as never);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.user.email, "diego@example.com");

  restore();
});

Deno.test("Integration: GET /api/auth/me without token returns 401", async () => {
  const _stub = stub(
    AuthService.prototype,
    "getUserFromToken",
    () => {
      throw new AppError("Unauthorized", 401);
    },
  );

  const req = new Request("https://api.codewithbotina.com/api/auth/me", {
    method: "GET",
  });

  const res = await handler.GET!(req, {} as never);
  const body = await res.json();

  assertEquals(res.status, 401);
  assertEquals(body.success, false);

  restore();
});
