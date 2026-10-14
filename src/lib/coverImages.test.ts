import { describe, expect, it } from 'vitest';

import { coverCacheKey } from './coverImages';

describe('coverCacheKey', () => {
  it('drops the token from a signed Storage link', () => {
    const signed = 'https://abc.supabase.co/storage/v1/object/sign/resources/u1/covers/x.jpg?token=one';
    const resigned = 'https://abc.supabase.co/storage/v1/object/sign/resources/u1/covers/x.jpg?token=two';
    expect(coverCacheKey(signed)).toBe('https://abc.supabase.co/storage/v1/object/sign/resources/u1/covers/x.jpg');
    expect(coverCacheKey(resigned)).toBe(coverCacheKey(signed));
  });

  it('keeps other links as they are', () => {
    const caa = 'https://coverartarchive.org/release/abc/front-250';
    expect(coverCacheKey(caa)).toBe(caa);
    expect(coverCacheKey('https://example.com/a.jpg?size=2')).toBe('https://example.com/a.jpg?size=2');
  });
});
