import { describe, it, expect } from 'vitest';
import { useSession } from '../../../src/hooks/useSession';

describe('useSession', () => {
  it('exports a function', () => {
    expect(typeof useSession).toBe('function');
  });
});
