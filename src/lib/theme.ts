import { colors } from '@/theme/colors';

// Appearance kept on this device: the light/dark override and a copy of the
// page background, so both paint before the app has loaded anything. The
// inline script in index.html reads the same keys; keep them in step.
export type ThemePref = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const BACKGROUNDS = ['plain', 'dots', 'staff', 'wash'] as const;
export type Background = (typeof BACKGROUNDS)[number];

const THEME_KEY = 'musicstand:theme';
const BACKGROUND_KEY = 'musicstand:background';

export function isThemePref(value: string | null): value is ThemePref {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isBackground(value: string | null | undefined): value is Background {
  return (BACKGROUNDS as readonly string[]).includes(value ?? '');
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  if (pref === 'system') return systemDark ? 'dark' : 'light';
  return pref;
}

// Storage can be missing or throw (private mode, blocked site data).
export function readThemePref(): ThemePref {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isThemePref(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemePref(pref: ThemePref): void {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Still applied for this visit.
  }
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

// Sets data-theme on <html> and the status bar color to match.
export function applyTheme(pref: ThemePref): void {
  const theme = resolveTheme(pref, systemDark());
  document.documentElement.dataset.theme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = colors[theme].background;
  }
}

// Applies the saved preference now and again whenever the system flips, so
// "System" follows the OS live. Call once at startup.
export function watchSystemTheme(): void {
  applyTheme(readThemePref());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(readThemePref()));
}

export function applyBackground(background: Background): void {
  if (background === 'plain') delete document.documentElement.dataset.bg;
  else document.documentElement.dataset.bg = background;
  try {
    if (background === 'plain') localStorage.removeItem(BACKGROUND_KEY);
    else localStorage.setItem(BACKGROUND_KEY, background);
  } catch {
    // Applied for this visit; the next launch paints plain until settings load.
  }
}
