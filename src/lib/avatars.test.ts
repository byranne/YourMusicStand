import { describe, expect, it } from 'vitest';

import { avatarPathFor, firstName, initials, isAvatarPreset } from './avatars';

describe('initials', () => {
  it('takes the first and last word of a name', () => {
    expect(initials('Bryan Wong', 'b@x.dev')).toBe('BW');
    expect(initials('  ana maria  lopez ', null)).toBe('AL');
  });

  it('takes one letter from a single word', () => {
    expect(initials('cher', 'c@x.dev')).toBe('C');
  });

  it('falls back to the email, then to a question mark', () => {
    expect(initials('', 'zoe@x.dev')).toBe('Z');
    expect(initials(null, null)).toBe('?');
  });

  it('keeps an emoji whole', () => {
    expect(initials('🎸 Rocker', null)).toBe('🎸R');
  });
});

describe('firstName', () => {
  it('is the first word, or null without a name', () => {
    expect(firstName('Bryan Wong')).toBe('Bryan');
    expect(firstName('   ')).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});

describe('avatarPathFor', () => {
  it('puts photos in the owner\'s avatar folder', () => {
    expect(avatarPathFor('user-1', 'abc')).toBe('user-1/avatar/abc.jpg');
  });
});

describe('isAvatarPreset', () => {
  it('accepts only known presets', () => {
    expect(isAvatarPreset('guitar')).toBe(true);
    expect(isAvatarPreset('banjo')).toBe(false);
    expect(isAvatarPreset(null)).toBe(false);
  });
});
