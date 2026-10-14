import { describe, expect, it } from 'vitest';

import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('rewrites the errors Supabase names by code', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      "That email and password don't match.",
    );
    expect(authErrorMessage({ code: 'user_already_exists', message: 'User already registered' })).toMatch(
      /already an account/,
    );
    expect(authErrorMessage({ code: 'weak_password', message: 'Password should be...' })).toMatch(/8 characters/);
    expect(authErrorMessage({ code: 'over_request_rate_limit', message: 'rate limit' })).toMatch(/Too many/);
    expect(authErrorMessage({ code: 'captcha_failed', message: 'captcha protection: ...' })).toMatch(/human check/);
  });

  it('reads a dropped connection as being offline', () => {
    const offline = /Check your connection/;
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', message: '{}' })).toMatch(offline);
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toMatch(offline);
    expect(authErrorMessage(new TypeError('Load failed'))).toMatch(offline);
  });

  it('keeps a message it has no better words for', () => {
    expect(authErrorMessage({ code: 'something_new', message: 'A new kind of failure' })).toBe(
      'A new kind of failure',
    );
    expect(authErrorMessage(new Error('Account created, but not signed in.'))).toBe(
      'Account created, but not signed in.',
    );
  });

  it('never shows an empty or non-error value', () => {
    const generic = 'Something went wrong. Try again.';
    expect(authErrorMessage(null)).toBe(generic);
    expect(authErrorMessage('boom')).toBe(generic);
    expect(authErrorMessage({ message: '' })).toBe(generic);
  });
});
