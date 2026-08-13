import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';

import {
  CAMERA_VIEW_TOGGLE_CODE,
  DEFAULT_CAMERA_VIEW_INPUT_STATE,
  updateCameraViewInput,
  writeFirstPersonCameraPose,
  type CameraViewMode,
} from '@/components/three/cameraView';
import { CAMERA_CONFIG, CAMERA_FOLLOW_CONFIG } from '@/components/three/sceneConfig';
import type { LookAngles } from '@/utils/playerControls';
import type { PlayerSimulationState } from '@/utils/playerPhysics';

interface CameraRigProps {
  readonly lookAngles: MutableRefObject<LookAngles>;
  readonly playerState: MutableRefObject<PlayerSimulationState>;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function CameraRig({ lookAngles, playerState }: CameraRigProps) {
  const desiredPosition = useRef(new Vector3(...CAMERA_CONFIG.position));
  const desiredTarget = useRef(new Vector3(...CAMERA_CONFIG.target));
  const activeTarget = useRef(new Vector3(...CAMERA_CONFIG.target));
  const cameraViewInput = useRef({ ...DEFAULT_CAMERA_VIEW_INPUT_STATE });
  const activeCameraView = useRef<CameraViewMode>('third-person');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== CAMERA_VIEW_TOGGLE_CODE) {
        return;
      }

      event.preventDefault();
      const previousMode = cameraViewInput.current.mode;
      cameraViewInput.current = updateCameraViewInput(cameraViewInput.current, {
        type: 'keydown',
        code: event.code,
        repeat: event.repeat,
      });

      if (import.meta.env.DEV && cameraViewInput.current.mode !== previousMode) {
        console.info('[M6 camera]', { mode: cameraViewInput.current.mode });
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== CAMERA_VIEW_TOGGLE_CODE) {
        return;
      }

      event.preventDefault();
      cameraViewInput.current = updateCameraViewInput(cameraViewInput.current, {
        type: 'keyup',
        code: event.code,
      });
    };
    const handleBlur = () => {
      cameraViewInput.current = updateCameraViewInput(cameraViewInput.current, { type: 'blur' });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame(({ camera, size }, delta) => {
    const { position } = playerState.current;
    const { yaw, pitch } = lookAngles.current;
    const portrait = size.width / size.height <= CAMERA_CONFIG.portraitAspectMax;
    const cameraView = cameraViewInput.current.mode;
    const distance = portrait
      ? CAMERA_FOLLOW_CONFIG.portraitDistance
      : CAMERA_FOLLOW_CONFIG.landscapeDistance;
    const yawSine = Math.sin(yaw);
    const yawCosine = Math.cos(yaw);
    const pitchCosine = Math.cos(pitch);
    const forwardX = yawSine * pitchCosine;
    const forwardY = Math.sin(pitch);
    const forwardZ = -yawCosine * pitchCosine;
    const dampingDelta = Number.isFinite(delta)
      ? clamp(delta, 0, CAMERA_FOLLOW_CONFIG.maximumDampingDelta)
      : 0;
    const positionDamping = 1 - Math.exp(-CAMERA_FOLLOW_CONFIG.positionDamping * dampingDelta);
    const targetDamping = 1 - Math.exp(-CAMERA_FOLLOW_CONFIG.targetDamping * dampingDelta);

    if (cameraView === 'first-person') {
      writeFirstPersonCameraPose(
        desiredPosition.current,
        desiredTarget.current,
        position,
        lookAngles.current,
      );
    } else {
      desiredPosition.current.set(
        clamp(
          position.x - yawSine * distance,
          -CAMERA_FOLLOW_CONFIG.maximumAbsX,
          CAMERA_FOLLOW_CONFIG.maximumAbsX,
        ),
        clamp(
          position.y + CAMERA_FOLLOW_CONFIG.height,
          CAMERA_FOLLOW_CONFIG.minimumY,
          CAMERA_FOLLOW_CONFIG.maximumY,
        ),
        clamp(
          position.z + yawCosine * distance,
          CAMERA_FOLLOW_CONFIG.minimumZ,
          CAMERA_FOLLOW_CONFIG.maximumZ,
        ),
      );
      desiredTarget.current.set(
        position.x + forwardX * CAMERA_FOLLOW_CONFIG.lookAhead,
        position.y + forwardY * CAMERA_FOLLOW_CONFIG.lookAhead,
        position.z + forwardZ * CAMERA_FOLLOW_CONFIG.lookAhead,
      );
    }

    if (activeCameraView.current !== cameraView) {
      camera.position.copy(desiredPosition.current);
      activeTarget.current.copy(desiredTarget.current);
      activeCameraView.current = cameraView;
    } else {
      camera.position.lerp(desiredPosition.current, positionDamping);
      activeTarget.current.lerp(desiredTarget.current, targetDamping);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(activeTarget.current);
  });

  return null;
}
