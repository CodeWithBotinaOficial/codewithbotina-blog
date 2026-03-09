import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuth } from '../../src/hooks/useAuth';

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'token',
            refresh_token: 'refresh',
          },
        },
      }),
      signOut: vi.fn().mockResolvedValue({}),
      setSession: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe('Auth flow', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, assign },
      writable: true,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }))));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('signIn redirects to backend auth endpoint', () => {
    const { signIn } = useAuth();
    signIn();
    expect(window.location.assign).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/google?next='),
    );
  });

  it('signOut calls backend signout and redirects', async () => {
    const { signOut } = useAuth();
    await signOut();
    expect(fetch).toHaveBeenCalledWith('/api/auth/signout', {
      method: 'POST',
      credentials: 'include',
    });
    expect(window.location.assign).toHaveBeenCalledWith('/');
  });
});
