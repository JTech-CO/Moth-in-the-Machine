import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DamageOverlay } from '@/components/hud/DamageOverlay';

interface HookRef<T> {
  current: T;
}

const harness = vi.hoisted(() => ({
  health: 100,
  refs: [] as Array<HookRef<unknown>>,
  states: [] as unknown[],
  refCursor: 0,
  stateCursor: 0,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    memo: <Component,>(component: Component) => component,
    useEffect: (effect: () => void) => effect(),
    useRef: <Value,>(initialValue: Value): HookRef<Value> => {
      const index = harness.refCursor++;
      const ref = harness.refs[index] ?? { current: initialValue };
      harness.refs[index] = ref;
      return ref as HookRef<Value>;
    },
    useState: <Value,>(initialValue: Value) => {
      const index = harness.stateCursor++;

      if (!(index in harness.states)) {
        harness.states[index] = initialValue;
      }

      const setValue = (nextValue: Value | ((current: Value) => Value)) => {
        const current = harness.states[index] as Value;
        harness.states[index] =
          typeof nextValue === 'function'
            ? (nextValue as (current: Value) => Value)(current)
            : nextValue;
      };

      return [harness.states[index] as Value, setValue] as const;
    },
  };
});

vi.mock('@/hooks/useGameStore', () => ({
  useGameStore: (selector: (state: { player: { health: number } }) => unknown) =>
    selector({ player: { health: harness.health } }),
}));

function renderDamageOverlay(): ReactElement | null {
  harness.refCursor = 0;
  harness.stateCursor = 0;
  return DamageOverlay({}) as ReactElement | null;
}

describe('M7 DamageOverlay render contract', () => {
  beforeEach(() => {
    harness.health = 100;
    harness.refs.length = 0;
    harness.states.length = 0;
    harness.refCursor = 0;
    harness.stateCursor = 0;
  });

  it('creates screen-edge damage feedback after health decreases', () => {
    expect(renderDamageOverlay()).toBeNull();

    harness.health = 74;
    expect(renderDamageOverlay()).toBeNull();

    const overlay = renderDamageOverlay();
    expect(overlay).not.toBeNull();

    const markup = renderToStaticMarkup(overlay!);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('--damage-severity:');
  });
});
