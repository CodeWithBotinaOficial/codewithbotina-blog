# Frontend Authentication Testing

Guide for testing frontend auth integration.

## Tools

- Vitest for unit/integration tests
- Playwright for E2E tests

## Install Dependencies

```bash
npm install -D vitest @vitest/ui playwright
```

## Unit Tests

Test components:
- SignInButton renders correctly
- UserProfile displays data
- Session hooks return expected values

## Integration Tests

- Mock Supabase session
- Test auth flow redirects

## E2E Tests

- Simulate Google sign-in (mock if needed)
- Verify session persistence
- Test sign-out
- Test protected routes access

## Coverage Goals

- 80% component coverage
- All auth flows tested

