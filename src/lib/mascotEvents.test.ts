import { describe, expect, it } from 'vitest';

import { eventLines, pickLine, type MascotEvent } from './mascotEvents';

const events = Object.keys(eventLines) as MascotEvent[];

describe('pickLine', () => {
  it('has a generic line for every event, so a reaction without detail still speaks', () => {
    for (const event of events) {
      for (let seed = 0; seed < 5; seed += 1) expect(pickLine(event, {}, seed)).toBeTruthy();
    }
  });
  it('names the minutes of a saved session', () => {
    for (let seed = 0; seed < 4; seed += 1) expect(pickLine('sessionSaved', { minutes: 25 }, seed)).toMatch(/25 min/);
  });
  it('names the streak day once the streak is longer than a day', () => {
    for (let seed = 0; seed < 4; seed += 1) expect(pickLine('streakUp', { streak: 4 }, seed)).toMatch(/4|day 4/i);
    expect(pickLine('streakUp', { streak: 1 }, 0)).not.toMatch(/\d/);
  });
  it('names the milestone', () => {
    expect(pickLine('milestone', { milestone: { kind: 'sessions', count: 1 } }, 0)).toMatch(/first session/i);
    expect(pickLine('milestone', { milestone: { kind: 'sessions', count: 50 } }, 3)).toMatch(/#50/);
    expect(pickLine('milestone', { milestone: { kind: 'streak', days: 30 } }, 1)).toMatch(/30 days/);
  });
  it('gives the same line for the same seed', () => {
    expect(pickLine('sessionSaved', { minutes: 10 }, 7)).toBe(pickLine('sessionSaved', { minutes: 10 }, 7));
  });
});
