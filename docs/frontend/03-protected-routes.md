# Protected Routes in Astro

Implement client-side protection for routes and features.

## Overview

Astro is static, so use client-side checks:
- Redirect unauthenticated users from protected pages
- Hide/show UI elements based on auth state

## Implementation

Create `frontend/src/middleware/authMiddleware.ts`:

```typescript
// Client-side middleware for protected routes
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/auth/signin';
    return false;
  }
  return true;
}
```

## Protected Pages

- `/profile`: User profile page (requires auth)
- `/admin`: Admin dashboard (requires auth + admin)

## Conditional Rendering

In components:
```astro
{% if session %}
  <CommentsForm />
{% else %}
  <p>Please sign in to comment</p>
{% endif %}
```

---

**Next:** [04-testing.md](./04-testing.md)
