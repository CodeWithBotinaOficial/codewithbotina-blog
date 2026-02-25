-- Migration: Create admin_users table
-- Description: Whitelist of users with admin privileges
-- Date: 2026-02-07

CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES users(id)
);

COMMENT ON TABLE admin_users IS 'Whitelist of admin users';

-- Insert your user as the first admin (replace with your actual user_id after first login)
-- INSERT INTO admin_users (user_id) VALUES ('your-uuid-here');
