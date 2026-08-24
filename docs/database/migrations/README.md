# Database Migrations — CodeWithBotina Blog

## Overview

This directory contains full structural backups of the PostgreSQL database (DDL only —
no data). Each backup is generated with the `scripts/backup_db.fish` script and placed
in a subdirectory named with the date it was taken (`DD-MM-YYYY`).

These backups are the **single source of truth** for the database schema. There are no
individual migration files — instead, full structural snapshots are taken after each
significant change to the database.

---

## How to Use a Backup

### Restore locally with Docker

```bash
# 1. Start a local PostgreSQL container
docker run --name codewithbotina-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=codewithbotina \
  -p 5432:5432 \
  -d postgres:16

# 2. Wait for the container to be ready
docker exec codewithbotina-db pg_isready -U postgres

# 3. Apply the tables structure first
docker exec -i codewithbotina-db psql \
  -U postgres \
  -d codewithbotina \
  < docs/database/migrations/YYYY-MM-DD/blog-codewithbotina-structure-01-tables.sql

# 4. Apply constraints, indexes, policies and views
docker exec -i codewithbotina-db psql \
  -U postgres \
  -d codewithbotina \
  < docs/database/migrations/YYYY-MM-DD/blog-codewithbotina-structure-02-constraints.sql

# 5. Verify the schema was applied
docker exec -it codewithbotina-db psql \
  -U postgres \
  -d codewithbotina \
  -c "\dt"
```

### Restore in another Supabase project

1. Open your Supabase project → **SQL Editor**
2. Paste and run the contents of `structure-01-tables.sql`
3. Paste and run the contents of `structure-02-constraints.sql`
4. Verify in **Table Editor** that all tables are present

> **Order matters:** Always run `structure-01-tables.sql` BEFORE `structure-02-constraints.sql`.
> The constraints file references tables defined in the first file.

---

## Backup Contents

Each backup directory contains exactly 2 files:

| File | Contents |
|------|----------|
| `blog-codewithbotina-structure-01-tables.sql` | Extensions, types, schemas, tables, sequences |
| `blog-codewithbotina-structure-02-constraints.sql` | Indexes, foreign keys, RLS policies, views, functions, triggers |

---

## Backup History

| Date | Directory | Description |
|------|-----------|-------------|
| 09-08-2026 | `09-08-2026/` | Initial full backup. Includes all tables: users, posts, comments, tags, post_reactions, poll_votes, polls, poll_options, auth_sessions, cookie_consents. Includes unified reactions, unified comments across translations (translation_group_id), poll translation linking, and all RLS policies. |

---

## How to Add a New Backup

1. Run the backup script on your machine:
   ```bash
   fish scripts/backup_db.fish
   ```
2. Create a new subdirectory named with today's date:
   ```bash
   mkdir docs/database/migrations/$(date +%d-%m-%Y)
   ```
3. Move the generated files into the new directory.
4. Update the **Backup History** table above with the date and a short description of
   what changed in the database since the last backup.
5. Clear and update `scripts/db-pending-changes.sql` if the change has now been captured
   in the backup.

---

## Related Files

- `scripts/db-pending-changes.sql` — Contains the SQL for the LATEST pending database
  change that has not yet been captured in a backup. Apply this first when setting up a
  fresh environment from the latest backup.
- `scripts/README.md` — Explains the purpose and workflow of the scripts directory.
- `scripts/backup_db.fish` — The Fish shell script used to generate these backups.
- `backend/README.md` — Full local development setup guide including database restore steps.
