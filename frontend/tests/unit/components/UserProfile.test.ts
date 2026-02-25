import { describe, it, expect } from 'vitest';
import UserProfile from '../../../src/components/auth/UserProfile.astro';
import { getRenderedHTML } from '../../test-utils';

describe('UserProfile', () => {
  it('renders profile wrapper', async () => {
    const html = await getRenderedHTML(UserProfile);
    expect(html).toContain('auth-profile');
  });
});
