// Profile pictures: a built-in preset icon or an uploaded photo, with the
// person's initials when there is neither.

// Must match the check on profiles.avatar_preset (migration 0007).
export const AVATAR_PRESETS = ['mascot', 'guitar', 'music', 'mic', 'drum', 'headphones', 'piano', 'radio', 'disc'] as const;
export type AvatarPreset = (typeof AVATAR_PRESETS)[number];

export function isAvatarPreset(value: string | null | undefined): value is AvatarPreset {
  return (AVATAR_PRESETS as readonly string[]).includes(value ?? '');
}

// Side of the stored square photo, in pixels. Avatars show at most 96 CSS px.
export const AVATAR_PX = 256;

// The object name for an uploaded photo. The first folder is the owner (the
// storage policies check it), and profiles only accepts paths under avatar/.
export function avatarPathFor(userId: string, uniqueId: string): string {
  return `${userId}/avatar/${uniqueId}.jpg`;
}

// Up to two letters: first and last word of the display name, or the start of
// the email when there is no name.
export function initials(displayName: string | null | undefined, email: string | null | undefined): string {
  const words = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return (first(words[0]) + first(words[words.length - 1])).toUpperCase();
  if (words.length === 1) return first(words[0]).toUpperCase();
  return first(email ?? '').toUpperCase() || '?';
}

// The first character, keeping an emoji or accented letter whole.
function first(text: string): string {
  return Array.from(text)[0] ?? '';
}

// The name to greet someone by: the first word of their display name.
export function firstName(displayName: string | null | undefined): string | null {
  const word = (displayName ?? '').trim().split(/\s+/)[0];
  return word ? word : null;
}
