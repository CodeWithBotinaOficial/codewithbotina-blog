import { supabase } from '../lib/supabase.ts';

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
      .from('polls')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return poll;
  },

  // Get poll by slug and language
  async getPollBySlug(slug: string, language: string) {
    const { data, error } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options(*),
        poll_display_settings(*),
        poll_votes(count)
      `)
      .eq('slug', slug)
      .eq('language', language)
      .single();

    if (error) throw error;
    return data;
  },

  // Get poll with vote counts
  async getPollWithResults(pollId: string) {
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .single();

    if (pollError) throw pollError;

    // Get options with vote counts
    const { data: options, error: optionsError } = await supabase
      .from('poll_options')
      .select(`
        *,
        vote_count:poll_votes(count)
      `)
      .eq('poll_id', pollId)
      .order('display_order');

    if (optionsError) throw optionsError;

    // Get free text responses if applicable
    let freeTextResponses: Array<{ free_text_response: string | null; voted_at: string | null }> = [];
    if (poll.type === 'free_text') {
      const { data: responses, error: responsesError } = await supabase
        .from('poll_votes')
        .select('free_text_response, voted_at')
        .eq('poll_id', pollId)
        .order('voted_at', { ascending: false });

      if (responsesError) throw responsesError;
      freeTextResponses = responses;
    }

    return {
      ...poll,
      options,
      freeTextResponses
    };
  },

  // Update poll
  async updatePoll(pollId: string, updates: any) {
    const { data, error } = await supabase
      .from('polls')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', pollId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete poll
  async deletePoll(pollId: string) {
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);

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
      .from('poll_options')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return option;
  },

  // Delete option (only if no votes)
  async deleteOption(optionId: string) {
    const { error } = await supabase
      .from('poll_options')
      .delete()
      .eq('id', optionId);

    if (error) throw error;
    return true;
  },

  // Get user's vote for poll
  async getUserVote(pollId: string, userId: string) {
    const { data, error } = await supabase
      .from('poll_votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },

  // Cast vote
  async castVote(data: {
    poll_id: string;
    user_id: string;
    poll_option_id?: string;
    free_text_response?: string;
  }) {
    const { data: vote, error } = await supabase
      .from('poll_votes')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return vote;
  },

  // Update vote
  async updateVote(voteId: string, updates: any) {
    const { data, error } = await supabase
      .from('poll_votes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', voteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete vote(s)
  async deleteVotes(pollId: string, userId: string) {
    const { error } = await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  // Get detailed analytics (admin only)
  async getVoteAnalytics(pollId: string) {
    const { data, error } = await supabase
      .from('poll_votes')
      .select(`
        *,
        user:users(id, name, email, avatar_url),
        poll_option:poll_options(option_text)
      `)
      .eq('poll_id', pollId)
      .order('voted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Update display settings
  async updateDisplaySettings(pollId: string, settings: any) {
    const { data, error } = await supabase
      .from('poll_display_settings')
      .upsert({ poll_id: pollId, ...settings })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};


