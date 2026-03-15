import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { PostTranslationService } from "../../../services/post-translation.service.ts";
import { handler as translationsHandler } from "../../../routes/api/posts/[slug]/translations/index.ts";
import { handler as unlinkHandler } from "../../../routes/api/posts/[slug]/translations/[linkedPostId].ts";
import { handler as translationHandler } from "../../../routes/api/posts/[slug]/translation/[language].ts";

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

Deno.test("Integration: GET /api/posts/:postId/translations returns translations", async () => {
  const _serviceStub = stub(PostTranslationService.prototype, "getTranslations", () =>
    Promise.resolve({
      success: true,
      data: [
        {
          post_id: "11111111-1111-1111-1111-111111111111",
          language: "es",
          slug: "hola",
          titulo: "Hola",
          fecha: new Date().toISOString(),
          imagen_url: null,
          translation_group_id: "22222222-2222-2222-2222-222222222222",
        },
      ],
    })
  );

  const ctx = { params: { slug: "11111111-1111-1111-1111-111111111111" } } as unknown as FreshContext;
  const req = new Request("http://localhost/api/posts/111/translations", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await translationsHandler.GET!(req, ctx);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.translations.length, 1);

  restore();
});

Deno.test("Integration: POST /api/posts/:postId/translations requires admin and links posts", async () => {
  const _authStub = stub(AuthService.prototype, "getUserFromToken", () => Promise.resolve(adminUser));
  const _serviceStub = stub(PostTranslationService.prototype, "linkTranslations", () =>
    Promise.resolve({
      success: true,
      data: {
        translation_group_id: "22222222-2222-2222-2222-222222222222",
        translations: [],
      },
    })
  );

  const ctx = { params: { slug: "11111111-1111-1111-1111-111111111111" } } as unknown as FreshContext;
  const req = new Request("http://localhost/api/posts/111/translations", {
    method: "POST",
    headers: {
      "Origin": "http://localhost:8000",
      "Content-Type": "application/json",
      "Authorization": "Bearer token",
    },
    body: JSON.stringify({ linked_post_ids: ["33333333-3333-3333-3333-333333333333"] }),
  });

  const res = await translationsHandler.POST!(req, ctx);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.translation_group_id, "22222222-2222-2222-2222-222222222222");

  restore();
});

Deno.test("Integration: DELETE /api/posts/:postId/translations/:linkedPostId requires admin and unlinks", async () => {
  const _authStub = stub(AuthService.prototype, "getUserFromToken", () => Promise.resolve(adminUser));
  const _serviceStub = stub(PostTranslationService.prototype, "unlinkTranslation", () =>
    Promise.resolve({
      success: true,
      data: { translation_group_id: "22222222-2222-2222-2222-222222222222" },
    })
  );

  const ctx = {
    params: {
      slug: "11111111-1111-1111-1111-111111111111",
      linkedPostId: "33333333-3333-3333-3333-333333333333",
    },
  } as unknown as FreshContext;

  const req = new Request("http://localhost/api/posts/111/translations/333", {
    method: "DELETE",
    headers: {
      "Origin": "http://localhost:8000",
      "Authorization": "Bearer token",
    },
  });

  const res = await unlinkHandler.DELETE!(req, ctx);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.translation_group_id, "22222222-2222-2222-2222-222222222222");

  restore();
});

Deno.test("Integration: GET /api/posts/:postId/translation/:language returns 404 when missing", async () => {
  const _serviceStub = stub(PostTranslationService.prototype, "getTranslationForLanguage", () =>
    Promise.resolve({ success: true, data: null })
  );

  const ctx = {
    params: {
      slug: "11111111-1111-1111-1111-111111111111",
      language: "en",
    },
  } as unknown as FreshContext;

  const req = new Request("http://localhost/api/posts/111/translation/en", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await translationHandler.GET!(req, ctx);
  const body = await res.json();

  assertEquals(res.status, 404);
  assertEquals(body.success, false);

  restore();
});

