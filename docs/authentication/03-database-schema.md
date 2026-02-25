# Database Schema for Authentication System

Complete database schema for users, sessions, reactions, comments, and admin management.

## Overview

Tables to create:
1. `users` - User profiles from Google OAuth
2. `post_reactions` - Likes and dislikes on posts
3. `comments` - User comments on posts
4. `admin_users` - Admin access control

## ER Diagram (Text-based)

```
auth.users (Supabase built-in)
    ↓
  users (public) ← post_reactions
    ↓                 ↓
  comments         posts
    ↓
admin_users
```

## Migration Files

All SQL migrations are in: `docs/database/migrations/`

Execute them in order:
1. `001_create_users_table.sql`
2. `002_create_post_reactions_table.sql`
3. `003_create_comments_table.sql`
4. `004_create_admin_users_table.sql`

Then apply Row Level Security: `docs/database/policies.sql`

## Table Details

### 1. `users` Table

**Purpose:** Store user profiles populated from Google OAuth.

**Columns:**
- `id`: UUID (PK, references auth.users)
- `email`: TEXT (NOT NULL)
- `full_name`: TEXT
- `avatar_url`: TEXT
- `google_id`: TEXT (UNIQUE)
- `created_at`: TIMESTAMP
- `last_login`: TIMESTAMP

**Constraints:**
- Users cannot edit their profile (all data from Google)
- One Google account = one user

**Access:**
- Users can read their own profile
- System (service_role) can insert/update

---

### 2. `post_reactions` Table

**Purpose:** Store likes and dislikes on blog posts.

**Columns:**
- `id`: UUID (PK)
- `post_id`: UUID (FK → posts.id)
- `user_id`: UUID (FK → users.id)
- `reaction_type`: TEXT ('like' or 'dislike')
- `created_at`: TIMESTAMP

**Constraints:**
- One reaction per user per post (UNIQUE constraint)
- If user changes reaction, update existing row

**Access:**
- Anyone can read reactions
- Only authenticated users can create/update/delete their own reactions

---

### 3. `comments` Table

**Purpose:** Store user comments on blog posts.

**Columns:**
- `id`: UUID (PK)
- `post_id`: UUID (FK → posts.id)
- `user_id`: UUID (FK → users.id)
- `content`: TEXT (10-1000 chars)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

**Constraints:**
- Minimum 10 characters, maximum 1000 characters

**Access:**
- Anyone can read comments
- Only authenticated users can create comments
- Only comment author can edit/delete their own comments

---

### 4. `admin_users` Table

**Purpose:** Whitelist of users with admin privileges.

**Columns:**
- `user_id`: UUID (PK, FK → users.id)
- `granted_at`: TIMESTAMP
- `granted_by`: UUID (FK → users.id, nullable)

**Access:**
- Only admins can read the admin list
- Manually insert admin users (SQL)

---

**Next:** [04-api-endpoints.md](./04-api-endpoints.md)
