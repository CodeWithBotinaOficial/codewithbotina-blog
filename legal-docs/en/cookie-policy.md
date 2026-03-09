# CodeWithBotina Cookie Policy

**Last updated:** March 3, 2026

## What are cookies?

Cookies are small text files stored on your device when you visit a website. They are widely used to make sites work efficiently and to provide information to site owners.

## What cookies do we use?

### 1. Strictly Necessary Cookies

These cookies are essential for the site to function and cannot be disabled.

| Cookie | Purpose | Duration |
|--------|---------|----------|
| `cwb_access` | HTTP-only access token for authenticated API requests | 1 hour |
| `cwb_refresh` | HTTP-only refresh token used to restore and renew the session | 7 days |
| `cwb_pkce` | Temporary PKCE verifier used only during Google OAuth | 10 minutes |
| `cwb_auth_state` | First-party login state hint used by the frontend to bootstrap the session after redirects and browser restarts | 7 days |
| `session_id` | Anonymous session identifier for cookie consent records | Session |
| `cookie_consent` | Cookie preferences | 1 year |

### 2. Analytics Cookies (Optional)

Help us understand how visitors use the site. **They require your consent.**

| Cookie | Purpose | Duration | Provider |
|--------|---------|----------|----------|
| `_ga` | Google Analytics - distinguish users | 2 years | Google |
| `_gid` | Google Analytics - distinguish users | 24 hours | Google |
| `_gat` | Google Analytics - throttle requests | 1 minute | Google |

Data collected by Google Analytics:
- Pages visited
- Time on site
- Traffic source (search, social, etc.)
- Device and browser
- Approximate location (country/city)

### 3. Marketing Cookies (Optional)

We currently **do not** use marketing or advertising cookies.

## How to manage cookies

### Via our consent banner

1. Shown automatically on your first visit
2. You can choose:
   - **Accept all**
   - **Only necessary**
   - **Configure**

### Change preferences later

You can change your preferences at any time:
1. Click the cookie icon in the bottom-right corner
2. Or visit: https://blog.codewithbotina.com/cookie-settings

### Via your browser

You can block or delete cookies in your browser settings.

## Third-party cookies

We use third-party services that may set their own cookies:

- Supabase (authentication): https://supabase.com/privacy
- Google OAuth (authentication): https://policies.google.com/technologies/cookies
- Cloudflare (CDN and security): https://www.cloudflare.com/cookie-policy/

## International transfers

Some providers operate globally. Your data may be processed outside Colombia, including in the US and EU, in compliance with GDPR and CCPA.

## Data retention

- Access token cookie: 1 hour
- Refresh token cookie: 7 days
- OAuth PKCE cookie: 10 minutes
- Frontend auth state hint: 7 days
- Analytics cookies: up to 2 years
- Preferences: 1 year

## Browser compatibility

Authentication cookies are configured as first-party cookies with `Path=/`, `SameSite=Lax`, and `Secure` on HTTPS. Sensitive tokens are marked `HttpOnly`, and the frontend determines login state by calling the server rather than reading those cookies directly.

## Your rights

You have the right to accept or reject non-essential cookies, change your preferences, delete stored cookies, and withdraw consent at any time.

## Policy updates

We may update this policy. Significant changes will be notified on the website or via email.

**Last review:** March 5, 2026
**Version:** 1.0

## Contact

**Email:** support@codewithbotina.com  
**Web:** https://codewithbotina.com
