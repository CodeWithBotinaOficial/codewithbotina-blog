# Frontend Session Management

Handle user sessions in Astro frontend.

## Session Storage

- Use Supabase's built-in session management
- Persist in localStorage (key: 'CodeWithBotinaAuth')
- 7-day expiry with auto-refresh

## Automatic Refresh

Implement refresh logic:
- On app load, check session expiry
- If near expiry, call backend `/api/auth/refresh`
- Update session with new tokens

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
- Session expired: Auto-refresh or prompt re-login

