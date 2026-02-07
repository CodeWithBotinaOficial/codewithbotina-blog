import { describe, it, expect } from 'vitest';
import { supabase } from '../../../src/lib/supabase';

describe('Supabase Client', () => {
  it('is initialized', () => {
    expect(supabase).toBeDefined();
  });

  it('can fetch posts', async () => {
    const { data, error } = await supabase.from('posts').select('*').limit(1);
    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });
});
