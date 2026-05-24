import { pollRepository } from '../repositories/poll.repository.ts';
import { pollValidation } from '../lib/validation.ts';

export const pollService = {
  async createPoll(pollData: any, userId: string) {
    // Validate poll type
    if (!pollValidation.validatePollType(pollData.type)) {
      throw new Error('Invalid poll type');
    }

    // Validate slug
    if (!pollValidation.validateSlug(pollData.slug)) {
      throw new Error('Invalid poll slug format');
    }

    // Validate options count for choice-based polls
    if (pollData.type !== 'free_text') {
      const optionCount = pollData.options?.length || 0;
      if (!pollValidation.validateOptionCount(pollData.type, optionCount)) {
        const limits = (pollValidation as any).optionLimits[pollData.type];
        throw new Error(
          `${pollData.type} requires ${limits.min}-${limits.max} options`
        );
      }
    }

    // Create poll
    const poll = await pollRepository.createPoll({
      slug: pollData.slug,
      title: pollData.title,
      description: pollData.description,
      type: pollData.type,
      language: pollData.language || 'en',
      status: pollData.status || 'open',
      closes_at: pollData.closes_at,
      created_by: userId,
      translation_group_id: pollData.translation_group_id
    });

    // Create options for choice-based polls
    if (pollData.type !== 'free_text' && pollData.options) {
      for (let i = 0; i < pollData.options.length; i++) {
        await pollRepository.addOption({
          poll_id: poll.id,
          option_text: pollData.options[i].text,
          display_order: i + 1,
          color: pollData.options[i].color || this.generateColor(i)
        });
      }
    }

    // Create display settings
    if (pollData.displaySettings) {
      await pollRepository.updateDisplaySettings(poll.id, pollData.displaySettings);
    }

    return poll;
  },

  async votePoll(pollId: string, userId: string, voteData: any) {
    // Get poll details
    const poll = await pollRepository.getPollWithResults(pollId);

    // Check if poll is open
    if (poll.status !== 'open') {
      throw new Error('Poll is closed');
    }

    // Check if poll has expired
    if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
      throw new Error('Poll has expired');
    }

    // Get existing votes
    const existingVotes = await pollRepository.getUserVote(pollId, userId);

    // Handle free text
    if (poll.type === 'free_text') {
      if (existingVotes.length > 0) {
        throw new Error('You have already submitted a response');
      }

      return await pollRepository.castVote({
        poll_id: pollId,
        user_id: userId,
        free_text_response: voteData.text
      });
    }

    // Handle single choice
    if (poll.type === 'single_choice') {
      // Delete existing vote if any
      if (existingVotes.length > 0) {
        await pollRepository.deleteVotes(pollId, userId);
      }

      // Cast new vote
      return await pollRepository.castVote({
        poll_id: pollId,
        user_id: userId,
        poll_option_id: voteData.optionId
      });
    }

    // Handle multiple choice
    if (poll.type === 'multiple_choice') {
      // Delete all existing votes
      if (existingVotes.length > 0) {
        await pollRepository.deleteVotes(pollId, userId);
      }

      // Cast multiple votes
      const votes = [];
      for (const optionId of voteData.optionIds) {
        const vote = await pollRepository.castVote({
          poll_id: pollId,
          user_id: userId,
          poll_option_id: optionId
        });
        votes.push(vote);
      }

      return votes;
    }
  },

  async removeVote(pollId: string, userId: string) {
    const poll = await pollRepository.getPollWithResults(pollId);

    if (poll.status !== 'open') {
      throw new Error('Poll is closed');
    }

    if (poll.type === 'free_text') {
      throw new Error('Cannot remove free text response');
    }

    return await pollRepository.deleteVotes(pollId, userId);
  },

  generateColor(index: number): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52C9B2'
    ];
    return colors[index % colors.length];
  }
};

