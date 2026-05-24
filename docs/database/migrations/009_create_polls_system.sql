-- ============================================================================
-- POLLS SYSTEM SCHEMA (FIXED FOR admin_users.user_id)
-- ============================================================================

-- Main polls table
CREATE TABLE polls (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       slug VARCHAR(255) NOT NULL,
                       title VARCHAR(500) NOT NULL,
                       description TEXT,
                       type VARCHAR(50) NOT NULL CHECK (type IN ('free_text', 'single_choice', 'multiple_choice')),
                       language VARCHAR(10) NOT NULL CHECK (language IN ('es', 'en', 'pt-br')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closes_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Translation linking (like posts)
  translation_group_id UUID,

  UNIQUE(slug, language)
);

CREATE INDEX idx_polls_slug ON polls(slug);
CREATE INDEX idx_polls_language ON polls(language);
CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_polls_translation_group ON polls(translation_group_id);
CREATE INDEX idx_polls_created_by ON polls(created_by);

-- Poll options (for choice-based polls)
CREATE TABLE poll_options (
                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
                              option_text VARCHAR(500) NOT NULL,
                              display_order INTEGER NOT NULL,
                              color VARCHAR(7), -- Hex color for charts (e.g., #FF5733)
                              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

                              UNIQUE(poll_id, display_order)
);

CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);

-- User votes
CREATE TABLE poll_votes (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
                            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            poll_option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
                            free_text_response TEXT, -- For free_text polls
                            voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
                            CHECK (
                                (free_text_response IS NOT NULL AND poll_option_id IS NULL) OR
                                (free_text_response IS NULL AND poll_option_id IS NOT NULL)
                                )
);

CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX idx_poll_votes_poll_option_id ON poll_votes(poll_option_id);

-- For single_choice: one vote per user per poll
-- For multiple_choice: multiple votes per user per poll
-- For free_text: one vote per user per poll
CREATE UNIQUE INDEX idx_poll_votes_single_free ON poll_votes(poll_id, user_id)
    WHERE poll_option_id IS NULL; -- free_text constraint

-- Display settings for choice-based polls
CREATE TABLE poll_display_settings (
                                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                       poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,

    -- Top list settings
                                       show_top BOOLEAN DEFAULT FALSE,
                                       top_count INTEGER, -- Max 60% of total options
                                       top_order VARCHAR(10) CHECK (top_order IN ('asc', 'desc')),

    -- Bar chart settings
                                       show_bar_chart BOOLEAN DEFAULT FALSE,
                                       bar_chart_orientation VARCHAR(20) CHECK (bar_chart_orientation IN ('horizontal', 'vertical')),
                                       bar_chart_options_count INTEGER, -- 1 to total options

                                       UNIQUE(poll_id)
);

-- Poll-Post relationship (optional, for tracking)
CREATE TABLE poll_posts (
                            poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
                            post_id UUID NOT NULL,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

                            PRIMARY KEY (poll_id, post_id)
);

CREATE INDEX idx_poll_posts_post_id ON poll_posts(post_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-close expired polls
CREATE OR REPLACE FUNCTION close_expired_polls()
RETURNS void AS $$
BEGIN
UPDATE polls
SET status = 'closed'
WHERE status = 'open'
  AND closes_at IS NOT NULL
  AND closes_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to validate top_count (max 60% of options)
CREATE OR REPLACE FUNCTION validate_top_count()
RETURNS TRIGGER AS $$
DECLARE
total_options INTEGER;
  max_top_count INTEGER;
BEGIN
SELECT COUNT(*) INTO total_options
FROM poll_options
WHERE poll_id = NEW.poll_id;

max_top_count := ROUND(total_options * 0.6);

  IF NEW.top_count > max_top_count THEN
    RAISE EXCEPTION 'top_count cannot exceed 60%% of total options (max: %)', max_top_count;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_top_count_trigger
    BEFORE INSERT OR UPDATE ON poll_display_settings
                         FOR EACH ROW
                         WHEN (NEW.show_top = TRUE)
                         EXECUTE FUNCTION validate_top_count();

-- Function to prevent deleting options with votes
CREATE OR REPLACE FUNCTION prevent_delete_option_with_votes()
RETURNS TRIGGER AS $$
DECLARE
vote_count INTEGER;
BEGIN
SELECT COUNT(*) INTO vote_count
FROM poll_votes
WHERE poll_option_id = OLD.id;

IF vote_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete option with existing votes (% votes)', vote_count;
END IF;

RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_delete_option_with_votes_trigger
    BEFORE DELETE ON poll_options
    FOR EACH ROW
    EXECUTE FUNCTION prevent_delete_option_with_votes();

-- ============================================================================
-- RLS POLICIES (Row Level Security) - FIXED FOR admin_users.user_id
-- ============================================================================

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_display_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_posts ENABLE ROW LEVEL SECURITY;

-- Polls: Everyone can read, only admins can write
CREATE POLICY polls_read_policy ON polls FOR SELECT USING (true);
CREATE POLICY polls_write_policy ON polls FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);

-- Poll options: Everyone can read, only admins can write
CREATE POLICY poll_options_read_policy ON poll_options FOR SELECT USING (true);
CREATE POLICY poll_options_write_policy ON poll_options FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);

-- Poll votes: Users can read all, but only write their own
CREATE POLICY poll_votes_read_policy ON poll_votes FOR SELECT USING (true);
CREATE POLICY poll_votes_insert_policy ON poll_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY poll_votes_update_policy ON poll_votes FOR UPDATE USING (
                                                                    auth.uid() = user_id
                                                                    );
CREATE POLICY poll_votes_delete_policy ON poll_votes FOR DELETE USING (
  auth.uid() = user_id
);

-- Display settings: Everyone can read, only admins can write
CREATE POLICY poll_display_settings_read_policy ON poll_display_settings FOR SELECT USING (true);
CREATE POLICY poll_display_settings_write_policy ON poll_display_settings FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);

-- Poll-post relationship: Everyone can read, only admins can write
CREATE POLICY poll_posts_read_policy ON poll_posts FOR SELECT USING (true);
CREATE POLICY poll_posts_write_policy ON poll_posts FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);