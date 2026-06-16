import { pollRepository } from "../repositories/poll.repository.ts";
import { pollValidation } from "../lib/validation.ts";

export const pollService = {
  async createPoll(pollData: unknown, userId: string) {
    const data = pollData as Record<string, unknown>;
    const type = String(data.type ?? "");
    const slug = String(data.slug ?? "");
    const title = String(data.title ?? "");
    const description = typeof data.description === "string"
      ? data.description
      : undefined;
    const language = typeof data.language === "string" ? data.language : "en";
    const status = typeof data.status === "string" ? data.status : "open";
    const closes_at = typeof data.closes_at === "string"
      ? data.closes_at
      : undefined;
    const translation_group_id = typeof data.translation_group_id === "string"
      ? data.translation_group_id
      : undefined;
    const options = Array.isArray(data.options)
      ? (data.options as Array<Record<string, unknown>>)
      : [];
    const displaySettings =
      typeof data.displaySettings === "object" && data.displaySettings !== null
        ? data.displaySettings as Record<string, unknown>
        : null;

    // Validate poll type
    if (!pollValidation.validatePollType(type)) {
      throw new Error("Invalid poll type");
    }

    // Validate slug
    if (!pollValidation.validateSlug(slug)) {
      throw new Error("Invalid poll slug format");
    }

    const existingPoll = await pollRepository.findPollBySlug(slug, language);
    if (existingPoll) {
      throw new Error("Poll slug already exists");
    }

    // Validate options count for choice-based polls
    if (type !== "free_text") {
      const optionCount = options.length;
      if (!pollValidation.validateOptionCount(type, optionCount)) {
        const limits = (pollValidation.optionLimits as Record<
          string,
          { min: number; max: number } | undefined
        >)[type];
        if (!limits) throw new Error("Invalid poll type");
        throw new Error(`${type} requires ${limits.min}-${limits.max} options`);
      }
    }

    // Create poll
    const poll = await pollRepository.createPoll({
      slug,
      title,
      description,
      type,
      language,
      status,
      closes_at,
      created_by: userId,
      translation_group_id,
    });

    // Create options for choice-based polls
    if (type !== "free_text" && options.length) {
      for (let i = 0; i < options.length; i++) {
        const text = String(options[i]?.text ?? "");
        const color = typeof options[i]?.color === "string"
          ? String(options[i].color)
          : undefined;
        await pollRepository.addOption({
          poll_id: poll.id,
          option_text: text,
          display_order: i + 1,
          color: color || this.generateColor(i),
        });
      }
    }

    // Create display settings
    if (displaySettings) {
      await pollRepository.updateDisplaySettings(
        poll.id,
        displaySettings,
      );
    }

    return poll;
  },

  async votePoll(pollId: string, userId: string, voteData: unknown) {
    const data = voteData as Record<string, unknown>;
    // Get poll details
    const poll = await pollRepository.getPollWithResults(pollId);

    // Check if poll is open
    if (poll.status !== "open") {
      throw new Error("Poll is closed");
    }

    // Check if poll has expired
    if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
      throw new Error("Poll has expired");
    }

    // Get existing votes
    const existingVotes = await pollRepository.getUserVote(pollId, userId);

    // Handle free text
    if (poll.type === "free_text") {
      if (existingVotes.length > 0) {
        throw new Error("You have already submitted a response");
      }

      return await pollRepository.castVote({
        poll_id: pollId,
        user_id: userId,
        free_text_response: String(data.text ?? ""),
      });
    }

    // Handle single choice
    if (poll.type === "single_choice") {
      // Delete existing vote if any
      if (existingVotes.length > 0) {
        await pollRepository.deleteVotes(pollId, userId);
      }

      // Cast new vote
      return await pollRepository.castVote({
        poll_id: pollId,
        user_id: userId,
        poll_option_id: String(data.optionId ?? ""),
      });
    }

    // Handle multiple choice
    if (poll.type === "multiple_choice") {
      // Delete all existing votes
      if (existingVotes.length > 0) {
        await pollRepository.deleteVotes(pollId, userId);
      }

      // Cast multiple votes
      const votes = [];
      const optionIds = Array.isArray(data.optionIds)
        ? data.optionIds.map((v) => String(v))
        : [];
      for (const optionId of optionIds) {
        const vote = await pollRepository.castVote({
          poll_id: pollId,
          user_id: userId,
          poll_option_id: optionId,
        });
        votes.push(vote);
      }

      return votes;
    }
  },

  async removeVote(pollId: string, userId: string) {
    const poll = await pollRepository.getPollWithResults(pollId);

    if (poll.status !== "open") {
      throw new Error("Poll is closed");
    }

    if (poll.type === "free_text") {
      throw new Error("Cannot remove free text response");
    }

    return await pollRepository.deleteVotes(pollId, userId);
  },

  generateColor(index: number): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
      "#F8B739",
      "#52C9B2",
    ];
    return colors[index % colors.length];
  },
};
