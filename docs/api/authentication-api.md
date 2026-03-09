# Authentication API Documentation

Base URL: `https://api.codewithbotina.com`

## Authentication Flow

### 1. Initiate Google Sign-In

**Endpoint:** `GET /api/auth/google`

**Description:** Redirects user to Google OAuth consent screen.

**Query Parameters:**
- `next` (optional): URL to redirect to after authentication

**Request:**
```bash
curl "https://api.codewithbotina.com/api/auth/google?next=https%3A%2F%2Fblog.codewithbotina.com%2Fposts%2Fmy-post"
```

**Response:** HTTP 302 Redirect to Google OAuth

---

### 2. Google Callback (Automatic)

**Endpoint:** `GET /api/auth/callback`

**Description:** Google redirects here after user grants permission. Backend exchanges code for tokens.

**Process:**
1. Backend receives authorization code from Google
2. Exchanges code for access_token + refresh_token via Supabase
3. Sets first-party cookies:
   - `cwb_access` (HTTP-only, 1 hour)
   - `cwb_refresh` (HTTP-only, 7 days)
   - `cwb_auth_state` (frontend hint, 7 days)
4. Redirects to frontend: `https://blog.codewithbotina.com/auth/success`

**Response:** HTTP 302 Redirect to frontend

---

### 3. Get Current User

**Endpoint:** `GET /api/auth/me`

**Description:** Returns current authenticated user's profile.

This endpoint is the authoritative session check for the frontend. If the access token is missing or expired but a valid `cwb_refresh` cookie is present, the backend refreshes the session server-side and returns the user in the same request.

**Authentication:**
- Preferred: first-party cookies sent with `credentials: include`
- Optional: `Authorization: Bearer {access_token}`

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.codewithbotina.com/api/auth/me
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "diego@example.com",
    "full_name": "Diego Alejandro Botina",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "google_id": "1234567890",
    "created_at": "2026-02-01T10:00:00Z",
    "last_login": "2026-02-07T15:30:00Z",
    "is_admin": false
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

### 4. Sign Out

**Endpoint:** `POST /api/auth/signout`

**Description:** Invalidates user session and clears cookies.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.codewithbotina.com/api/auth/signout
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

---

### 5. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Refreshes access token using refresh token (automatic).

**Body:**
```json
{
  "refresh_token": "v1.MR..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "access_token": "eyJhbG...",
  "refresh_token": "v1.MR...",
  "expires_in": 3600
}
```

---

## Error Responses

All endpoints follow this error format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {
    "field": "Specific error for field"
  }
}
```

**Common Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Rate Limiting

- **Sign-in:** 6 attempts per hour per IP
- **Sign-up:** 4 attempts per hour per IP
- **API calls:** 100 requests per hour per user

---

## Session Management

- **Access cookie duration:** 1 hour
- **Refresh cookie duration:** 7 days
- **Refresh behavior:** `GET /api/auth/me` restores from the refresh cookie when possible; `POST /api/auth/refresh` is available for explicit/background refresh
- **Storage:** first-party cookies with `SameSite=Lax`; token cookies are HTTP-only and `Secure` on HTTPS
- **Expiry:** user must re-authenticate after the refresh token expires or after sign-out

---

**Next Steps:**
- Implement frontend authentication components
- Add protected routes
- Implement reaction and comment APIs
