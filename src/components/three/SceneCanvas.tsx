import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';

import styles from '@/components/three/SceneCanvas.module.scss';
import {
  CAMERA_CONFIG,
  CANVAS_CONFIG,
  calculateAdaptiveDpr,
  SCENE_COLORS,
} from '@/components/three/sceneConfig';
import { StageEnvironment } from '@/components/three/StageEnvironment';

export type SceneAvailability = 'ready' | 'unavailable';

interface SceneCanvasProps {
  readonly onAvailabilityChange: (availability: SceneAvailability) => void;
}

interface WebGLFallbackProps {
  readonly onUnavailable: () => void;
}

function WebGLFallback({ onUnavailable }: WebGLFallbackProps) {
  useEffect(() => {
    onUnavailable();
  }, [onUnavailable]);

  return (
    <div className={styles.fallback} role="alert">
      <div className={styles.fallbackPanel}>
        <span className={styles.fallbackCode}>RELAY BAY · OFFLINE</span>
        <strong>3D 렌더러를 시작할 수 없습니다.</strong>
        <p>WebGL2를 지원하는 최신 브라우저에서 다시 시도해 주세요.</p>
      </div>
    </div>
  );
}

export default function SceneCanvas({ onAvailabilityChange }: SceneCanvasProps) {
  const initialDpr = useRef(
    calculateAdaptiveDpr(
      1,
      typeof window === 'undefined' ? CANVAS_CONFIG.dpr[0] : window.devicePixelRatio,
    ),
  );
  const [adaptiveDpr, setAdaptiveDpr] = useState(initialDpr.current);
  const markUnavailable = useCallback(
    () => onAvailabilityChange('unavailable'),
    [onAvailabilityChange],
  );
  const updateAdaptiveDpr = useCallback((factor: number) => {
    setAdaptiveDpr(calculateAdaptiveDpr(factor, initialDpr.current));
  }, []);

  return (
    <section className={styles.viewport} aria-label="Harvard Mark II relay bay 3D preview">
      <Canvas
        data-render-surface="m4-relay-bay"
        camera={{
          position: [...CAMERA_CONFIG.position],
          fov: CAMERA_CONFIG.fov,
          near: CAMERA_CONFIG.near,
          far: CAMERA_CONFIG.far,
        }}
        dpr={adaptiveDpr}
        fallback={<WebGLFallback onUnavailable={markUnavailable} />}
        frameloop="always"
        gl={{
          alpha: false,
          antialias: CANVAS_CONFIG.antialias,
          powerPreference: CANVAS_CONFIG.powerPreference,
          preserveDrawingBuffer: false,
        }}
        shadows={false}
        onCreated={({ gl }) => {
          gl.outputColorSpace = SRGBColorSpace;
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = CANVAS_CONFIG.toneMappingExposure;
          gl.setClearColor(SCENE_COLORS.background, 1);
          onAvailabilityChange('ready');
        }}
      >
        <StageEnvironment onPerformanceFactorChange={updateAdaptiveDpr} />
      </Canvas>

      <p className={styles.visuallyHidden}>
        어두운 Mark II 컴퓨터 내부 회랑에 금속 릴레이 랙, 황동 접점, 호박색 진공관이 배치되어
        있습니다.
      </p>
    </section>
  );
}
