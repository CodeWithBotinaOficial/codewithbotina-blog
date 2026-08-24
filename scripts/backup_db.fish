#!/usr/bin/env fish

# Define variables to keep the command clean
set timestamp (date +%d-%m-%Y-%H-%M)
set prefix "blog-codewithbotina-structure"
set db_host "aws-1-sa-east-1.pooler.supabase.com"
set db_user "postgres.fnxnsgtdbswvuqeuvgio"

# 1. Pre-flight check: Ensure the password is set
if not set -q DB_PASSWORD
    echo "ERROR: DB_PASSWORD environment variable is not set." >&2
    echo "Please export your password before running the script: set -x DB_PASSWORD 'your_new_password'" >&2
    exit 1
end

echo "Starting two-phase backup process..."

# Phase 1: Skeletons (Tables, Views, Sequences)
# This can be executed first without foreign key conflicts.
echo "Running Phase 1: Extracting pre-data schema..."
docker run --rm \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:17-alpine \
  pg_dump \
  -h $db_host -p 5432 -U $db_user -d postgres \
  --schema-only --clean --if-exists --no-owner --no-privileges \
  --section=pre-data \
  > "$prefix-01-tables-$timestamp.sql"

# Error handling for Phase 1
if test $status -ne 0
    echo "ERROR: Phase 1 backup failed. Check your database connection and credentials." >&2
    # Clean up the potentially empty or corrupted output file
    rm -f "$prefix-01-tables-$timestamp.sql"
    exit 1
end

echo "Phase 1 completed successfully: $prefix-01-tables-$timestamp.sql"

# Phase 2: Connections (Foreign Keys, Indexes, Triggers)
# Executed after Phase 1 to connect everything.
echo "Running Phase 2: Extracting post-data constraints..."
docker run --rm \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:17-alpine \
  pg_dump \
  -h $db_host -p 5432 -U $db_user -d postgres \
  --schema-only --clean --if-exists --no-owner --no-privileges \
  --section=post-data \
  > "$prefix-02-constraints-$timestamp.sql"

# Error handling for Phase 2
if test $status -ne 0
    echo "ERROR: Phase 2 backup failed." >&2
    # Clean up the potentially empty or corrupted output file
    rm -f "$prefix-02-constraints-$timestamp.sql"
    exit 1
end

echo "Phase 2 completed successfully: $prefix-02-constraints-$timestamp.sql"
echo "Backup finished successfully."
