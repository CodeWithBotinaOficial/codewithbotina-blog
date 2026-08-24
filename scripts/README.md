# Scripts — CodeWithBotina Blog

This directory contains utility scripts for database management and development workflows.

---

## Files

### `backup_db.fish`

A Fish shell script that connects to the Supabase PostgreSQL instance and generates
two structural backup files (DDL only, no data):

- `blog-codewithbotina-structure-01-tables.sql` — Tables, types, extensions, sequences
- `blog-codewithbotina-structure-02-constraints.sql` — Indexes, policies, views, triggers

**Usage:**
```bash
fish scripts/backup_db.fish
```

After running, move the output files to a new dated directory in `docs/database/migrations/`
and update the README there.

---

### `db-pending-changes.sql`

A **dynamic single-purpose file** that always contains the SQL for the most recent
database change not yet captured in a full backup.

**Rules:**
- This file has AT MOST one pending change at a time
- Its content is COMPLETELY REPLACED every time a new database change is needed
- After the change is applied and a new backup is generated, this file is reset
  to the placeholder comment
- Never accumulates historical changes — the backups in `docs/database/migrations/`
  are the historical record

**Workflow for developers:**

```
Feature needs DB change
        ↓
Agent writes SQL → scripts/db-pending-changes.sql
        ↓
Developer copies SQL → Supabase SQL Editor / Docker
        ↓
Developer runs: fish scripts/backup_db.fish
        ↓
Developer moves backup → docs/database/migrations/DD-MM-YYYY/
        ↓
Developer updates docs/database/migrations/README.md
        ↓
Agent resets scripts/db-pending-changes.sql to placeholder
```

---

## Database Restore Guide

See `docs/database/migrations/README.md` for full instructions on how to restore
the database locally with Docker or in a new Supabase project.

### Quick reference — local Docker restore

```bash
# 1. Start container
docker run --name cwb-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=codewithbotina \
  -p 5432:5432 \
  -d postgres:16

# 2. Apply schema (use the latest dated directory)
BACKUP_DATE="09-08-2026"

docker exec -i cwb-db psql -U postgres -d codewithbotina \
  < "docs/database/migrations/${BACKUP_DATE}/blog-codewithbotina-structure-01-tables.sql"

docker exec -i cwb-db psql -U postgres -d codewithbotina \
  < "docs/database/migrations/${BACKUP_DATE}/blog-codewithbotina-structure-02-constraints.sql"

# 3. Apply any pending changes (if db-pending-changes.sql is not empty)
docker exec -i cwb-db psql -U postgres -d codewithbotina \
  < scripts/db-pending-changes.sql

# 4. Verify
docker exec -it cwb-db psql -U postgres -d codewithbotina -c "\dt"
```
