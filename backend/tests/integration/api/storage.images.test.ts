import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";
import { handler } from "../../../routes/api/storage/images.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { supabase } from "../../../lib/supabase.ts";

const adminUser = {
  id: "admin-id",
  email: "admin@example.com",
  full_name: "Admin",
  avatar_url: null,
  google_id: null,
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
  is_admin: true,
};

Deno.test("Integration: GET /api/storage/images lists images (admin only)", async () => {
  const _authStub = stub(AuthService.prototype, "getUserFromToken", () => Promise.resolve(adminUser));

  const storageAny = (supabase as any).storage;
  const _fromStub = stub(storageAny, "from", (..._args: unknown[]) => ({
    list: () =>
      Promise.resolve({
        data: [
          {
            name: "test-image.webp",
            created_at: "2026-03-15T00:00:00Z",
            updated_at: "2026-03-15T00:00:00Z",
            metadata: { size: 12345, mimetype: "image/webp" },
          },
        ],
        error: null,
      }),
    getPublicUrl: (name: string) => ({ data: { publicUrl: `https://example.com/${name}` } }),
  }));

  const req = new Request("http://localhost/api/storage/images?limit=10", {
    method: "GET",
    headers: {
      "Origin": "http://localhost:8000",
      "Authorization": "Bearer token",
    },
  });

  const res = await handler.GET!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.images.length, 1);
  assertEquals(body.data.images[0].name, "test-image.webp");

  restore();
});
