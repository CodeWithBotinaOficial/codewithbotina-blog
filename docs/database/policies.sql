-- Row Level Security Policies for Authentication System
-- Apply these after creating all tables

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- System (service_role) can manage all users
CREATE POLICY "System can manage users"
  ON users FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- POST_REACTIONS TABLE POLICIES
-- ============================================

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can read reactions (for displaying counts)
CREATE POLICY "Anyone can read reactions"
  ON post_reactions FOR SELECT
  USING (true);

-- Authenticated users can insert their own reactions
CREATE POLICY "Users can create own reactions"
  ON post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reactions (change like to dislike)
CREATE POLICY "Users can update own reactions"
  ON post_reactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- COMMENTS TABLE POLICIES
-- ============================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with pinning support
DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

-- Anyone can read comments (public visibility)
CREATE POLICY "Anyone can read comments"
  ON comments FOR SELECT
  USING (true);

-- Only authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_pinned = FALSE
  );

-- Only comment author can update their own comment content
CREATE POLICY "Users can update own comment content"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_pinned = (SELECT is_pinned FROM comments WHERE id = comments.id)
  );

-- Only comment author can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ADMIN-ONLY: Admins can pin/unpin any comment
CREATE POLICY "Admins can pin comments"
  ON comments FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- ADMIN-ONLY: Admins can delete any comment (moderation)
CREATE POLICY "Admins can delete any comment"
  ON comments FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- ============================================
-- ADMIN_USERS TABLE POLICIES
-- ============================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admin list
CREATE POLICY "Only admins can read admin list"
  ON admin_users FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Only existing admins can grant admin access (insert)
CREATE POLICY "Admins can grant admin access"
  ON admin_users FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));
