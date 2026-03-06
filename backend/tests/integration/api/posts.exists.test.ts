import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/[slug]/exists.ts";
import { PostService } from "../../../services/post.service.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  params: { slug: "hello" },
} as unknown as FreshContext;

Deno.test("Integration: GET /api/posts/:slug/exists returns exists=false when unique", async () => {
  const _serviceStub = stub(
    PostService.prototype,
    "isSlugUnique",
    () => Promise.resolve(true),
  );

  const req = new Request("http://localhost/api/posts/hello/exists?language=es", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.exists, false);

  restore();
});
