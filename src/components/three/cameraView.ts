import { Vector3 } from 'three';

import { CAMERA_FOLLOW_CONFIG } from '@/components/three/sceneConfig';
import type { LookAngles } from '@/utils/playerControls';

export type CameraViewMode = 'third-person' | 'first-person';

export interface CameraViewInputState {
  readonly mode: CameraViewMode;
  readonly togglePressed: boolean;
}

export interface CameraViewKeyEvent {
  readonly type: 'keydown' | 'keyup' | 'blur';
  readonly code?: string;
  readonly repeat?: boolean;
}

export interface CameraPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const CAMERA_VIEW_TOGGLE_CODE = 'KeyT';

export const DEFAULT_CAMERA_VIEW_INPUT_STATE: CameraViewInputState = Object.freeze({
  mode: 'third-person',
  togglePressed: false,
});

export const FIRST_PERSON_CAMERA_CONFIG = Object.freeze({
  headForwardOffset: 0.38,
  headHeight: 0.07,
  lookAhead: 2.2,
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function toggleCameraView(mode: CameraViewMode): CameraViewMode {
  if (mode === 'third-person') {
    return 'first-person';
  }

  if (mode === 'first-person') {
    return 'third-person';
  }

  throw new TypeError('camera view must be third-person or first-person.');
}

export function updateCameraViewInput(
  state: CameraViewInputState,
  event: CameraViewKeyEvent,
): CameraViewInputState {
  if (event.type === 'blur') {
    return state.togglePressed ? { ...state, togglePressed: false } : state;
  }

  if (event.code !== CAMERA_VIEW_TOGGLE_CODE) {
    return state;
  }

  if (event.type === 'keyup') {
    return state.togglePressed ? { ...state, togglePressed: false } : state;
  }

  if (event.repeat === true || state.togglePressed) {
    return state;
  }

  return {
    mode: toggleCameraView(state.mode),
    togglePressed: true,
  };
}

export function writeFirstPersonCameraPose(
  desiredPosition: Vector3,
  desiredTarget: Vector3,
  playerPosition: CameraPoint,
  lookAngles: LookAngles,
): void {
  const playerX = finiteOr(playerPosition.x, 0);
  const playerY = finiteOr(playerPosition.y, 0);
  const playerZ = finiteOr(playerPosition.z, 0);
  const yaw = finiteOr(lookAngles.yaw, 0);
  const pitch = finiteOr(lookAngles.pitch, 0);
  const pitchCosine = Math.cos(pitch);
  const forwardX = Math.sin(yaw) * pitchCosine;
  const forwardY = Math.sin(pitch);
  const forwardZ = -Math.cos(yaw) * pitchCosine;

  desiredPosition.set(
    clamp(
      playerX + forwardX * FIRST_PERSON_CAMERA_CONFIG.headForwardOffset,
      -CAMERA_FOLLOW_CONFIG.maximumAbsX,
      CAMERA_FOLLOW_CONFIG.maximumAbsX,
    ),
    clamp(
      playerY +
        FIRST_PERSON_CAMERA_CONFIG.headHeight +
        forwardY * FIRST_PERSON_CAMERA_CONFIG.headForwardOffset,
      CAMERA_FOLLOW_CONFIG.minimumY,
      CAMERA_FOLLOW_CONFIG.maximumY,
    ),
    clamp(
      playerZ + forwardZ * FIRST_PERSON_CAMERA_CONFIG.headForwardOffset,
      CAMERA_FOLLOW_CONFIG.minimumZ,
      CAMERA_FOLLOW_CONFIG.maximumZ,
    ),
  );
  desiredTarget.set(
    desiredPosition.x + forwardX * FIRST_PERSON_CAMERA_CONFIG.lookAhead,
    desiredPosition.y + forwardY * FIRST_PERSON_CAMERA_CONFIG.lookAhead,
    desiredPosition.z + forwardZ * FIRST_PERSON_CAMERA_CONFIG.lookAhead,
  );
}
