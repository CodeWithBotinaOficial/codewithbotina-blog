import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('SignInButton', () => {
  it('uses same-origin auth proxy for Google sign-in', async () => {
    const filePath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../src/components/auth/SignInButton.astro',
    );
    const html = await readFile(filePath, 'utf-8');
    expect(html).toContain('getAuthRoute("/google")');
    expect(html).not.toContain('api.codewithbotina.com');
  });

  it('disables sign-in and shows a generic message during maintenance', async () => {
    const filePath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../src/components/auth/SignInButton.astro',
    );
    const html = await readFile(filePath, 'utf-8');
    expect(html).toContain('data-auth-maintenance role="status" hidden');
    expect(html).toContain('t(currentLanguage, "maintenance.featureUnavailable", "common")');
    expect(html).toContain('button.disabled = isMaintenanceMode');
    expect(html).toContain('cwb:backend-status-change');
  });
});
