import { describe, it, expect } from 'vitest';
import SignInButton from '../../../src/components/auth/SignInButton.astro';
import { getRenderedHTML } from '../../test-utils';

describe('SignInButton', () => {
  it('renders link to backend Google auth endpoint', async () => {
    const html = await getRenderedHTML(SignInButton);
    expect(html).toContain('/api/auth/google');
  });
});
