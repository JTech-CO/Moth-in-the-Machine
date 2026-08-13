import { useCallback, useRef } from 'react';
import {
  PerformanceMonitor,
  type PerformanceMonitorApi,
} from '@react-three/drei/core/PerformanceMonitor.js';
import { Html } from '@react-three/drei/web/Html.js';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3 } from 'three';

import { GameHud } from '@/components/hud/GameHud';
import { CorridorEnvironment } from '@/components/three/CorridorEnvironment';
import { getMenuCorridorEnvironment } from '@/components/three/menuCorridorEnvironment';
import { PlayerFlightRig } from '@/components/three/PlayerFlightRig';
import { LandingTarget, StageObstacles } from '@/components/three/StageObstacles';
import {
  FOG_CONFIG,
  getPerformanceBounds,
  PERFORMANCE_CONFIG,
  SCENE_COLORS,
} from '@/components/three/sceneConfig';
import { useGameStore } from '@/hooks/useGameStore';
import {
  FIRST_STAGE_ID,
  getStageDefinition,
  isStageId,
  type StageDefinition,
  type StageDifficulty,
} from '@/utils/stages';

interface StageEnvironmentProps {
  readonly menuDifficulty?: StageDifficulty | null;
  readonly onPerformanceFactorChange: (factor: number) => void;
}

type AdaptiveSceneDprProps = Pick<StageEnvironmentProps, 'onPerformanceFactorChange'>;

interface StageHudLayerProps {
  readonly stage: StageDefinition;
}

function StageHudLayer({ stage }: StageHudLayerProps) {
  const canvas = useThree(({ gl }) => gl.domElement);
  const camera = useThree((state) => state.camera);
  const anchor = useRef<Group>(null);
  const cameraDirection = useRef(new Vector3());

  useFrame(() => {
    if (anchor.current === null) {
      return;
    }

    camera.getWorldDirection(cameraDirection.current);
    anchor.current.position.copy(camera.position).addScaledVector(cameraDirection.current, 1);
    anchor.current.updateMatrixWorld();
  });

  return (
    <group ref={anchor}>
      <Html fullscreen zIndexRange={[2, 2]} style={{ pointerEvents: 'none' }}>
        <GameHud canvas={canvas} stage={stage} />
      </Html>
    </group>
  );
}

function AdaptiveSceneDpr({ onPerformanceFactorChange }: AdaptiveSceneDprProps) {
  const reportFactor = useCallback(
    ({ factor }: PerformanceMonitorApi) => {
      onPerformanceFactorChange(factor);
    },
    [onPerformanceFactorChange],
  );

  return (
    <PerformanceMonitor
      bounds={getPerformanceBounds}
      factor={PERFORMANCE_CONFIG.factor}
      iterations={PERFORMANCE_CONFIG.iterations}
      ms={PERFORMANCE_CONFIG.sampleMs}
      step={PERFORMANCE_CONFIG.step}
      threshold={PERFORMANCE_CONFIG.threshold}
      onChange={reportFactor}
    />
  );
}

export function StageEnvironment({
  menuDifficulty = null,
  onPerformanceFactorChange,
}: StageEnvironmentProps) {
  const currentStageId = useGameStore((state) => state.currentStageId);
  const stageRunId = useGameStore((state) => state.stageRunId);
  const status = useGameStore((state) => state.status);
  const activeStageId =
    currentStageId !== null && isStageId(currentStageId) ? currentStageId : FIRST_STAGE_ID;
  const activeStage = getStageDefinition(activeStageId);
  const hasActiveRun = status !== 'idle' && currentStageId !== null && isStageId(currentStageId);
  const corridorEnvironment = hasActiveRun
    ? activeStage.environment
    : getMenuCorridorEnvironment(menuDifficulty);

  return (
    <>
      <color attach="background" args={[SCENE_COLORS.background]} />
      <fog attach="fog" args={[SCENE_COLORS.fog, FOG_CONFIG.near, FOG_CONFIG.far]} />

      <ambientLight color={SCENE_COLORS.cream} intensity={0.38} />

      <CorridorEnvironment environment={corridorEnvironment} />

      {hasActiveRun ? (
        <>
          <StageObstacles stage={activeStage} />
          <LandingTarget target={activeStage.target} label={activeStage.targetLabel} />
          <PlayerFlightRig
            key={activeStage.id + ':' + stageRunId}
            stage={activeStage}
            status={status}
          />
          <StageHudLayer stage={activeStage} />
        </>
      ) : null}
      <AdaptiveSceneDpr onPerformanceFactorChange={onPerformanceFactorChange} />
    </>
  );
}
