import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('SignInButton', () => {
  it('references backend Google auth endpoint', async () => {
    const filePath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../src/components/auth/SignInButton.astro',
    );
    const html = await readFile(filePath, 'utf-8');
    expect(html).toContain('/api/auth/google');
  });
});
