-- Ensure poll foreign keys cascade deletes so admins can delete polls that have votes/options/settings.

ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_poll_id_fkey;
ALTER TABLE poll_votes
ADD CONSTRAINT poll_votes_poll_id_fkey
FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;

ALTER TABLE poll_options DROP CONSTRAINT IF EXISTS poll_options_poll_id_fkey;
ALTER TABLE poll_options
ADD CONSTRAINT poll_options_poll_id_fkey
FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;

ALTER TABLE poll_display_settings DROP CONSTRAINT IF EXISTS poll_display_settings_poll_id_fkey;
ALTER TABLE poll_display_settings
ADD CONSTRAINT poll_display_settings_poll_id_fkey
FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;

ALTER TABLE poll_posts DROP CONSTRAINT IF EXISTS poll_posts_poll_id_fkey;
ALTER TABLE poll_posts
ADD CONSTRAINT poll_posts_poll_id_fkey
FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;

ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_poll_option_id_fkey;
ALTER TABLE poll_votes
ADD CONSTRAINT poll_votes_poll_option_id_fkey
FOREIGN KEY (poll_option_id) REFERENCES poll_options(id) ON DELETE CASCADE;

