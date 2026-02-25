# Frontend Authentication Integration Guide

Guide to integrate Google OAuth authentication in the Astro frontend.

## Prerequisites
- Backend authentication system implemented
- Supabase client library installed in frontend
- Environment variables configured

## Step 1: Install Dependencies

In `frontend/` run:

```bash
npm install @supabase/supabase-js
npm install --save-dev typescript  # If not already set up
```

## Step 2: Configure Supabase Client

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storageKey: 'CodeWithBotinaAuth',
      storage: localStorage,
      flowType: 'pkce'
    }
  }
);
```

## Step 3: Environment Variables

Update `frontend/.env`:

```bash
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
PUBLIC_API_URL=https://api.codewithbotina.com
PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

## Step 4: Implement Authentication Flow

1. **Sign-In Button:** Redirect to backend `/api/auth/google`
2. **Callback Handling:** Handle redirect from backend to `/auth/success`
3. **Session Check:** On page load, check for active session

## Preserving Original Page with ?next

When starting login from any page/post, append the current URL:

```
/api/auth/google?next=https%3A%2F%2Fblog.codewithbotina.com%2Fposts%2Fmy-post
```

Backend should pass `next` through callback, and frontend should redirect after success.

## Global Header Authentication UI

Add global auth controls in the header:
- Logged out: “Sign in with Google”
- Logged in: avatar + name + sign out

## Verification

1. Click "Sign in with Google" → Redirect to Google
2. Grant permission → Redirect back to frontend
3. Verify user profile displays
4. Sign out → Session cleared

---

**Next:** [Frontend Components Documentation](../frontend/01-auth-components.md)
