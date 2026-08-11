import { useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

import { CAMERA_CONFIG } from '@/components/three/sceneConfig';

export function CameraRig() {
  const landscapePosition = useMemo(() => new Vector3(...CAMERA_CONFIG.position), []);
  const landscapeTarget = useMemo(() => new Vector3(...CAMERA_CONFIG.target), []);
  const portraitPosition = useMemo(() => new Vector3(...CAMERA_CONFIG.portraitPosition), []);
  const portraitTarget = useMemo(() => new Vector3(...CAMERA_CONFIG.portraitTarget), []);
  const desiredPosition = useRef(landscapePosition.clone());
  const desiredTarget = useRef(landscapeTarget.clone());
  const activeTarget = useRef(landscapeTarget.clone());
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useFrame(({ camera, clock, size }, delta) => {
    const portrait = size.width / size.height <= CAMERA_CONFIG.portraitAspectMax;
    const basePosition = portrait ? portraitPosition : landscapePosition;
    const baseTarget = portrait ? portraitTarget : landscapeTarget;
    const sway = prefersReducedMotion
      ? 0
      : Math.sin(clock.elapsedTime * 0.24) * CAMERA_CONFIG.idleSway;
    const verticalDrift = prefersReducedMotion ? 0 : Math.cos(clock.elapsedTime * 0.18) * 0.035;
    const damping = 1 - Math.exp(-delta * 1.8);

    desiredPosition.current.copy(basePosition);
    desiredPosition.current.x += sway;
    desiredPosition.current.y += verticalDrift;
    desiredTarget.current.copy(baseTarget);

    camera.position.lerp(desiredPosition.current, damping);
    activeTarget.current.lerp(desiredTarget.current, damping);
    camera.lookAt(activeTarget.current);
  });

  return null;
}
