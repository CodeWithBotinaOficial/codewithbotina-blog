import { describe, it, expect } from 'vitest';
import { stripMarkdown } from '../../../src/lib/utils';

describe('stripMarkdown', () => {
  it('removes heading markers', () => {
    expect(stripMarkdown('# Hello')).toBe('Hello');
    expect(stripMarkdown('## World')).toBe('World');
  });

  it('removes bold and italic markers', () => {
    expect(stripMarkdown('**bold**')).toBe('bold');
    expect(stripMarkdown('*italic*')).toBe('italic');
  });

  it('removes links but keeps text', () => {
    expect(stripMarkdown('[link](http://example.com)')).toBe('link');
  });

  it('handles multiple markdown elements', () => {
    const markdown = '# Title\n\nThis is a [link](url) and **bold** text.';
    expect(stripMarkdown(markdown)).toBe('Title\n\nThis is a link and bold text.');
  });

  it('returns empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });
});
