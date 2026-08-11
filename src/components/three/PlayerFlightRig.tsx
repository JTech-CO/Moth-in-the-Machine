import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';

import { CameraRig } from '@/components/three/CameraRig';
import { MothPlayer, type MothMotionState } from '@/components/three/MothPlayer';
import { PLAYER_CENTER_BOUNDS, PLAYER_CONFIG } from '@/components/three/sceneConfig';
import { usePlayerControls } from '@/hooks/usePlayerControls';
import { deriveMoveAxes } from '@/utils/playerControls';
import {
  simulatePlayerStep,
  type PlayerPhysicsConfig,
  type PlayerSimulationState,
} from '@/utils/playerPhysics';

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

function createInitialPlayerState(): PlayerSimulationState {
  return {
    position: {
      x: PLAYER_CONFIG.spawn[0],
      y: PLAYER_CONFIG.spawn[1],
      z: PLAYER_CONFIG.spawn[2],
    },
    velocity: { x: 0, y: 0, z: 0 },
  };
}

function roundedVector(vector: PlayerSimulationState['position']) {
  return {
    x: Number(vector.x.toFixed(3)),
    y: Number(vector.y.toFixed(3)),
    z: Number(vector.z.toFixed(3)),
  };
}

export function PlayerFlightRig() {
  const canvas = useThree(({ gl }) => gl.domElement);
  const controls = usePlayerControls(canvas);
  const playerRoot = useRef<Group>(null);
  const playerState = useRef<PlayerSimulationState>(createInitialPlayerState());
  const accumulatorSeconds = useRef(0);
  const elapsedSeconds = useRef(0);
  const nextDiagnosticAt = useRef(0);
  const motion = useRef<MothMotionState>({
    elapsedSeconds: 0,
    flightMode: 'hover',
    speedRatio: 0,
    strafe: 0,
  });

  useFrame((_, delta) => {
    const frameDelta = Number.isFinite(delta)
      ? Math.min(Math.max(delta, 0), PLAYER_CONFIG.maximumFrameDelta)
      : 0;
    const maximumAccumulatedDelta = PLAYER_CONFIG.fixedDelta * PLAYER_CONFIG.maximumSubsteps;
    accumulatorSeconds.current = Math.min(
      accumulatorSeconds.current + frameDelta,
      maximumAccumulatedDelta,
    );
    elapsedSeconds.current += frameDelta;

    const moveAxes = deriveMoveAxes(controls.activeCodes.current);
    const look = controls.lookAngles.current;
    let substeps = 0;

    while (
      accumulatorSeconds.current >= PLAYER_CONFIG.fixedDelta &&
      substeps < PLAYER_CONFIG.maximumSubsteps
    ) {
      playerState.current = simulatePlayerStep(
        playerState.current,
        {
          forward: moveAxes.forward,
          right: moveAxes.right,
          yaw: look.yaw,
          pitch: look.pitch,
          mode: controls.flightMode.current,
        },
        PLAYER_CONFIG.fixedDelta,
        PHYSICS_CONFIG,
      );
      accumulatorSeconds.current -= PLAYER_CONFIG.fixedDelta;
      substeps += 1;
    }

    const root = playerRoot.current;

    if (root !== null) {
      const { position, velocity } = playerState.current;
      root.position.set(position.x, position.y, position.z);
      root.rotation.set(look.pitch * 0.72, -look.yaw, 0);
      motion.current = {
        elapsedSeconds: elapsedSeconds.current,
        flightMode: controls.flightMode.current,
        speedRatio: Math.min(
          1,
          Math.hypot(velocity.x, velocity.y, velocity.z) / PLAYER_CONFIG.maximumSpeed,
        ),
        strafe: moveAxes.right,
      };
    }

    if (import.meta.env.DEV && controls.pointerLocked.current) {
      if (elapsedSeconds.current >= nextDiagnosticAt.current) {
        console.info('[M5 flight]', {
          mode: controls.flightMode.current,
          position: roundedVector(playerState.current.position),
          velocity: roundedVector(playerState.current.velocity),
        });
        nextDiagnosticAt.current = elapsedSeconds.current + PLAYER_CONFIG.diagnosticIntervalSeconds;
      }
    } else {
      nextDiagnosticAt.current = elapsedSeconds.current;
    }
  }, -1);

  return (
    <>
      <MothPlayer ref={playerRoot} motion={motion} />
      <CameraRig playerState={playerState} lookAngles={controls.lookAngles} />
    </>
  );
}
