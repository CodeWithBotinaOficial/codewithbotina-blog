# Cookie Consent Implementation

## Overview

This implementation provides a GDPR/CCPA-aligned cookie consent banner with user preferences stored locally and (optionally) persisted to the backend.

Authentication is handled separately with first-party cookies:
- `cwb_access`: HTTP-only, 1 hour
- `cwb_refresh`: HTTP-only, 7 days
- `cwb_pkce`: HTTP-only, 10 minutes
- `cwb_auth_state`: frontend login-state hint, 7 days

## Components

### CookieConsent component
File: `frontend/src/components/CookieConsent.tsx`

- Shows on first visit or when consent version changes.
- Offers three options: accept all, only necessary, or configure.
- Stores preferences in `localStorage`.
- Sends preferences to backend for audit.
- Applies Google Consent Mode if `window.gtag` is present.

## Backend endpoint

`POST /api/cookies/consent`

Stores consent with either `user_id` (if authenticated) or `session_id` (anonymous).

Example payload:
```json
{
  "analytics_cookies": false,
  "marketing_cookies": false,
  "functional_cookies": true,
  "session_id": "..."
}
```

## Database schema (Supabase SQL)

```sql
CREATE TABLE IF NOT EXISTS cookie_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  analytics_cookies BOOLEAN DEFAULT false,
  marketing_cookies BOOLEAN DEFAULT false,
  functional_cookies BOOLEAN DEFAULT true,
  consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  UNIQUE(user_id),
  UNIQUE(session_id)
);

ALTER TABLE cookie_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consent"
  ON cookie_consent FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent"
  ON cookie_consent FOR INSERT
  WITH CHECK (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can update own consent"
  ON cookie_consent FOR UPDATE
  USING (auth.uid() = user_id OR session_id IS NOT NULL);
```

## Consent versioning

The banner uses `CONSENT_VERSION` to re-prompt users when requirements change.

- Stored in `localStorage` as `cookie_consent_version`.
- If the stored version differs, the banner reappears.

## Analytics integration

If Google Analytics is present, the component updates consent state:

```js
window.gtag('consent', 'update', {
  analytics_storage: 'granted',
  ad_storage: 'denied'
});
```

## Testing checklist

- Banner appears on first visit.
- Only necessary keeps analytics disabled.
- Accept all enables analytics (if configured).
- Preferences persist across reloads.
- Backend endpoint accepts consent for anonymous and logged-in users.
- Cookie policy page reflects current behavior.
