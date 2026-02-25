# Authentication API Endpoints

Reference list of authentication endpoints used by the frontend. For full request/response examples, see the primary API doc below.

**Primary API doc:** [../api/authentication-api.md](../api/authentication-api.md)

## Endpoints

1. `GET /api/auth/google` - Initiate Google OAuth sign-in (redirect).
2. `GET /api/auth/callback` - Handle OAuth callback and create session.
3. `GET /api/auth/me` - Return the current authenticated user profile.
4. `POST /api/auth/signout` - Sign out and clear session cookies.
5. `POST /api/auth/refresh` - Refresh access token using refresh token.
