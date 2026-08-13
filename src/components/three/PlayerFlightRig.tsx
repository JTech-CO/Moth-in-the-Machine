import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type Group } from 'three';

import { CameraRig } from '@/components/three/CameraRig';
import { MothPlayer, type MothMotionState } from '@/components/three/MothPlayer';
import { PLAYER_CENTER_BOUNDS, PLAYER_CONFIG } from '@/components/three/sceneConfig';
import { useGameStore, type SessionStatus } from '@/hooks/useGameStore';
import { usePlayerControls } from '@/hooks/usePlayerControls';
import { findBlockingStructures } from '@/utils/corridorLayouts';
import {
  DEFAULT_LOOK_INPUT_CONFIG,
  deriveMoveAxes,
  smoothLookAngles,
} from '@/utils/playerControls';
import {
  simulatePlayerStep,
  type PlayerPhysicsConfig,
  type PlayerSimulationState,
} from '@/utils/playerPhysics';
import {
  createHazardRuntimeState,
  evaluateStageHazards,
  evaluateSurfaceLandingAttempt,
  latchLandingAttempt,
  type LandingAttemptResult,
} from '@/utils/stageHazards';
import type { StageDefinition } from '@/utils/stages';

const PHYSICS_CONFIG: PlayerPhysicsConfig = {
  acceleration: PLAYER_CONFIG.acceleration,
  maxHorizontalSpeed: PLAYER_CONFIG.maximumSpeed,
  maxVerticalSpeed: PLAYER_CONFIG.maximumVerticalSpeed,
  horizontalDrag: PLAYER_CONFIG.drag,
  hoverVerticalDrag: PLAYER_CONFIG.hoverVerticalDamping,
  landingDescentSpeed: PLAYER_CONFIG.maximumDescentSpeed,
  landingVerticalResponse: PLAYER_CONFIG.landingVerticalResponse,
  centerBounds: PLAYER_CENTER_BOUNDS,
};

const PLAYER_HALF_EXTENTS = {
  x: PLAYER_CONFIG.halfExtents[0],
  y: PLAYER_CONFIG.halfExtents[1],
  z: PLAYER_CONFIG.halfExtents[2],
};
const STORE_SYNC_INTERVAL_SECONDS = 0.1;
const HAZARD_BOUNCE_FACTOR = 0.28;
const MOTH_UP_AXIS = new Vector3(0, 1, 0);

interface PlayerFlightRigProps {
  readonly stage: StageDefinition;
  readonly status: SessionStatus;
}

function createInitialPlayerState(stage: StageDefinition): PlayerSimulationState {
  return {
    position: { ...stage.spawnPosition },
    velocity: { x: 0, y: 0, z: 0 },
  };
}

function resolveBlockingImpact(
  previous: PlayerSimulationState,
  candidate: PlayerSimulationState,
): PlayerSimulationState {
  return {
    position: { ...previous.position },
    velocity: {
      x: -candidate.velocity.x * HAZARD_BOUNCE_FACTOR,
      y: -candidate.velocity.y * HAZARD_BOUNCE_FACTOR,
      z: -candidate.velocity.z * HAZARD_BOUNCE_FACTOR,
    },
  };
}

function roundedVector(vector: PlayerSimulationState['position']) {
  return {
    x: Number(vector.x.toFixed(3)),
    y: Number(vector.y.toFixed(3)),
    z: Number(vector.z.toFixed(3)),
  };
}

export function PlayerFlightRig({ stage, status }: PlayerFlightRigProps) {
  const canvas = useThree(({ gl }) => gl.domElement);
  const controls = usePlayerControls(canvas, status === 'playing');
  const health = useGameStore((state) => state.player.health);
  const setPlayerSnapshot = useGameStore((state) => state.setPlayerSnapshot);
  const setElapsedTimeMs = useGameStore((state) => state.setElapsedTimeMs);
  const updateHealth = useGameStore((state) => state.updateHealth);
  const land = useGameStore((state) => state.land);
  const saveProgress = useGameStore((state) => state.saveProgress);
  const playerRoot = useRef<Group>(null);
  const playerState = useRef<PlayerSimulationState>(createInitialPlayerState(stage));
  const resolvedLookAngles = useRef({ yaw: 0, pitch: 0 });
  const hazardRuntime = useRef(createHazardRuntimeState());
  const accumulatorSeconds = useRef(0);
  const simulationSeconds = useRef(0);
  const animationSeconds = useRef(0);
  const nextStoreSyncAt = useRef(0);
  const nextDiagnosticAt = useRef(0);
  const terminalLatched = useRef(false);
  const motion = useRef<MothMotionState>({
    elapsedSeconds: 0,
    flightMode: 'hover',
    speedRatio: 0,
    strafe: 0,
  });

  useFrame((_, delta) => {
    if (status !== 'playing' || terminalLatched.current) {
      return;
    }

    const frameDelta = Number.isFinite(delta)
      ? Math.min(Math.max(delta, 0), PLAYER_CONFIG.maximumFrameDelta)
      : 0;
    const maximumAccumulatedDelta = PLAYER_CONFIG.fixedDelta * PLAYER_CONFIG.maximumSubsteps;
    accumulatorSeconds.current = Math.min(
      accumulatorSeconds.current + frameDelta,
      maximumAccumulatedDelta,
    );
    animationSeconds.current += frameDelta;

    const moveAxes = deriveMoveAxes(controls.activeCodes.current);

    if (!controls.pointerLocked.current) {
      controls.lookAngles.current = { ...resolvedLookAngles.current };
    }

    let look = resolvedLookAngles.current;
    let frameDamage = 0;
    let landingAttempt: LandingAttemptResult = 'none';
    let substeps = 0;

    while (
      accumulatorSeconds.current >= PLAYER_CONFIG.fixedDelta &&
      substeps < PLAYER_CONFIG.maximumSubsteps &&
      landingAttempt === 'none'
    ) {
      look = smoothLookAngles(
        look,
        controls.lookAngles.current,
        DEFAULT_LOOK_INPUT_CONFIG.responsePerSecond,
        PLAYER_CONFIG.fixedDelta,
        DEFAULT_LOOK_INPUT_CONFIG.maximumYawRadiansPerSecond,
        DEFAULT_LOOK_INPUT_CONFIG.maximumPitchRadiansPerSecond,
      );
      resolvedLookAngles.current = look;

      const previous = playerState.current;
      let candidate = simulatePlayerStep(
        previous,
        {
          forward: moveAxes.forward,
          right: moveAxes.right,
          yaw: look.yaw,
          pitch: look.pitch,
          mode: controls.flightMode.current,
          landingSurfaceNormal: stage.target.normal,
        },
        PLAYER_CONFIG.fixedDelta,
        PHYSICS_CONFIG,
      );
      landingAttempt = latchLandingAttempt(
        landingAttempt,
        evaluateSurfaceLandingAttempt(
          controls.flightMode.current,
          {
            previousPosition: previous.position,
            position: candidate.position,
            approachVelocity: previous.velocity,
          },
          stage.target,
        ),
      );
      const hazardEvaluation = evaluateStageHazards(
        stage.obstacles,
        candidate.position,
        PLAYER_HALF_EXTENTS,
        PLAYER_CONFIG.fixedDelta,
        hazardRuntime.current,
      );
      const blockingStructureIds = findBlockingStructures(
        stage.environment,
        candidate.position,
        PLAYER_HALF_EXTENTS,
      );

      hazardRuntime.current = hazardEvaluation.runtime;
      frameDamage += hazardEvaluation.damage;

      if (hazardEvaluation.blockingObstacleIds.length > 0 || blockingStructureIds.length > 0) {
        candidate = resolveBlockingImpact(previous, candidate);
      }

      playerState.current = candidate;
      simulationSeconds.current += PLAYER_CONFIG.fixedDelta;
      accumulatorSeconds.current -= PLAYER_CONFIG.fixedDelta;
      substeps += 1;
    }

    const { position, velocity } = playerState.current;
    const root = playerRoot.current;

    if (root !== null) {
      root.position.set(position.x, position.y, position.z);
      root.rotation.set(look.pitch * 0.72, -look.yaw, 0);
      if (landingAttempt === 'success') {
        const normal = stage.target.normal;
        root.quaternion.setFromUnitVectors(MOTH_UP_AXIS, new Vector3(normal.x, normal.y, normal.z));
      }
      motion.current = {
        elapsedSeconds: animationSeconds.current,
        flightMode: controls.flightMode.current,
        speedRatio: Math.min(
          1,
          Math.hypot(velocity.x, velocity.y, velocity.z) / PLAYER_CONFIG.maximumSpeed,
        ),
        strafe: moveAxes.right,
      };
    }

    const immediateStoreSync = frameDamage > 0 || landingAttempt !== 'none';

    if (immediateStoreSync || simulationSeconds.current >= nextStoreSyncAt.current) {
      setPlayerSnapshot(position, velocity);
      setElapsedTimeMs(Math.floor(simulationSeconds.current * 1000));
      nextStoreSyncAt.current = simulationSeconds.current + STORE_SYNC_INTERVAL_SECONDS;
    }

    const remainingHealth = frameDamage > 0 ? updateHealth(-frameDamage) : health;

    if (remainingHealth <= 0) {
      terminalLatched.current = true;
    } else if (landingAttempt !== 'none') {
      terminalLatched.current = true;
      const result = land(landingAttempt === 'success');

      if (result !== null && result.stars > 0) {
        saveProgress();
      }
    }

    if (import.meta.env.DEV && controls.pointerLocked.current) {
      if (animationSeconds.current >= nextDiagnosticAt.current) {
        console.info('[M6 flight]', {
          stage: stage.id,
          mode: controls.flightMode.current,
          health: Number(remainingHealth.toFixed(3)),
          elapsedTimeMs: Math.floor(simulationSeconds.current * 1000),
          position: roundedVector(position),
          velocity: roundedVector(velocity),
        });
        nextDiagnosticAt.current =
          animationSeconds.current + PLAYER_CONFIG.diagnosticIntervalSeconds;
      }
    } else {
      nextDiagnosticAt.current = animationSeconds.current;
    }
  }, -1);

  return (
    <>
      <MothPlayer ref={playerRoot} motion={motion} />
      <CameraRig
        inputEnabled={status === 'playing'}
        playerState={playerState}
        lookAngles={resolvedLookAngles}
      />
    </>
  );
}
