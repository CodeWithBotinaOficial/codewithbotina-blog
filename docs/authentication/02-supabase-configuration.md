# Supabase Authentication Configuration

Configure Supabase to work with Google OAuth and manage sessions.

## Step 1: Session Settings

1. Go to Supabase Dashboard → Authentication → Configuration
2. Configure the following:

**JWT Settings:**
- JWT expiry: `604800` seconds (7 days)
- Enable refresh token rotation: ✅ Yes

**Security:**
- Enable email confirmations: ❌ No (using Google OAuth)
- Enable phone confirmations: ❌ No
- Enable email OTP: ❌ No

**Site URL:**
- Production: `https://blog.codewithbotina.com`
- Development: `http://localhost:4321`

**Redirect URLs (allowed):**
- `https://blog.codewithbotina.com/auth/callback`
- `http://localhost:4321/auth/callback`

## Step 2: Enable Google Provider

Already done in previous step, but verify:
- Authentication → Providers → Google: ✅ Enabled

## Step 3: Configure Email Templates (Optional)

Since we're using Google OAuth, email templates are not needed. However, if you want to send welcome emails:

1. Authentication → Email Templates
2. Customize "Confirm signup" template (if needed)

## Step 4: Configure Rate Limiting

Prevent abuse:
- Max sign-in attempts: 6 per hour per IP
- Max sign-up attempts: 4 per hour per IP

## Step 5: Get Supabase Credentials

You'll need these for the backend:

1. Go to Settings → API
2. Copy:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbG...` (for frontend)
   - **service_role secret:** `eyJhbG...` (for backend)

⚠️ **SECURITY:**
- Frontend uses `anon public` key (safe to expose)
- Backend uses `service_role` key (never expose to client)

## Environment Variables

**Backend (`backend/.env`):**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_ANON_KEY=eyJhbG...
```

**Frontend (`frontend/.env`):**
```bash
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
PUBLIC_API_URL=https://api.codewithbotina.com
```

---

## Production Configuration (CodeWithBotina)

**Current Setup (verified 2026-02-25):**

### Google Cloud Console:
- Project: CodeWithBotina Blog - Production
- Client ID: `106801449223-uuc67njk3hqdpa87d0vncft6438dg3lm.apps.googleusercontent.com`
- Authorized JavaScript origins:
  - `https://blog.codewithbotina.com`
  - `http://localhost:4321` (development)
- Authorized redirect URIs:
  - `https://fnxnsgtdbswvuqeuvgio.supabase.co/auth/v1/callback`
  - `http://localhost:54321/auth/v1/callback` (local Supabase)

### Supabase Dashboard:
- Project URL: `https://fnxnsgtdbswvuqeuvgio.supabase.co`
- Site URL: `https://blog.codewithbotina.com`
- Redirect URLs:
  - `http://localhost:4321/auth/callback` (development)
  - `https://blog.codewithbotina.com/**` (wildcard for all routes)

**IMPORTANT:** After Google OAuth callback, Supabase will redirect to the frontend Site URL. The frontend must retrieve the session with `supabase.auth.getSession()` after redirect.

### OAuth Flow:
1. User clicks "Sign in with Google" → Redirects to Google
2. User selects account → Google redirects to Supabase callback
3. Supabase exchanges code for tokens → Creates session
4. Supabase redirects to frontend Site URL (blog.codewithbotina.com)
5. Frontend must retrieve session from Supabase client

**Next:** [03-database-schema.md](./03-database-schema.md)
