import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';
import SceneCanvas, { type SceneAvailability } from '@/components/three/SceneCanvas';
import { CAMERA_CONFIG, CANVAS_CONFIG, SCENE_COLORS } from '@/components/three/sceneConfig';

interface RendererContract {
  outputColorSpace: string;
  toneMapping: number;
  toneMappingExposure: number;
  setClearColor: ReturnType<typeof vi.fn>;
}

interface CanvasContract {
  readonly camera: {
    readonly position: readonly number[];
    readonly fov: number;
    readonly near: number;
    readonly far: number;
  };
  readonly children?: ReactNode;
  readonly dpr: number;
  readonly fallback: ReactElement;
  readonly frameloop: string;
  readonly gl: {
    readonly alpha: boolean;
    readonly antialias: boolean;
    readonly powerPreference: string;
    readonly preserveDrawingBuffer: boolean;
  };
  readonly onCreated: (state: { gl: RendererContract }) => void;
  readonly shadows: boolean;
  readonly 'data-render-surface': string;
}

interface WebGLFallbackContract {
  readonly onUnavailable: () => void;
}

interface StageEnvironmentContract {
  readonly menuDifficulty?: 'tutorial' | 'easy' | 'normal' | 'hard' | null;
  readonly onPerformanceFactorChange: (factor: number) => void;
}

const captured = vi.hoisted(() => ({
  canvas: null as CanvasContract | null,
  stageEnvironment: null as StageEnvironmentContract | null,
  gameState: {
    status: 'idle',
    progress: {
      completedStages: [] as { stageId: number; bestTimeMs: number; bestStars: number }[],
      totalStars: 0,
    },
    currentStageId: null as number | null,
    result: null as null | {
      stageId: number;
      timeMs: number;
      remainingHealth: number;
      stars: number;
      timestamp: Date;
    },
    startStage: () => undefined,
    returnToMenu: () => undefined,
  },
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: (props: CanvasContract) => {
    captured.canvas = props;
    return props.children ?? null;
  },
}));

vi.mock('@/components/three/StageEnvironment', () => ({
  StageEnvironment: (props: StageEnvironmentContract) => {
    captured.stageEnvironment = props;
    return null;
  },
}));

vi.mock('@/hooks/useGameStore', () => ({
  useGameStore: (selector: (state: typeof captured.gameState) => unknown) =>
    selector(captured.gameState),
}));
describe('M7 scene canvas contract', () => {
  beforeEach(() => {
    captured.canvas = null;
    captured.stageEnvironment = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders an explicit, non-playing mission introduction while the lazy scene loads', () => {
    const markup = renderToString(createElement(App));
    expect(markup).toContain('19 STAGES');
    expect(markup).toContain('EASY / NORMAL / HARD');

    expect(markup).toContain('id="project-title"');
    expect(markup).toContain('Moth');
    expect(markup).toContain('Machine');
    expect(markup).toContain('실제 기록에 남은');
    expect(markup).toContain('aria-label="기본 조작법"');
    expect(markup).toContain('START FLIGHT');
    expect(markup).toContain('1인칭 / 3인칭');
    expect(markup).toContain('<strong>T</strong>');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('FLIGHT SYSTEMS SYNCING');
    expect(markup).toContain('튜토리얼 클리어 시 플레이 가능');
    expect(markup).toContain('EASY 단계 3개 이상 클리어 시 플레이 가능');
    expect(markup).toContain('NORMAL 단계 3개 이상 클리어 시 플레이 가능');
    expect(markup).toContain('INITIALIZING RELAY BAY');
    expect(markup).not.toContain('aria-label="Moth health"');
  });
  it('counts only distinct canonical campaign stages in the menu total', () => {
    const originalProgress = captured.gameState.progress;

    captured.gameState.progress = {
      completedStages: [
        { stageId: 1, bestTimeMs: 1_000, bestStars: 3 },
        { stageId: 1, bestTimeMs: 900, bestStars: 3 },
        { stageId: 20, bestTimeMs: 800, bestStars: 3 },
      ],
      totalStars: 9,
    };

    try {
      const markup = renderToString(createElement(App));
      const normalizedMarkup = markup.replace(/<!-- -->/g, '');

      expect(normalizedMarkup).toContain('1 / 19 CLEARED');
      expect(normalizedMarkup).not.toContain('3 / 19 CLEARED');
    } finally {
      captured.gameState.progress = originalProgress;
    }
  });
  it.each([
    ['cleared', 'STAGE CLEARED', true],
    ['failed', 'FLIGHT FAILED', false],
  ] as const)('renders the full M8 result dialog after a %s run', (status, heading, shareable) => {
    const originalStatus = captured.gameState.status;
    const originalStageId = captured.gameState.currentStageId;
    const originalResult = captured.gameState.result;

    captured.gameState.status = status;
    captured.gameState.currentStageId = 2;
    captured.gameState.result = {
      stageId: 2,
      timeMs: 12_300,
      remainingHealth: shareable ? 100 : 0,
      stars: shareable ? 3 : 0,
      timestamp: new Date('2026-08-14T00:00:00.000Z'),
    };

    try {
      const markup = renderToString(createElement(App));

      expect(markup).toContain('role="dialog"');
      expect(markup).toContain(heading);
      expect(markup).toContain('RETURN TO STAGES · ENTER');
      expect(markup).toContain('RETRY STAGE · R');

      if (shareable) {
        expect(markup).toContain('COPY IMAGE');
        expect(markup).toContain('DOWNLOAD PNG');
        expect(markup).not.toContain('CONTACT NOT RECORDED');
      } else {
        expect(markup).toContain('CONTACT NOT RECORDED');
        expect(markup).not.toContain('COPY IMAGE');
        expect(markup).not.toContain('DOWNLOAD PNG');
      }
    } finally {
      captured.gameState.status = originalStatus;
      captured.gameState.currentStageId = originalStageId;
      captured.gameState.result = originalResult;
    }
  });

  it('configures one full-time Canvas with the documented camera and renderer budget', () => {
    const onAvailabilityChange = vi.fn<(availability: SceneAvailability) => void>();
    const markup = renderToStaticMarkup(
      createElement(SceneCanvas, {
        menuDifficulty: 'normal',
        onAvailabilityChange,
      }),
    );
    const canvas = captured.canvas;

    expect(canvas).not.toBeNull();
    expect(markup).toContain('Harvard Mark II relay bay moth flight');
    expect(markup).toContain('P 또는 Escape');
    expect(canvas?.['data-render-surface']).toBe('m7-instrument-flight');
    expect(canvas?.camera).toEqual({
      position: [...CAMERA_CONFIG.position],
      fov: CAMERA_CONFIG.fov,
      near: CAMERA_CONFIG.near,
      far: CAMERA_CONFIG.far,
    });
    expect(canvas?.dpr).toBeGreaterThanOrEqual(CANVAS_CONFIG.dpr[0]);
    expect(canvas?.dpr).toBeLessThanOrEqual(CANVAS_CONFIG.dpr[1]);
    expect(canvas?.frameloop).toBe('always');
    expect(canvas?.gl).toEqual({
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    expect(canvas?.shadows).toBe(false);
    expect(captured.stageEnvironment?.menuDifficulty).toBe('normal');
    expect(captured.stageEnvironment?.onPerformanceFactorChange).toBeTypeOf('function');
    expect(() => captured.stageEnvironment!.onPerformanceFactorChange(0.5)).not.toThrow();
    expect(onAvailabilityChange).not.toHaveBeenCalled();
  });

  it('clamps the initial browser DPR to the configured numeric maximum', () => {
    vi.stubGlobal('window', { devicePixelRatio: 3 });

    renderToStaticMarkup(
      createElement(SceneCanvas, {
        onAvailabilityChange: vi.fn(),
      }),
    );

    expect(captured.canvas?.dpr).toBe(CANVAS_CONFIG.dpr[1]);
  });

  it('exposes an accessible WebGL fallback and initializes Three exactly once', () => {
    const onAvailabilityChange = vi.fn<(availability: SceneAvailability) => void>();
    renderToStaticMarkup(
      createElement(SceneCanvas, {
        onAvailabilityChange,
      }),
    );
    const canvas = captured.canvas;

    expect(canvas).not.toBeNull();
    const fallbackMarkup = renderToStaticMarkup(canvas!.fallback);
    expect(fallbackMarkup).toContain('role="alert"');
    expect(fallbackMarkup).toContain('RELAY BAY · OFFLINE');
    expect(fallbackMarkup).toContain('WebGL2');

    const fallback = canvas!.fallback as ReactElement<WebGLFallbackContract>;
    fallback.props.onUnavailable();
    expect(onAvailabilityChange).toHaveBeenCalledOnce();
    expect(onAvailabilityChange).toHaveBeenLastCalledWith('unavailable');
    onAvailabilityChange.mockClear();

    const renderer: RendererContract = {
      outputColorSpace: '',
      toneMapping: 0,
      toneMappingExposure: 0,
      setClearColor: vi.fn(),
    };
    canvas!.onCreated({ gl: renderer });

    expect(renderer.outputColorSpace).toBe(SRGBColorSpace);
    expect(renderer.toneMapping).toBe(ACESFilmicToneMapping);
    expect(renderer.toneMappingExposure).toBe(CANVAS_CONFIG.toneMappingExposure);
    expect(renderer.setClearColor).toHaveBeenCalledOnce();
    expect(renderer.setClearColor).toHaveBeenCalledWith(SCENE_COLORS.background, 1);
    expect(onAvailabilityChange).toHaveBeenCalledOnce();
    expect(onAvailabilityChange).toHaveBeenCalledWith('ready');
  });
});
