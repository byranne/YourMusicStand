import { useCallback, useSyncExternalStore } from 'react';

import { markSeen, pauseSession, resumeSession, startSession, touchSong, type ActiveSession } from './practice';
import { useSession } from './queries/useSession';

// The running session is device-local until the recap is saved, so nothing
// half-finished ever reaches Supabase. The key carries the user id so two
// accounts on one device don't see each other's session.
const KEY_PREFIX = 'musicstand.activeSession.';

const listeners = new Set<() => void>();
// Used only when storage throws (blocked site data), so the session still runs for this page load.
const memory = new Map<string, string>();
// useSyncExternalStore needs a stable snapshot, so parse only when the raw text changes.
const parsed = new Map<string, { raw: string | null; value: ActiveSession | null }>();

function isActiveSession(value: unknown): value is ActiveSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.startedAt === 'string' &&
    typeof candidate.lastSeenAt === 'string' &&
    Array.isArray(candidate.touched) &&
    candidate.touched.every((id) => typeof id === 'string') &&
    (candidate.pausedAt == null || typeof candidate.pausedAt === 'string') &&
    (candidate.pausedMs === undefined || typeof candidate.pausedMs === 'number')
  );
}

function parse(raw: string | null): ActiveSession | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isActiveSession(value) ? value : null;
  } catch {
    return null;
  }
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function read(key: string): ActiveSession | null {
  const raw = readRaw(key);
  const cached = parsed.get(key);
  if (cached && cached.raw === raw) return cached.value;
  const value = parse(raw);
  parsed.set(key, { raw, value });
  return value;
}

function write(key: string, value: ActiveSession | null) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    if (value) memory.set(key, JSON.stringify(value));
    else memory.delete(key);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab or the PWA window changed the session.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function useActiveSession() {
  const { session: auth } = useSession();
  const userId = auth?.user.id;
  const key = userId ? `${KEY_PREFIX}${userId}` : null;

  const session = useSyncExternalStore(subscribe, () => (key ? read(key) : null));

  // The stored session right now, for event handlers that outlive a render.
  const peek = useCallback(() => (key ? read(key) : null), [key]);

  const update = useCallback(
    (change: (current: ActiveSession) => ActiveSession) => {
      const current = key ? read(key) : null;
      if (key && current) write(key, change(current));
    },
    [key],
  );

  const start = useCallback(() => {
    if (key && !read(key)) write(key, startSession(new Date()));
  }, [key]);

  // Starts a session with these songs ticked, or ticks them on the running one.
  const startWith = useCallback(
    (entryIds: readonly string[]) => {
      if (!key) return;
      const now = new Date();
      const current = read(key);
      write(
        key,
        current
          ? entryIds.reduce((session, id) => touchSong(session, id, now), current)
          : startSession(now, entryIds),
      );
    },
    [key],
  );

  const touch = useCallback((entryId: string) => update((current) => touchSong(current, entryId, new Date())), [update]);

  const seen = useCallback(() => update((current) => markSeen(current, new Date())), [update]);

  const pause = useCallback(() => update((current) => pauseSession(current, new Date())), [update]);

  const resume = useCallback(() => update((current) => resumeSession(current, new Date())), [update]);

  const discard = useCallback(() => {
    if (key) write(key, null);
  }, [key]);

  return { session, peek, start, startWith, touch, seen, pause, resume, discard };
}
