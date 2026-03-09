# Frontend Session Management

Handle user sessions in Astro frontend.

## Session Storage

- Authentication tokens are stored in first-party HTTP-only cookies set by the backend.
- The frontend keeps a non-sensitive first-party hint (`cwb_auth_state`) plus localStorage fallback only to decide when to bootstrap session checks.
- Access cookies expire after 1 hour; refresh cookies expire after 7 days.

## Automatic Refresh

Implement refresh logic:
- On app load, call `/api/auth/me`; the backend restores the session from the refresh cookie when needed.
- While the app stays open, refresh the session in the background before the 1-hour access token expires.
- If refresh fails, clear the client auth hint and show signed-out UI.

## Session Hooks

Create `frontend/src/hooks/useSession.ts`:

- Get current session
- Subscribe to auth changes
- Handle real-time updates

## Protected Components

Use session to conditionally render:
- Comments form: Only if authenticated
- Reaction buttons: Only if authenticated

## Error Handling

- Invalid token: Redirect to sign-in
- Session expired: Restore from refresh cookie when available, otherwise prompt re-login
