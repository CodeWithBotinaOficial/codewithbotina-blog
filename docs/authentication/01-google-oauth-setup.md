# Google OAuth 2.0 Setup Guide

Step-by-step guide to obtain Google OAuth credentials for CodeWithBotina blog authentication.

## Prerequisites
- Google account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Project name: `CodeWithBotina Blog`
4. Organization: (leave blank for personal account)
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. User Type: Select "External" → Click "Create"
3. Fill in required fields:
   - **App name:** CodeWithBotina Blog
   - **User support email:** support@codewithbotina.com
   - **App logo:** (optional, upload your logo)
   - **Application home page:** https://blog.codewithbotina.com
   - **Authorized domains:** 
     - `codewithbotina.com`
     - `supabase.co`
   - **Developer contact:** support@codewithbotina.com
4. Scopes: Add the following scopes:
   - `email`
   - `profile`
   - `openid`
5. Test users: Add your email for testing
6. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: `CodeWithBotina Blog - Production`
5. Authorized JavaScript origins:
   - `https://blog.codewithbotina.com`
   - `http://localhost:4321` (for local development)
6. Authorized redirect URIs:
   - `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
   - `http://localhost:54321/auth/v1/callback` (for local Supabase)
7. Click "Create"

## Step 5: Save Credentials

You will receive:
- **Client ID:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret:** `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

⚠️ **IMPORTANT:** 
- Save these credentials securely
- Never commit them to version control
- Add them to Supabase dashboard (next step)

## Step 6: Add Credentials to Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Find "Google" and toggle it on
3. Paste your credentials:
   - Client ID: (from Step 5)
   - Client Secret: (from Step 5)
4. Click "Save"

## Verification

Test the OAuth flow:
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Invite user" → Use Google sign-in
3. Verify you can sign in with your Google account

---

**Next:** [02-supabase-configuration.md](./02-supabase-configuration.md)

---

## Troubleshooting

### Issue: "Something went wrong" error from Google

**Possible causes:**
- OAuth client is in "Testing" mode (limited to 100 users)
- User email is not in test users list
- Redirect URI mismatch

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Add user email to "Test users" list
3. Or publish app to production (requires verification)

### Issue: Session not persisting after login

**Debug steps:**
1. Check browser DevTools → Application → Cookies
   - Should see `cwb_access` cookie for `.codewithbotina.com`
2. Check browser DevTools → Console for errors
3. Test debug endpoint: `curl https://api.codewithbotina.com/api/auth/debug`
4. Verify Supabase redirect URLs match Google OAuth config

**Common causes:**
- Cookie not being set by backend (check `Set-Cookie` header)
- Cookie domain mismatch (must be `.codewithbotina.com`)
- SameSite set incorrectly (use `Lax`)
- `Secure` flag missing on HTTPS deployments
- Frontend not checking `/api/auth/me` on page load
- Browser privacy shields blocking non-essential cross-site state; keep auth cookies first-party and rely on server-side session checks

### Issue: Google doesn't show account picker

**Solution:** Add `prompt=select_account` to OAuth URL:
```
https://accounts.google.com/o/oauth2/v2/auth?
  prompt=select_account
  &client_id=...
```

---

## Local Development Setup

To test OAuth locally, add these URLs to your Google Cloud Console:

**Authorized JavaScript origins:**
- `http://localhost:4321` (Astro frontend)
- `http://localhost:8000` (Deno backend)

**Authorized redirect URIs:**
- `http://localhost:54321/auth/v1/callback` (local Supabase)

**Local Supabase Setup:**

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Start local Supabase:
```bash
cd backend
supabase start
```

3. Copy local credentials to `.env`:
```bash
# Output will show:
API URL: http://localhost:54321
anon key: eyJhbG...
service_role key: eyJhbG...
```

4. Update `backend/.env` with local credentials
5. Update `frontend/.env` with local API URL
