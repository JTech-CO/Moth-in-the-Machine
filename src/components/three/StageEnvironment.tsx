import { useCallback, useEffect } from 'react';
import {
  PerformanceMonitor,
  type PerformanceMonitorApi,
} from '@react-three/drei/core/PerformanceMonitor.js';

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
  type StageDifficulty,
} from '@/utils/stages';

interface StageEnvironmentProps {
  readonly menuDifficulty?: StageDifficulty | null;
  readonly onPerformanceFactorChange: (factor: number) => void;
}

type AdaptiveSceneDprProps = Pick<StageEnvironmentProps, 'onPerformanceFactorChange'>;

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
  const startStage = useGameStore((state) => state.startStage);
  const returnToMenu = useGameStore((state) => state.returnToMenu);
  const activeStageId =
    currentStageId !== null && isStageId(currentStageId) ? currentStageId : FIRST_STAGE_ID;
  const activeStage = getStageDefinition(activeStageId);
  const hasActiveRun = status !== 'idle' && currentStageId !== null && isStageId(currentStageId);
  const corridorEnvironment = hasActiveRun
    ? activeStage.environment
    : getMenuCorridorEnvironment(menuDifficulty);

  useEffect(() => {
    const handleStageKey = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if (event.code === 'KeyR') {
        if (status === 'idle' || currentStageId === null || !isStageId(currentStageId)) {
          return;
        }

        event.preventDefault();
        startStage(currentStageId);
        return;
      }

      if (
        event.code !== 'Enter' ||
        (status !== 'cleared' && status !== 'failed') ||
        currentStageId === null ||
        !isStageId(currentStageId)
      ) {
        return;
      }

      event.preventDefault();
      returnToMenu();
    };

    window.addEventListener('keydown', handleStageKey);
    return () => window.removeEventListener('keydown', handleStageKey);
  }, [currentStageId, returnToMenu, startStage, status]);

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
        </>
      ) : null}
      <AdaptiveSceneDpr onPerformanceFactorChange={onPerformanceFactorChange} />
    </>
  );
}
