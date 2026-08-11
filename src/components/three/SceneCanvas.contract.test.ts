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
  readonly onPerformanceFactorChange: (factor: number) => void;
}

const captured = vi.hoisted(() => ({
  canvas: null as CanvasContract | null,
  stageEnvironment: null as StageEnvironmentContract | null,
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

describe('M4 scene canvas contract', () => {
  beforeEach(() => {
    captured.canvas = null;
    captured.stageEnvironment = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the project title in the initial HTML while the lazy scene loads', () => {
    const markup = renderToString(createElement(App));

    expect(markup).toContain('id="project-title"');
    expect(markup).toContain('Moth');
    expect(markup).toContain('Machine');
    expect(markup).toContain('ENVIRONMENT SYNCING');
    expect(markup).toContain('INITIALIZING RELAY BAY');
  });

  it('configures one full-time Canvas with the documented camera and renderer budget', () => {
    const onAvailabilityChange = vi.fn<(availability: SceneAvailability) => void>();
    const markup = renderToStaticMarkup(
      createElement(SceneCanvas, {
        onAvailabilityChange,
      }),
    );
    const canvas = captured.canvas;

    expect(canvas).not.toBeNull();
    expect(markup).toContain('Harvard Mark II relay bay 3D preview');
    expect(canvas?.['data-render-surface']).toBe('m4-relay-bay');
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
