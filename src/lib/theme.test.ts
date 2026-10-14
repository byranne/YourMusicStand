import { describe, expect, it } from 'vitest';

import { isBackground, isThemePref, resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('follows the system by default', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('lets an override win over the system', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('isThemePref / isBackground', () => {
  it('accept only known values', () => {
    expect(isThemePref('dark')).toBe(true);
    expect(isThemePref('sepia')).toBe(false);
    expect(isThemePref(null)).toBe(false);
    expect(isBackground('staff')).toBe(true);
    expect(isBackground('plaid')).toBe(false);
  });
});
