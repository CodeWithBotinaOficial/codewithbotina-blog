# GitHub Actions Cron — Scheduled Post Publishing Setup

## Overview

The scheduled post publishing system uses a GitHub Actions workflow that runs every 5 minutes and calls the backend to publish posts whose scheduled time has arrived. This guide walks through the complete setup process.

## Architecture

- **Cron Frequency**: Every 5 minutes (`*/5 * * * *`)
- **Timezone**: UTC (GitHub Actions always uses UTC)
- **Endpoint Called**: `GET /api/posts/publish-scheduled` on your backend
- **Authentication**: Bearer token (CRON_SECRET)
- **Supabase Region**: sa-east-1 (Sao Paulo, UTC-3) — all DB timestamps in UTC
- **Deno Deploy**: United States — all runtime in UTC

All timestamps are compared in UTC, so timezone differences between GitHub/Deno/Supabase don't affect correctness.

## Required Setup Steps

### Step 1: Generate the CRON_SECRET

Generate a secure random secret that will be used to authenticate the cron calls.

#### On macOS/Linux:
```bash
openssl rand -hex 32
```

Copy the output — you will use it in the next steps. Example output:
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

### Step 2: Add secrets to GitHub repository

1. Go to your GitHub repository: `https://github.com/your-username/codewithbotina-blog`
2. Click **Settings** (top menu bar)
3. Click **Secrets and variables** in the left sidebar
4. Click **Actions**
5. Click **New repository secret** button
6. Add these secrets:

| Name | Value | Notes |
|------|-------|-------|
| `CRON_SECRET` | The hex string from Step 1 | Must match exactly in Deno Deploy |
| `BACKEND_URL` | Your Deno Deploy URL | e.g., `https://your-api.deno.dev` (no trailing slash) |

### Step 3: Add CRON_SECRET to Deno Deploy

1. Go to https://dash.deno.com
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add this variable:

| Name | Value | Notes |
|------|-------|-------|
| `CRON_SECRET` | Same hex string from Step 1 | Must match GitHub secret exactly |

### Step 4: Verify the workflow file exists

The workflow file should already exist at `.github/workflows/publish-scheduled-posts.yml`. Verify:

```bash
cat .github/workflows/publish-scheduled-posts.yml
```

You should see:
- `on: schedule: - cron: '*/5 * * * *'` (runs every 5 minutes)
- `workflow_dispatch:` (allows manual trigger for testing)

If the file doesn't exist, create it by copying from the repository template.

### Step 5: Verify the workflow is on the main branch

The cron workflow ONLY runs from the **default branch** (main). Verify it was merged:

```bash
git log --oneline main | head -5
# Should show recent commits including .github/workflows/publish-scheduled-posts.yml
```

If you don't see it, merge the feature branch to main:

```bash
git checkout main
git pull origin main
git merge origin/feat/scheduled-post-publishing
git push origin main
```

### Step 6: Check the Actions tab

Give GitHub a few minutes to index the workflow (up to 15-20 minutes for new workflows).

1. Go to your GitHub repository
2. Click **Actions** (top menu bar)
3. Look for **Publish Scheduled Posts** in the left sidebar

If you don't see it yet, wait 15–20 minutes and refresh.

### Step 7: Trigger manually to test

Before waiting for the automatic cron to run, test manually:

1. Click **Actions** in your GitHub repository
2. Click **"Publish Scheduled Posts"** in the left sidebar
3. Click **"Run workflow"** button
4. Confirm it runs on the **main** branch
5. Click **"Run workflow"**
6. Watch the run execute

**What to expect:**

- If successful (green checkmark): Shows HTTP 200
- If CRON_SECRET mismatch: Shows HTTP 401
- If BACKEND_URL is wrong: Shows HTTP 404
- If backend error: Shows HTTP 500 with logs

#### If you see 401 (Unauthorized):
```
CRON_SECRET in GitHub Secrets doesn't match CRON_SECRET in Deno Deploy
```

**Fix**: Regenerate the secret and update both places:
```bash
openssl rand -hex 32  # Generate new secret
# Update GitHub Secrets with new value
# Update Deno Deploy Environment Variables with same value
```

#### If you see 404 (Not Found):
```
BACKEND_URL is incorrect or endpoint doesn't exist
```

**Fix**: Verify BACKEND_URL:
- Should be: `https://your-api.deno.dev` (no trailing slash)
- NOT: `https://your-api.deno.dev/` (with trailing slash)
- Endpoint path should be: `/api/posts/publish-scheduled`

#### If you see 500 (Internal Server Error):
```
Check Deno Deploy logs for the actual error
```

**Fix**: 
1. Go to https://dash.deno.com
2. Select your project
3. Click **Logs** tab
4. Look for recent errors
5. Common issues:
   - CRON_SECRET env variable not set in Deno Deploy
   - Database connection error
   - Missing endpoint handler

### Step 8: Verify cron is active

After the first successful manual run, the automatic cron should activate. To verify:

1. Go to **Actions** → **"Publish Scheduled Posts"** in your GitHub repo
2. Click the **"Schedule"** label
3. Look for a clock icon (⏰) — it indicates the cron is active
4. The workflow should show a list of scheduled runs

If the clock icon doesn't appear, wait another 5-10 minutes and refresh.

## Monitoring

Once active, you can monitor the cron workflow:

### View runs in GitHub Actions
1. Go to **Actions** → **"Publish Scheduled Posts"**
2. You should see runs at 5-minute intervals
3. Click any run to see details and logs

### View backend logs in Deno Deploy
1. Go to https://dash.deno.com → your project
2. Click **Logs**
3. Filter by the cron endpoint: `/api/posts/publish-scheduled`

### Check scheduled posts in the database
```sql
-- List all scheduled posts
SELECT id, titulo, slug, status, scheduled_at
FROM posts
WHERE status = 'scheduled'
ORDER BY scheduled_at ASC;

-- List posts that should have been published (past their scheduled_at time)
SELECT id, titulo, slug, status, scheduled_at
FROM posts
WHERE status = 'scheduled'
AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC;
```

## Troubleshooting

### Workflow not appearing in Actions tab

**Problem**: You don't see "Publish Scheduled Posts" in the Actions sidebar at all.

**Solution**:
1. Ensure the file exists: `.github/workflows/publish-scheduled-posts.yml`
2. Ensure it's on the **main** branch, not a feature branch
3. Wait 15-20 minutes for GitHub to index it
4. Try pushing a new commit to trigger indexing: `git commit --allow-empty -m "Trigger workflow indexing" && git push`

### Workflow runs but shows 401 (Unauthorized)

**Problem**: The workflow runs and returns HTTP 401.

**Cause**: CRON_SECRET doesn't match between GitHub and Deno Deploy.

**Solution**:
```bash
# Step 1: Generate new secret
openssl rand -hex 32
# Copy the output

# Step 2: Update GitHub Secrets
# Go to Settings → Secrets and variables → Actions
# Edit CRON_SECRET with the new value

# Step 3: Update Deno Deploy
# Go to dash.deno.com → project → Settings → Environment Variables
# Update CRON_SECRET with the same new value

# Step 4: Test manually
# Go to Actions → "Publish Scheduled Posts" → Run workflow
```

### Workflow runs but shows 404 (Not Found)

**Problem**: The workflow runs and returns HTTP 404.

**Cause**: BACKEND_URL is incorrect or the endpoint doesn't exist.

**Solution**:
1. Verify BACKEND_URL in GitHub Secrets:
   - Should be: `https://your-api.deno.dev`
   - NOT: `https://your-api.deno.dev/`
   - NO path component — just the domain
2. Verify the backend has the endpoint at `/api/posts/publish-scheduled`
3. Check Deno Deploy logs to see actual error
4. Test the URL manually:
   ```bash
   BACKEND_URL="https://your-api.deno.dev"
   CRON_SECRET="your-hex-secret"
   curl -v -H "Authorization: Bearer $CRON_SECRET" "$BACKEND_URL/api/posts/publish-scheduled"
   ```

### Workflow runs but shows 500 (Internal Server Error)

**Problem**: The workflow runs and returns HTTP 500.

**Cause**: Backend error — check Deno Deploy logs.

**Solution**:
1. Go to https://dash.deno.com
2. Select your project
3. Click **Logs** tab
4. Look for recent errors around the time of the workflow run
5. Common issues:
   - CRON_SECRET environment variable not set in Deno Deploy
   - Database connection error
   - Missing `backend/routes/api/posts/publish-scheduled.ts`
6. Check the endpoint is actually implemented:
   ```bash
   cat backend/routes/api/posts/publish-scheduled.ts
   # Should exist and export a handler
   ```

### Cron stops running after 60 days of inactivity

**Problem**: GitHub Actions cron stops running after 60 days of repository inactivity.

**Cause**: GitHub's automatic disable for stale workflows.

**Solution**:
1. Go to **Actions** → **"Publish Scheduled Posts"**
2. You'll see a yellow banner: "This workflow is disabled"
3. Click **"Enable workflow"** button

To prevent this:
- Push at least one commit every 60 days to keep the repo active
- Or manually re-enable the workflow if it gets disabled

## Manual Publishing (Emergency Override)

If the cron is not available, you can trigger publishing manually:

```bash
#!/bin/bash
BACKEND_URL="https://your-api.deno.dev"
CRON_SECRET="your-hex-secret"

curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  "$BACKEND_URL/api/posts/publish-scheduled"

# Example output:
# {"success":true,"data":{"published_count":2},"message":"Posts published successfully"}
```

Or manually via GitHub Actions:
1. Go to **Actions** → **"Publish Scheduled Posts"**
2. Click **"Run workflow"**
3. Confirm branch is **main**
4. Click **"Run workflow"**

## Verifying Everything Works

### Checklist:

- [ ] CRON_SECRET generated with `openssl rand -hex 32`
- [ ] CRON_SECRET added to GitHub Secrets
- [ ] CRON_SECRET added to Deno Deploy Environment Variables
- [ ] BACKEND_URL added to GitHub Secrets (format: `https://your-api.deno.dev`)
- [ ] `.github/workflows/publish-scheduled-posts.yml` exists and is merged to main
- [ ] Manual workflow run succeeds (Status: green checkmark)
- [ ] Automatic cron appears in Actions tab (check for clock icon)
- [ ] At least one scheduled post is in the database with `status='scheduled'` and `scheduled_at` in the future

### Test with a scheduled post:

1. Create a post in the admin panel
2. Set a scheduled date 5 minutes from now
3. Save the post (status should be 'scheduled')
4. Wait for the next cron run (every 5 minutes)
5. Check if the post status changed to 'published'
6. Verify it appears on the public blog

## FAQ

**Q: Why doesn't the cron run on forked repositories?**  
A: GitHub disables scheduled workflows on forks for security. To test on a fork, use manual `workflow_dispatch` triggers instead.

**Q: Can I change the cron frequency?**  
A: Yes, edit `.github/workflows/publish-scheduled-posts.yml` and change the cron expression `*/5 * * * *` to your desired schedule. Examples:
- Every minute: `* * * * *`
- Every hour: `0 * * * *`
- Every 10 minutes: `*/10 * * * *`

**Q: What happens if a scheduled post is edited after scheduling?**  
A: The scheduled_at timestamp is preserved. If you want to unschedule, set scheduled_at to null and status back to 'draft' in the edit form.

**Q: Can multiple posts publish at the exact same time?**  
A: Yes, if they have the same scheduled_at timestamp, the cron endpoint will publish all of them in one call.

**Q: What if the cron fails to publish a post?**  
A: The backend logs the error in Deno Deploy. The post stays in 'scheduled' status and the cron will retry on the next run (every 5 minutes). Check the logs to see why it failed.

## Support

For issues, check:
1. GitHub Actions logs: **Actions** → workflow name → run details
2. Deno Deploy logs: https://dash.deno.com → project → **Logs**
3. Database: Check posts table for status and scheduled_at values
4. Endpoint test: Use `curl` command from "Manual Publishing" section above
