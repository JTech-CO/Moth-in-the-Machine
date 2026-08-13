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
import type { StageDifficulty } from '@/utils/stages';

export type SceneAvailability = 'ready' | 'unavailable';

interface SceneCanvasProps {
  readonly onAvailabilityChange: (availability: SceneAvailability) => void;
  readonly menuDifficulty?: StageDifficulty | null;
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

export default function SceneCanvas({
  menuDifficulty = null,
  onAvailabilityChange,
}: SceneCanvasProps) {
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
    <section className={styles.viewport} aria-label="Harvard Mark II relay bay moth flight">
      <Canvas
        data-render-surface="m5-player-flight"
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
        <StageEnvironment
          menuDifficulty={menuDifficulty}
          onPerformanceFactorChange={updateAdaptiveDpr}
        />
      </Canvas>

      <p className={styles.visuallyHidden}>
        어두운 Mark II 컴퓨터 내부 회랑에서 나방을 조종합니다. 화면을 클릭한 뒤 WASD 또는 화살표
        키와 마우스로 비행하고 Space 키로 호버와 착륙 준비 상태를 전환합니다.
      </p>
    </section>
  );
}
