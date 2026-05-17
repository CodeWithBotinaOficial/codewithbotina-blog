import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler as pinHandler } from "../../../routes/api/posts/[slug]/pin.ts";
import { handler as bulkPinHandler } from "../../../routes/api/posts/bulk-pin.ts";
import { supabase } from "../../../lib/supabase.ts";
import { AuthService } from "../../../services/auth.service.ts";
import type { AuthenticatedUser } from "../../../types/auth.types.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockCtx = (
  slug: string,
): FreshContext => ({ params: { slug } } as unknown as FreshContext);

const adminUser = (): AuthenticatedUser => ({
  id: "admin",
  email: "admin@example.com",
  full_name: null,
  avatar_url: null,
  google_id: null,
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
  is_admin: true,
});

Deno.test("Integration: POST /api/posts/:slug/pin toggles pin status", async () => {
  stub(
    AuthService.prototype,
    "getUserFromToken",
    () => Promise.resolve(adminUser()),
  );

  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const fetchBuilder = {
    eq: () => fetchBuilder,
    maybeSingle: () =>
      Promise.resolve({
        data: { id: "post-1", is_pinned: false },
        error: null,
      }),
  };
  const updateBuilder = {
    eq: () => updateBuilder,
    select: () => updateBuilder,
    single: () =>
      Promise.resolve({
        data: { id: "post-1", slug: "hello", language: "es", is_pinned: true },
        error: null,
      }),
  };

  stub(supabaseAny, "from", () => ({
    select: () => fetchBuilder,
    update: () => updateBuilder,
  }));

  const req = new Request("http://localhost/api/posts/hello/pin?language=es", {
    method: "POST",
    headers: {
      Origin: "http://localhost:8000",
      Authorization: "Bearer test-token",
    },
  });

  const res = await pinHandler.POST!(req, mockCtx("hello"));
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.is_pinned, true);

  restore();
});

Deno.test("Integration: POST /api/posts/bulk-pin updates multiple posts", async () => {
  stub(
    AuthService.prototype,
    "getUserFromToken",
    () => Promise.resolve(adminUser()),
  );

  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const updateBuilder = {
    in: () => updateBuilder,
    select: () =>
      Promise.resolve({
        data: [
          { id: "post-1", slug: "a", language: "es", is_pinned: true },
          { id: "post-2", slug: "b", language: "en", is_pinned: true },
        ],
        error: null,
      }),
  };

  stub(supabaseAny, "from", () => ({
    update: () => updateBuilder,
  }));

  const req = new Request("http://localhost/api/posts/bulk-pin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:8000",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify({ post_ids: ["post-1", "post-2"], is_pinned: true }),
  });

  const res = await bulkPinHandler.POST!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.updated_count, 2);

  restore();
});
