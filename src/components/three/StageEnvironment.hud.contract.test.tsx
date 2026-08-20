import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Group, PerspectiveCamera } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StageEnvironment } from '@/components/three/StageEnvironment';
import { getStageDefinition, type StageDefinition } from '@/utils/stages';

interface HtmlContract {
  readonly children?: ReactNode;
  readonly fullscreen?: boolean;
  readonly style?: Readonly<Record<string, unknown>>;
  readonly zIndexRange?: readonly [number, number];
}

interface GameHudContract {
  readonly canvas: HTMLCanvasElement;
  readonly stage: StageDefinition;
}

interface PlayerFlightRigContract {
  readonly stage: StageDefinition;
  readonly status: string;
}

interface PerformanceMonitorContract {
  readonly bounds: () => readonly [number, number];
  readonly onChange: (api: { readonly factor: number }) => void;
}

const captured = vi.hoisted(() => ({
  anchor: null as Group | null,
  canvas: { dataset: { surface: 'm7-test-canvas' } } as unknown as HTMLCanvasElement,
  camera: null as PerspectiveCamera | null,
  cleanup: null as (() => void) | null,
  frameCallbacks: [] as Array<() => void>,
  gameHud: null as GameHudContract | null,
  html: null as HtmlContract | null,
  listeners: new Map<string, (event: KeyboardEvent) => void>(),
  mountAnchor: true,
  performanceMonitor: null as PerformanceMonitorContract | null,
  playerFlightRig: null as PlayerFlightRigContract | null,
  state: {
    currentStageId: null as number | null,
    stageRunId: 0,
    status: 'idle',
    returnToMenu: vi.fn(),
  },
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => {
      captured.cleanup = effect() ?? null;
    },
    useRef: <Value,>(initialValue: Value) => ({
      current:
        initialValue === null && captured.mountAnchor ? (captured.anchor as Value) : initialValue,
    }),
  };
});

vi.mock('@react-three/drei/core/PerformanceMonitor.js', () => ({
  PerformanceMonitor: (props: PerformanceMonitorContract) => {
    captured.performanceMonitor = props;
    return null;
  },
}));

vi.mock('@react-three/drei/web/Html.js', () => ({
  Html: (props: HtmlContract) => {
    captured.html = props;
    return props.children ?? null;
  },
}));

vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: () => void) => {
    captured.frameCallbacks.push(callback);
  },
  useThree: (
    selector: (state: {
      camera: PerspectiveCamera;
      gl: { domElement: HTMLCanvasElement };
    }) => unknown,
  ) => selector({ camera: captured.camera!, gl: { domElement: captured.canvas } }),
}));

vi.mock('@/components/hud/GameHud', () => ({
  GameHud: (props: GameHudContract) => {
    captured.gameHud = props;
    return <div data-testid="m7-game-hud" />;
  },
}));

vi.mock('@/components/three/CorridorEnvironment', () => ({
  CorridorEnvironment: () => null,
}));

vi.mock('@/components/three/PlayerFlightRig', () => ({
  PlayerFlightRig: (props: PlayerFlightRigContract) => {
    captured.playerFlightRig = props;
    return null;
  },
}));

vi.mock('@/components/three/StageObstacles', () => ({
  LandingTarget: () => null,
  StageObstacles: () => null,
}));

vi.mock('@/hooks/useGameStore', () => ({
  useGameStore: (selector: (state: typeof captured.state) => unknown) => selector(captured.state),
}));

function renderStageEnvironment(
  onPerformanceFactorChange = vi.fn(),
  renderQuality: 'auto' | 'low' = 'auto',
) {
  return renderToStaticMarkup(
    <StageEnvironment
      onPerformanceFactorChange={onPerformanceFactorChange}
      renderQuality={renderQuality}
    />,
  );
}

describe('M7 StageEnvironment HUD integration contract', () => {
  beforeEach(() => {
    captured.frameCallbacks.length = 0;
    captured.anchor = new Group();
    captured.camera = new PerspectiveCamera();
    captured.camera.position.set(2, 1, 4);
    captured.camera.lookAt(2, 1, 0);
    captured.cleanup = null;
    captured.gameHud = null;
    captured.html = null;
    captured.listeners.clear();
    captured.mountAnchor = true;
    captured.performanceMonitor = null;
    captured.playerFlightRig = null;
    captured.state.currentStageId = null;
    captured.state.stageRunId = 0;
    captured.state.status = 'idle';
    captured.state.returnToMenu.mockClear();
    vi.stubGlobal('window', {
      addEventListener: vi.fn((type: string, listener: (event: KeyboardEvent) => void) => {
        captured.listeners.set(type, listener);
      }),
      removeEventListener: vi.fn((type: string) => {
        captured.listeners.delete(type);
      }),
    });
  });

  it('does not mount flight instruments while the campaign menu is idle', () => {
    renderStageEnvironment();

    expect(captured.gameHud).toBeNull();
    expect(captured.html).toBeNull();
    expect(captured.playerFlightRig).toBeNull();
  });

  it.each(['playing', 'paused', 'cleared', 'failed'] as const)(
    'mounts the full-screen HUD through the real active-run branch while %s',
    (status) => {
      captured.state.currentStageId = 8;
      captured.state.stageRunId = 12;
      captured.state.status = status;

      const markup = renderStageEnvironment();
      const stage = getStageDefinition(8);

      expect(markup).toContain('data-testid="m7-game-hud"');
      expect(captured.gameHud).toMatchObject({ canvas: captured.canvas, stage });
      expect(captured.playerFlightRig).toMatchObject({ stage, status });
      expect(captured.html).toMatchObject({
        fullscreen: true,
        style: { pointerEvents: 'none' },
        zIndexRange: [2, 2],
      });
    },
  );

  it('registers a camera-forward HUD anchor update only for an active run', () => {
    renderStageEnvironment();
    expect(captured.frameCallbacks).toHaveLength(0);

    captured.state.currentStageId = 8;
    captured.state.status = 'playing';
    renderStageEnvironment();

    expect(captured.frameCallbacks).toHaveLength(1);
    captured.frameCallbacks[0]();
    expect(captured.anchor?.position.toArray()).toEqual([2, 1, 3]);
  });

  it('keeps the frame callback safe until the Three group ref is attached', () => {
    captured.mountAnchor = false;
    captured.state.currentStageId = 8;
    captured.state.status = 'playing';

    renderStageEnvironment();

    expect(captured.frameCallbacks).toHaveLength(1);
    expect(() => captured.frameCallbacks[0]()).not.toThrow();
  });

  it('forwards adaptive performance factors without claiming terminal shortcuts', () => {
    const onPerformanceFactorChange = vi.fn();
    renderStageEnvironment(onPerformanceFactorChange);

    captured.performanceMonitor?.onChange({ factor: 0.42 });
    expect(onPerformanceFactorChange).toHaveBeenCalledWith(0.42);
    expect(captured.performanceMonitor?.bounds()).toEqual([57, 61]);

    renderStageEnvironment(vi.fn(), 'low');
    expect(captured.performanceMonitor?.bounds()).toEqual([28, 32]);
    expect(captured.listeners.has('keydown')).toBe(false);
  });

  it.each(['playing', 'paused', 'cleared', 'failed'] as const)(
    'leaves keyboard ownership outside the Three scene while %s',
    (status) => {
      captured.state.currentStageId = 8;
      captured.state.status = status;

      renderStageEnvironment();

      expect(captured.listeners.has('keydown')).toBe(false);
      expect(captured.state.returnToMenu).not.toHaveBeenCalled();
    },
  );
});
