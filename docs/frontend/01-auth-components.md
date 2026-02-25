# Authentication Components in Astro

Documentation for UI components handling authentication.

## Components Overview

- `SignInButton.astro`: Initiates Google sign-in
- `SignOutButton.astro`: Handles sign-out
- `UserProfile.astro`: Displays user info (avatar, name, etc.)
- `AuthProvider.astro`: Wraps app for session context

## SignInButton.astro

**Usage:**
```astro
<SignInButton />
```

**Implementation Notes:**
- Redirects to `${PUBLIC_API_URL}/api/auth/google`
- Shows "Sign in with Google" button if not authenticated

## SignOutButton.astro

**Usage:**
```astro
<SignOutButton />
```

**Implementation Notes:**
- Calls backend `/api/auth/signout`
- Clears local session
- Redirects to home page

## UserProfile.astro

**Usage:**
```astro
<UserProfile />
```

**Implementation Notes:**
- Fetches user data from `/api/auth/me`
- Displays avatar, name, email
- Shows admin badge if applicable

## AuthProvider.astro

**Usage:** Wrap in layout:
```astro
<AuthProvider>
  {children}
</AuthProvider>
```

**Implementation Notes:**
- Uses Supabase auth listener
- Provides session context via Astro slots or context API

---

**Next:** [02-session-management.md](./02-session-management.md)
