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
