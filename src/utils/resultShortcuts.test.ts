import { describe, expect, it } from 'vitest';

import { resolveResultShortcut, type ResultShortcutEvent } from '@/utils/resultShortcuts';

function keyboardEvent(patch: Partial<ResultShortcutEvent> = {}): ResultShortcutEvent {
  return {
    altKey: false,
    code: 'Enter',
    ctrlKey: false,
    defaultPrevented: false,
    metaKey: false,
    repeat: false,
    shiftKey: false,
    ...patch,
  };
}

describe('resolveResultShortcut', () => {
  it('maps non-interactive Enter and R to the terminal actions', () => {
    expect(resolveResultShortcut(keyboardEvent(), false)).toBe('return');
    expect(resolveResultShortcut(keyboardEvent({ code: 'KeyR' }), false)).toBe('restart');
  });

  it.each([
    { repeat: true },
    { altKey: true },
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { defaultPrevented: true },
  ])('ignores repeated, modified, or already handled input %#', (patch) => {
    expect(resolveResultShortcut(keyboardEvent(patch), false)).toBeNull();
  });

  it('keeps Enter on interactive controls local while R still restarts from initial button focus', () => {
    expect(resolveResultShortcut(keyboardEvent(), true)).toBeNull();
    expect(resolveResultShortcut(keyboardEvent({ code: 'KeyR' }), true)).toBe('restart');
  });

  it('ignores unrelated keys', () => {
    expect(resolveResultShortcut(keyboardEvent({ code: 'Escape' }), false)).toBeNull();
  });
});
