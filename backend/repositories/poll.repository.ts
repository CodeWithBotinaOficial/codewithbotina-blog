import { supabase } from "../lib/supabase.ts";

type PollType = "free_text" | "single_choice" | "multiple_choice";

type PollRecord = {
  id: string;
  slug: string;
  title: string;
  language: string;
  type: PollType;
  translation_group_id?: string | null;
};

type PollOptionRecord = {
  id: string;
  poll_id: string;
  option_text?: string;
  display_order: number;
  color?: string | null;
};

type PollVoteRecord = {
  id: string;
  poll_id: string;
  user_id: string;
  poll_option_id?: string | null;
  free_text_response?: string | null;
  translation_group_id?: string | null;
  voted_at?: string | null;
};

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = String((error as { message?: string })?.message ?? "");
  return code === "42703" || message.includes("translation_group_id");
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export const pollRepository = {
  // Create poll
  async createPoll(data: {
    slug: string;
    title: string;
    description?: string;
    type: string;
    language: string;
    status?: string;
    closes_at?: string;
    created_by: string;
    translation_group_id?: string;
  }) {
    const { data: poll, error } = await supabase
      .from("polls")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return poll;
  },

  // Get poll by slug and language
  async getPollBySlug(slug: string, language: string) {
    const { data, error } = await supabase
      .from("polls")
      .select(`
        *,
        poll_options(*),
        poll_display_settings(*),
        poll_votes(count)
      `)
      .eq("slug", slug)
      .eq("language", language)
      .single();

    if (error) {
      // When no rows match, PostgREST returns PGRST116. Treat that as "not found".
      const code = (error as { code?: string }).code;
      if (code === "PGRST116") return null;
      throw error;
    }
    const poll = data as PollRecord & Record<string, unknown>;
    const votes = await this.getVotesForPollGroup(
      poll.id,
      poll.translation_group_id ?? poll.id,
    );
    return {
      ...data,
      vote_count: votes.length,
      poll_votes: [{ count: votes.length }],
    };
  },

  async findPollBySlug(slug: string, language: string) {
    const { data, error } = await supabase
      .from("polls")
      .select("id, slug, language")
      .eq("slug", slug)
      .eq("language", language)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Get poll with vote counts
  async getPollWithResults(pollId: string) {
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("*")
      .eq("id", pollId)
      .single();

    if (pollError) throw pollError;
    const typedPoll = poll as PollRecord & Record<string, unknown>;
    const translationGroupId = typedPoll.translation_group_id ?? typedPoll.id;

    // Get options with vote counts
    const { data: options, error: optionsError } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", pollId)
      .order("display_order");

    if (optionsError) throw optionsError;
    const targetOptions = (options ?? []) as PollOptionRecord[];
    const votes = await this.getVotesForPollGroup(pollId, translationGroupId);
    const voteCountsByOrder = await this.countVotesByDisplayOrder(votes);
    const normalizedOptions = targetOptions.map((opt) => ({
      ...opt,
      vote_count: voteCountsByOrder.get(Number(opt.display_order)) ?? 0,
    }));

    // Get free text responses if applicable
    let freeTextResponses: Array<
      { free_text_response: string | null; voted_at: string | null }
    > = [];
    if (typedPoll.type === "free_text") {
      freeTextResponses = votes
        .filter((vote) => vote.free_text_response)
        .map((vote) => ({
          free_text_response: vote.free_text_response ?? null,
          voted_at: vote.voted_at ?? null,
        }))
        .sort((a, b) =>
          String(b.voted_at ?? "").localeCompare(String(a.voted_at ?? ""))
        );
    }

    return {
      ...poll,
      options: normalizedOptions,
      freeTextResponses,
    };
  },

  // Delete poll and all dependent rows (votes, options, settings, post links).
  async deletePollCascade(pollId: string) {
    const target = await this.resolveVoteTarget(pollId);
    const groupPolls = await this.getPollsInTranslationGroup(
      target.translationGroupId,
    );
    const remainingPolls = groupPolls.filter((poll) => poll.id !== pollId);
    if (remainingPolls.length > 0) {
      const nextGroupId = remainingPolls.length === 1
        ? remainingPolls[0].id
        : remainingPolls[0].id;
      const remainingPollIds = remainingPolls.map((poll) => poll.id);
      const { error: retargetPollsError } = await supabase
        .from("polls")
        .update({
          translation_group_id: remainingPolls.length === 1
            ? null
            : nextGroupId,
        })
        .in("id", remainingPollIds);
      if (retargetPollsError) throw retargetPollsError;

      const { error: retargetVotesError } = await supabase
        .from("poll_votes")
        .update({ translation_group_id: nextGroupId })
        .eq("translation_group_id", target.translationGroupId);
      if (retargetVotesError && !isMissingColumnError(retargetVotesError)) {
        throw retargetVotesError;
      }
    }

    const { error: votesError } = await supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId);
    if (votesError) throw votesError;

    const { error: settingsError } = await supabase
      .from("poll_display_settings")
      .delete()
      .eq("poll_id", pollId);
    if (settingsError) throw settingsError;

    const { error: postsError } = await supabase
      .from("poll_posts")
      .delete()
      .eq("poll_id", pollId);
    if (postsError) throw postsError;

    const { error: optionsError } = await supabase
      .from("poll_options")
      .delete()
      .eq("poll_id", pollId);
    if (optionsError) throw optionsError;

    const { error: pollError } = await supabase
      .from("polls")
      .delete()
      .eq("id", pollId);
    if (pollError) throw pollError;

    return true;
  },

  // Update poll
  async updatePoll(pollId: string, updates: unknown) {
    const { data, error } = await supabase
      .from("polls")
      .update({
        ...(updates as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      })
      .eq("id", pollId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete poll
  async deletePoll(pollId: string) {
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", pollId);

    if (error) throw error;
    return true;
  },

  // Add option to poll
  async addOption(data: {
    poll_id: string;
    option_text: string;
    display_order: number;
    color?: string;
  }) {
    const { data: option, error } = await supabase
      .from("poll_options")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return option;
  },

  // Delete option (only if no votes)
  async deleteOption(optionId: string) {
    const { error } = await supabase
      .from("poll_options")
      .delete()
      .eq("id", optionId);

    if (error) throw error;
    return true;
  },

  // Get user's vote for poll
  async getUserVote(pollId: string, userId: string) {
    const target = await this.resolveVoteTarget(pollId);
    const { data, error } = await this.userVotesQuery(
      target.pollId,
      userId,
      target.translationGroupId,
    );

    if (error) throw error;
    const mappedVotes = await this.mapVotesToPollOptions(
      (data ?? []) as PollVoteRecord[],
      target.pollId,
    );
    return await this.annotateVotesWithPollLanguage(mappedVotes);
  },

  // Cast vote
  async castVote(data: {
    poll_id: string;
    user_id: string;
    poll_option_id?: string;
    free_text_response?: string;
    translation_group_id?: string;
  }) {
    const target = await this.resolveVoteTarget(data.poll_id);
    const { data: vote, error } = await supabase
      .from("poll_votes")
      .insert({
        ...data,
        translation_group_id: data.translation_group_id ??
          target.translationGroupId,
      })
      .select()
      .single();

    if (error) throw error;
    return vote;
  },

  // Update vote
  async updateVote(voteId: string, updates: unknown) {
    const { data, error } = await supabase
      .from("poll_votes")
      .update({
        ...(updates as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      })
      .eq("id", voteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete vote(s)
  async deleteVotes(pollId: string, userId: string) {
    const target = await this.resolveVoteTarget(pollId);
    const { error } = await this.deleteVotesQuery(
      target.pollId,
      userId,
      target.translationGroupId,
    );

    if (error) throw error;
    return true;
  },

  // Get detailed analytics (admin only)
  async getVoteAnalytics(pollId: string) {
    const target = await this.resolveVoteTarget(pollId);
    const { data, error } = await supabase
      .from("poll_votes")
      .select(`
        *,
        user:users(id, full_name, email, avatar_url),
        poll_option:poll_options(option_text)
      `)
      .eq("translation_group_id", target.translationGroupId)
      .order("voted_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Update display settings
  async updateDisplaySettings(pollId: string, settings: unknown) {
    const { data, error } = await supabase
      .from("poll_display_settings")
      .upsert({ poll_id: pollId, ...(settings as Record<string, unknown>) })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async resolveVoteTarget(pollId: string) {
    const { data, error } = await supabase
      .from("polls")
      .select("id, translation_group_id")
      .eq("id", pollId)
      .single();

    if (error) throw error;
    const poll = data as { id: string; translation_group_id?: string | null };
    return {
      pollId: poll.id,
      translationGroupId: poll.translation_group_id ?? poll.id,
    };
  },

  async getVotesForPollGroup(pollId: string, translationGroupId: string) {
    const { data, error } = await supabase
      .from("poll_votes")
      .select("*")
      .eq("translation_group_id", translationGroupId);

    if (error) {
      if (isMissingColumnError(error)) {
        const fallback = await supabase
          .from("poll_votes")
          .select("*")
          .eq("poll_id", pollId);
        if (fallback.error) throw fallback.error;
        return (fallback.data ?? []) as PollVoteRecord[];
      }
      throw error;
    }
    return (data ?? []) as PollVoteRecord[];
  },

  async userVotesQuery(
    pollId: string,
    userId: string,
    translationGroupId: string,
  ) {
    const result = await supabase
      .from("poll_votes")
      .select("*")
      .eq("translation_group_id", translationGroupId)
      .eq("user_id", userId);

    if (result.error && isMissingColumnError(result.error)) {
      return await supabase
        .from("poll_votes")
        .select("*")
        .eq("poll_id", pollId)
        .eq("user_id", userId);
    }

    return result;
  },

  async deleteVotesQuery(
    pollId: string,
    userId: string,
    translationGroupId: string,
  ) {
    const result = await supabase
      .from("poll_votes")
      .delete()
      .eq("translation_group_id", translationGroupId)
      .eq("user_id", userId);

    if (result.error && isMissingColumnError(result.error)) {
      return await supabase
        .from("poll_votes")
        .delete()
        .eq("poll_id", pollId)
        .eq("user_id", userId);
    }

    return result;
  },

  async countVotesByDisplayOrder(votes: PollVoteRecord[]) {
    const optionIds = unique(
      votes.map((vote) => vote.poll_option_id).filter(Boolean) as string[],
    );
    const counts = new Map<number, number>();
    if (optionIds.length === 0) return counts;

    const { data, error } = await supabase
      .from("poll_options")
      .select("id, display_order")
      .in("id", optionIds);

    if (error) throw error;
    const optionsById = new Map(
      ((data ?? []) as Array<{ id: string; display_order: number }>).map((
        opt,
      ) => [opt.id, Number(opt.display_order)]),
    );

    for (const vote of votes) {
      if (!vote.poll_option_id) continue;
      const order = optionsById.get(vote.poll_option_id);
      if (order === undefined) continue;
      counts.set(order, (counts.get(order) ?? 0) + 1);
    }

    return counts;
  },

  async mapVotesToPollOptions(votes: PollVoteRecord[], targetPollId: string) {
    const optionIds = unique(
      votes.map((vote) => vote.poll_option_id).filter(Boolean) as string[],
    );
    if (optionIds.length === 0) return votes;

    const [{ data: sourceOptions, error: sourceError }, {
      data: targetOptions,
      error: targetError,
    }] = await Promise.all([
      supabase.from("poll_options").select("id, display_order").in(
        "id",
        optionIds,
      ),
      supabase.from("poll_options").select("id, display_order").eq(
        "poll_id",
        targetPollId,
      ),
    ]);

    if (sourceError) throw sourceError;
    if (targetError) throw targetError;

    const sourceOrderById = new Map(
      ((sourceOptions ?? []) as Array<{ id: string; display_order: number }>)
        .map((opt) => [opt.id, Number(opt.display_order)]),
    );
    const targetIdByOrder = new Map(
      ((targetOptions ?? []) as Array<{ id: string; display_order: number }>)
        .map((opt) => [Number(opt.display_order), opt.id]),
    );

    return votes.map((vote) => {
      if (!vote.poll_option_id) return vote;
      const order = sourceOrderById.get(vote.poll_option_id);
      const mappedOptionId = order === undefined
        ? undefined
        : targetIdByOrder.get(order);
      return {
        ...vote,
        original_poll_option_id: vote.poll_option_id,
        poll_option_id: mappedOptionId ?? vote.poll_option_id,
      };
    });
  },

  async annotateVotesWithPollLanguage(votes: PollVoteRecord[]) {
    const pollIds = unique(votes.map((vote) => vote.poll_id).filter(Boolean));
    if (pollIds.length === 0) return votes;

    const { data, error } = await supabase
      .from("polls")
      .select("id, language")
      .in("id", pollIds);
    if (error) throw error;

    const languageByPollId = new Map(
      ((data ?? []) as Array<{ id: string; language: string }>).map((poll) => [
        poll.id,
        poll.language,
      ]),
    );

    return votes.map((vote) => ({
      ...vote,
      voted_language: languageByPollId.get(vote.poll_id) ?? null,
    }));
  },

  async getPollTranslations(pollId: string) {
    const { data: poll, error } = await supabase
      .from("polls")
      .select("id, translation_group_id")
      .eq("id", pollId)
      .single();

    if (error) throw error;
    const translationGroupId = (poll as PollRecord).translation_group_id;
    if (!translationGroupId) {
      return {
        translation_group_id: null,
        linked_polls: [],
        languages: [],
      };
    }

    const { data, error: linkedError } = await supabase
      .from("polls")
      .select("id, slug, title, language, type, translation_group_id")
      .eq("translation_group_id", translationGroupId)
      .neq("id", pollId)
      .order("language");

    if (linkedError) throw linkedError;
    const linkedPolls = (data ?? []) as PollRecord[];

    return {
      translation_group_id: translationGroupId,
      linked_polls: linkedPolls,
      languages: linkedPolls.map((linkedPoll) => linkedPoll.language),
    };
  },

  async linkPollTranslation(pollId: string, linkedPollId: string) {
    if (pollId === linkedPollId) {
      throw new Error("Cannot link a poll to itself");
    }

    const polls = await this.fetchPollsByIds([pollId, linkedPollId]);
    const poll = polls.get(pollId);
    const linkedPoll = polls.get(linkedPollId);
    if (!poll || !linkedPoll) throw new Error("One or both polls not found");

    if (poll.type !== linkedPoll.type) {
      throw new Error(
        `Cannot link polls of different types: ${poll.type} != ${linkedPoll.type}`,
      );
    }

    const translationGroupId = poll.translation_group_id ??
      linkedPoll.translation_group_id ?? poll.id;
    const candidateGroupIds = unique([
      poll.translation_group_id ?? poll.id,
      linkedPoll.translation_group_id ?? linkedPoll.id,
    ]);
    const existingGroupPolls = await this.getPollsInTranslationGroups(
      candidateGroupIds,
      [poll.id, linkedPoll.id],
    );
    const pollsToValidate = unique([
      ...existingGroupPolls.map((groupPoll) => groupPoll.id),
      poll.id,
      linkedPoll.id,
    ]);
    const pollMap = await this.fetchPollsByIds(pollsToValidate);
    const allPolls = Array.from(pollMap.values());

    if (allPolls.some((groupPoll) => groupPoll.type !== poll.type)) {
      throw new Error(
        `Cannot link polls of different types: all translations must be ${poll.type}`,
      );
    }

    const languages = new Set<string>();
    const duplicateLanguage = allPolls.find((groupPoll) => {
      if (languages.has(groupPoll.language)) return true;
      languages.add(groupPoll.language);
      return false;
    });
    if (duplicateLanguage) {
      throw new Error(
        `Cannot link polls with duplicate language: ${duplicateLanguage.language}`,
      );
    }

    if (poll.type !== "free_text") {
      const counts = await this.getOptionCounts(allPolls.map((p) => p.id));
      const expected = counts.get(poll.id) ?? 0;
      const linkedCount = counts.get(linkedPoll.id) ?? 0;
      if (expected !== linkedCount) {
        throw new Error(
          `Option counts do not match: ${poll.title} (${expected}) vs ${linkedPoll.title} (${linkedCount})`,
        );
      }
      for (const groupPoll of allPolls) {
        const count = counts.get(groupPoll.id) ?? 0;
        if (count !== expected) {
          throw new Error(
            `Option counts do not match existing translation: ${groupPoll.title} (${count}) vs ${poll.title} (${expected})`,
          );
        }
      }
    }

    const pollIdsToLink = allPolls.map((groupPoll) => groupPoll.id);

    const { error: updateError } = await supabase
      .from("polls")
      .update({ translation_group_id: translationGroupId })
      .in("id", pollIdsToLink);
    if (updateError) throw updateError;

    await this.retargetVotesForPolls(pollIdsToLink, translationGroupId);
    return translationGroupId;
  },

  async unlinkPollTranslation(pollId: string) {
    const target = await this.resolveVoteTarget(pollId);
    const { error } = await supabase
      .from("polls")
      .update({ translation_group_id: null })
      .eq("id", pollId);
    if (error) throw error;

    await this.retargetVotesForPolls([pollId], pollId);

    const remaining = await this.getPollsInTranslationGroup(
      target.translationGroupId,
    );
    if (remaining.length <= 1) {
      const remainingIds = remaining.map((poll) => poll.id);
      if (remainingIds.length > 0) {
        const { error: remainingError } = await supabase
          .from("polls")
          .update({ translation_group_id: null })
          .in("id", remainingIds);
        if (remainingError) throw remainingError;
        await this.retargetVotesForPolls(remainingIds, remainingIds[0]);
      }
    }
    return true;
  },

  async fetchPollsByIds(pollIds: string[]) {
    const { data, error } = await supabase
      .from("polls")
      .select("id, slug, title, language, type, translation_group_id")
      .in("id", pollIds);
    if (error) throw error;
    return new Map(
      ((data ?? []) as PollRecord[]).map((poll) => [poll.id, poll]),
    );
  },

  async getPollsInTranslationGroup(
    translationGroupId: string,
    includeIds: string[] = [],
  ) {
    const { data, error } = await supabase
      .from("polls")
      .select("id, slug, title, language, type, translation_group_id")
      .eq("translation_group_id", translationGroupId);
    if (error) throw error;

    const polls = (data ?? []) as PollRecord[];
    if (includeIds.length === 0) return polls;

    const missingIds = includeIds.filter((id) =>
      !polls.some((poll) => poll.id === id)
    );
    if (missingIds.length === 0) return polls;
    const missing = await this.fetchPollsByIds(missingIds);
    return [...polls, ...missing.values()];
  },

  async getPollsInTranslationGroups(
    translationGroupIds: string[],
    includeIds: string[] = [],
  ) {
    const groupIds = unique(translationGroupIds);
    let polls: PollRecord[] = [];

    if (groupIds.length > 0) {
      const { data, error } = await supabase
        .from("polls")
        .select("id, slug, title, language, type, translation_group_id")
        .in("translation_group_id", groupIds);
      if (error) throw error;
      polls = (data ?? []) as PollRecord[];
    }

    const missingIds = includeIds.filter((id) =>
      !polls.some((poll) => poll.id === id)
    );
    if (missingIds.length === 0) return polls;

    const missing = await this.fetchPollsByIds(missingIds);
    return [...polls, ...missing.values()];
  },

  async getOptionCounts(pollIds: string[]) {
    const ids = unique(pollIds);
    const counts = new Map(ids.map((id) => [id, 0]));
    if (ids.length === 0) return counts;

    const { data, error } = await supabase
      .from("poll_options")
      .select("poll_id")
      .in("poll_id", ids);
    if (error) throw error;

    for (const row of (data ?? []) as Array<{ poll_id: string }>) {
      counts.set(row.poll_id, (counts.get(row.poll_id) ?? 0) + 1);
    }
    return counts;
  },

  async retargetVotesForPolls(pollIds: string[], translationGroupId: string) {
    if (pollIds.length === 0) return;
    const { error } = await supabase
      .from("poll_votes")
      .update({ translation_group_id: translationGroupId })
      .in("poll_id", pollIds);
    if (error && !isMissingColumnError(error)) throw error;
  },
};
