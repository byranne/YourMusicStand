import { describe, expect, it } from 'vitest';

import {
  fileTitle,
  formatFileSize,
  linkTitle,
  normalizeLink,
  sortResources,
  storagePathFor,
  type Resource,
} from './resources';

describe('normalizeLink', () => {
  it('keeps full web links', () => {
    expect(normalizeLink('https://www.songsterr.com/a/wsa/oasis-wonderwall-tab-s1')).toBe(
      'https://www.songsterr.com/a/wsa/oasis-wonderwall-tab-s1',
    );
    expect(normalizeLink('  http://example.com/tab  ')).toBe('http://example.com/tab');
  });

  it('adds https:// when the scheme is missing', () => {
    expect(normalizeLink('youtube.com/watch?v=abc')).toBe('https://youtube.com/watch?v=abc');
    expect(normalizeLink('example.com:8080/tab')).toBe('https://example.com:8080/tab');
  });

  it('refuses anything that is not a web link', () => {
    expect(normalizeLink('javascript:alert(1)')).toBeNull();
    expect(normalizeLink('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(normalizeLink('mailto:me@example.com')).toBeNull();
    expect(normalizeLink('ftp://example.com/tab.pdf')).toBeNull();
  });

  it('refuses text that is not a link', () => {
    expect(normalizeLink('')).toBeNull();
    expect(normalizeLink('wonderwall')).toBeNull();
    expect(normalizeLink('my tab link')).toBeNull();
    expect(normalizeLink(`example.com/${'a'.repeat(2000)}`)).toBeNull();
  });
});

describe('linkTitle', () => {
  it('names a link after its site', () => {
    expect(linkTitle('https://www.youtube.com/watch?v=abc')).toBe('youtube.com');
    expect(linkTitle('https://tabs.ultimate-guitar.com/tab/1')).toBe('tabs.ultimate-guitar.com');
  });
});

describe('fileTitle', () => {
  it('uses the file name, with a fallback and a length cap', () => {
    expect(fileTitle(' solo.pdf ')).toBe('solo.pdf');
    expect(fileTitle('')).toBe('File');
    expect(fileTitle('a'.repeat(300))).toHaveLength(200);
  });
});

describe('formatFileSize', () => {
  it('picks a readable unit', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(350 * 1024)).toBe('350 KB');
    expect(formatFileSize(1.25 * 1024 * 1024)).toBe('1.3 MB');
  });
});

describe('storagePathFor', () => {
  it('puts the file under the owner and entry, keeping only the extension', () => {
    expect(storagePathFor('user-1', 'entry-1', 'Solo Section (v2).PDF', 'abc')).toBe('user-1/entry-1/abc.pdf');
  });

  it('never lets the file name shape the path', () => {
    expect(storagePathFor('user-1', 'entry-1', '../../other-user/x', 'abc')).toBe('user-1/entry-1/abc');
    expect(storagePathFor('user-1', 'entry-1', 'tab.gp/../../x', 'abc')).toBe('user-1/entry-1/abc');
    expect(storagePathFor('user-1', 'entry-1', 'no-extension', 'abc')).toBe('user-1/entry-1/abc');
  });
});

describe('sortResources', () => {
  it('orders by when they were added, oldest first, without mutating', () => {
    const resource = (id: string, created_at: string) => ({ id, created_at }) as Resource;
    const resources = [resource('b', '2026-10-02T00:00:00Z'), resource('a', '2026-10-01T00:00:00Z')];
    expect(sortResources(resources).map((r) => r.id)).toEqual(['a', 'b']);
    expect(resources[0].id).toBe('b');
  });
});
