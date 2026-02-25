# Authentication Troubleshooting

Common issues and fixes for Google OAuth + Supabase Auth.

## Supabase project URL shown in Google consent screen

**Problem:** The Google consent screen shows `your-project.supabase.co` instead of a branded domain.

**Cause:** Supabase Auth uses the project URL as the OAuth client domain.

**Fix (Recommended):**
1. Configure a custom domain for Supabase Auth (e.g. `auth.codewithbotina.com`).
2. In Supabase Dashboard → Settings → Custom Domains:
   - Add `auth.codewithbotina.com` and follow DNS instructions (CNAME).
3. After activation:
   - Update `SUPABASE_URL` in backend and frontend to the custom domain.
   - Ensure Google OAuth consent screen uses the custom domain.

**Result:** The consent screen will display `auth.codewithbotina.com` instead of the raw Supabase URL.

---

## "Something went wrong" after entering email

**Problem:** OAuth flow intermittently fails right after entering an email.

**Common Causes & Fixes:**
1. **OAuth Consent Screen not verified**
   - If the app isn’t verified, only test users can sign in.
   - Add all test emails in Google Cloud Console → OAuth Consent Screen → Test users.
2. **Redirect URI mismatch**
   - Ensure Google OAuth redirect URIs include:
     - `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
     - `https://auth.codewithbotina.com/auth/v1/callback` (if using custom domain)
3. **Supabase Site URL / Redirect URLs**
   - Supabase Dashboard → Authentication → URL Configuration:
     - Site URL: `https://blog.codewithbotina.com`
     - Additional Redirect URLs: `https://blog.codewithbotina.com/**`
4. **Rate limits / throttling**
   - Temporarily increase sign-in rate limits in Supabase during testing.

---

## Login redirects always to home instead of original page

**Problem:** User logs in from a blog post but gets redirected to `/`.

**Fix:**
- Add `?next=...` when starting the login flow.
- Pass `next` through backend → callback → frontend success page.
- On `/auth/success`, validate `next` and redirect back.

**Implementation summary:**
- Frontend sign-in button: `/api/auth/google?next={encoded URL}`
- Backend callback: append `next` to `/auth/success`
- Frontend success page: redirect to `next` if valid

---

## PKCE / Cookie Issues

**Problem:** OAuth fails or session is not created.

**Fixes:**
- Ensure `flowType: 'pkce'` in Supabase client.
- Ensure PKCE cookie is written and read by backend `/api/auth/callback`.
- Cookies must be `HttpOnly` and match the correct domain.

---

## Security Notes

- Validate `next` URLs on the backend. Only allow redirects to `https://blog.codewithbotina.com/`.
- Never expose `service_role` keys in the frontend.
- Use PKCE flow for OAuth (Supabase JS handles this with `flowType: 'pkce'`).
