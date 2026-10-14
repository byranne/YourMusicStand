import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { colors } from './colors';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const [lightCss, darkCss] = css.split('@media (prefers-color-scheme: dark)');

function parseTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/g)) {
    tokens[name] = value.toUpperCase();
  }
  return tokens;
}

// WCAG relative luminance contrast ratio between two #RRGGBB colors.
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(['light', 'dark'] as const)('%s palette', (mode) => {
  const palette = colors[mode];

  it('matches tokens.css', () => {
    expect(parseTokens(mode === 'light' ? lightCss : darkCss)).toEqual(palette);
  });

  it.each([
    ['text', 'background'],
    ['text', 'surface'],
    ['muted', 'background'],
    ['muted', 'surface'],
    ['on-button', 'button'],
    ['on-brand-soft', 'brand-soft'],
    ['on-streak-soft', 'streak-soft'],
    ['danger', 'background'],
    ['danger', 'surface'],
    ['on-status-want', 'status-want'],
    ['on-status-learning', 'status-learning'],
    ['on-status-learned', 'status-learned'],
    ['on-status-shelved', 'status-shelved'],
  ] as const)('%s on %s is readable (AA)', (fg, bg) => {
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
