import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { supabase } from "../../../lib/supabase.ts";
import { PostTranslationService } from "../../../services/post-translation.service.ts";

Deno.test("PostTranslationService.linkTranslations rejects duplicate languages", async () => {
  const service = new PostTranslationService();
  const postId = "11111111-1111-1111-1111-111111111111";
  const linkedId = "22222222-2222-2222-2222-222222222222";

  const supabaseAny = supabase as unknown as {
    from: (table: string) => unknown;
  };
  const _fromStub = stub(supabaseAny, "from", (table: string) => {
    if (table === "posts") {
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [
                { id: postId, language: "en" },
                { id: linkedId, language: "en" },
              ],
              error: null,
            }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  const result = await service.linkTranslations(postId, [linkedId]);
  assertEquals(result.success, false);
  assertEquals(
    (result.error as unknown as { statusCode?: number })?.statusCode,
    400,
  );

  restore();
});

Deno.test("PostTranslationService.getTranslations rejects invalid postId", async () => {
  const service = new PostTranslationService();
  const result = await service.getTranslations("not-a-uuid");
  assertEquals(result.success, false);
  assertEquals(
    (result.error as unknown as { statusCode?: number })?.statusCode,
    400,
  );
});
