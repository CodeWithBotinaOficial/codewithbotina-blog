import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { pollRepository } from "../../../repositories/poll.repository.ts";
import { supabase } from "../../../lib/supabase.ts";

type PollTestRecord = {
  id: string;
  slug: string;
  title: string;
  language: string;
  type: string;
  translation_group_id: string | null;
};

type PollRepositoryTestDoubles = typeof pollRepository & {
  fetchPollsByIds: (pollIds: string[]) => Promise<Map<string, PollTestRecord>>;
  getPollsInTranslationGroups: (
    translationGroupIds: string[],
  ) => Promise<PollTestRecord[]>;
  getOptionCounts: (pollIds: string[]) => Promise<Map<string, number>>;
  retargetVotesForPolls: (
    pollIds: string[],
    translationGroupId: string,
  ) => Promise<void>;
};

const singleEn = {
  id: "poll-en",
  slug: "poll-en",
  title: "Poll EN",
  language: "en",
  type: "single_choice",
  translation_group_id: null,
};

const singleEs = {
  id: "poll-es",
  slug: "poll-es",
  title: "Poll ES",
  language: "es",
  type: "single_choice",
  translation_group_id: null,
};

const repositoryTestDoubles =
  pollRepository as unknown as PollRepositoryTestDoubles;

Deno.test("Poll translations: rejects polls of different types", async () => {
  stub(
    repositoryTestDoubles,
    "fetchPollsByIds",
    () =>
      Promise.resolve(
        new Map([
          ["poll-en", singleEn],
          [
            "poll-es",
            {
              ...singleEs,
              type: "multiple_choice",
            },
          ],
        ]),
      ),
  );

  try {
    await assertRejects(
      () => pollRepository.linkPollTranslation("poll-en", "poll-es"),
      Error,
      "different types",
    );
  } finally {
    restore();
  }
});

Deno.test("Poll translations: rejects duplicate language in group", async () => {
  stub(
    repositoryTestDoubles,
    "fetchPollsByIds",
    () =>
      Promise.resolve(
        new Map([
          ["poll-en", singleEn],
          ["poll-es", { ...singleEs, language: "en" }],
        ]),
      ),
  );
  stub(
    repositoryTestDoubles,
    "getPollsInTranslationGroups",
    () => Promise.resolve([]),
  );

  try {
    await assertRejects(
      () => pollRepository.linkPollTranslation("poll-en", "poll-es"),
      Error,
      "duplicate language",
    );
  } finally {
    restore();
  }
});

Deno.test("Poll translations: rejects choice polls with different option counts", async () => {
  stub(
    repositoryTestDoubles,
    "fetchPollsByIds",
    () =>
      Promise.resolve(new Map([["poll-en", singleEn], ["poll-es", singleEs]])),
  );
  stub(
    repositoryTestDoubles,
    "getPollsInTranslationGroups",
    () => Promise.resolve([]),
  );
  stub(
    repositoryTestDoubles,
    "getOptionCounts",
    () => Promise.resolve(new Map([["poll-en", 4], ["poll-es", 5]])),
  );

  try {
    await assertRejects(
      () => pollRepository.linkPollTranslation("poll-en", "poll-es"),
      Error,
      "Option counts do not match",
    );
  } finally {
    restore();
  }
});

Deno.test("Poll translations: links valid same-type polls and retargets votes", async () => {
  const updateCalls: Array<{ values: unknown; ids: string[] }> = [];
  stub(
    repositoryTestDoubles,
    "fetchPollsByIds",
    () =>
      Promise.resolve(new Map([["poll-en", singleEn], ["poll-es", singleEs]])),
  );
  stub(
    repositoryTestDoubles,
    "getPollsInTranslationGroups",
    () => Promise.resolve([]),
  );
  stub(
    repositoryTestDoubles,
    "getOptionCounts",
    () => Promise.resolve(new Map([["poll-en", 4], ["poll-es", 4]])),
  );
  stub(
    repositoryTestDoubles,
    "retargetVotesForPolls",
    (...args: unknown[]) => {
      const [pollIds, translationGroupId] = args as [string[], string];
      updateCalls.push({ values: { translationGroupId }, ids: pollIds });
      return Promise.resolve();
    },
  );

  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  stub(supabaseAny, "from", () => ({
    update: (values: unknown) => ({
      in: (_column: string, ids: string[]) => {
        updateCalls.push({ values, ids });
        return Promise.resolve({ error: null });
      },
    }),
  }));

  try {
    const groupId = await pollRepository.linkPollTranslation(
      "poll-en",
      "poll-es",
    );

    assertEquals(groupId, "poll-en");
    assertEquals(updateCalls[0].ids.sort(), ["poll-en", "poll-es"]);
    assertEquals(updateCalls[1].ids.sort(), ["poll-en", "poll-es"]);
  } finally {
    restore();
  }
});

Deno.test("Poll translations: maps user votes by option display order", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  stub(supabaseAny, "from", () => ({
    select: () => ({
      in: () =>
        Promise.resolve({
          data: [{ id: "es-java", display_order: 2 }],
          error: null,
        }),
      eq: () =>
        Promise.resolve({
          data: [
            { id: "en-python", display_order: 1 },
            { id: "en-java", display_order: 2 },
            { id: "en-cpp", display_order: 3 },
          ],
          error: null,
        }),
    }),
  }));

  try {
    const [mapped] = await pollRepository.mapVotesToPollOptions(
      [{
        id: "vote-1",
        poll_id: "poll-es",
        user_id: "user-1",
        poll_option_id: "es-java",
      }],
      "poll-en",
    );

    assertEquals(mapped.poll_option_id, "en-java");
    assertEquals(
      (mapped as unknown as { original_poll_option_id: string })
        .original_poll_option_id,
      "es-java",
    );
  } finally {
    restore();
  }
});
