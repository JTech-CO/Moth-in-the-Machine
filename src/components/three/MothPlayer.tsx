import { forwardRef, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group } from 'three';

import type { FlightMode } from '@/utils/playerControls';

export interface MothMotionState {
  readonly elapsedSeconds: number;
  readonly flightMode: FlightMode;
  readonly speedRatio: number;
  readonly strafe: number;
}

interface MothPlayerProps {
  readonly motion: MutableRefObject<MothMotionState>;
}

const BODY_COLOR = '#3a2822';
const WING_COLOR = '#b7a589';
const WING_PATTERN_COLOR = '#74604d';
const DETAIL_COLOR = '#17110f';

function damp(current: number, target: number, lambda: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

export const MothPlayer = forwardRef<Group, MothPlayerProps>(function MothPlayer(
  { motion },
  forwardedRef,
) {
  const visualGroup = useRef<Group>(null);
  const leftWing = useRef<Group>(null);
  const rightWing = useRef<Group>(null);
  const legs = useRef<Group>(null);

  useFrame((_, delta) => {
    const visual = visualGroup.current;
    const left = leftWing.current;
    const right = rightWing.current;
    const legGroup = legs.current;

    if (visual === null || left === null || right === null || legGroup === null) {
      return;
    }

    const state = motion.current;
    const landingReady = state.flightMode === 'landing-ready';
    const frequency = landingReady ? 7.2 : 8 + state.speedRatio * 1.4;
    const amplitude = landingReady ? 0.38 : 0.43 + state.speedRatio * 0.1;
    const flap = Math.sin(state.elapsedSeconds * frequency * Math.PI * 2) * amplitude;

    left.rotation.z = flap;
    right.rotation.z = -flap;
    visual.rotation.x = damp(
      visual.rotation.x,
      landingReady ? 0 : state.speedRatio * 0.16,
      8,
      delta,
    );
    visual.rotation.z = damp(visual.rotation.z, -state.strafe * 0.28, 9, delta);
    legGroup.rotation.x = damp(legGroup.rotation.x, landingReady ? -0.62 : 0.18, 10, delta);
    legGroup.position.y = damp(legGroup.position.y, landingReady ? -0.08 : -0.02, 10, delta);
  });

  return (
    <group ref={forwardedRef} name="m5-player-moth">
      <group ref={visualGroup}>
        <group ref={leftWing} position={[-0.08, 0.015, -0.02]}>
          <mesh position={[-0.13, 0, -0.07]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.19, 16]} />
            <meshStandardMaterial
              color={WING_COLOR}
              metalness={0}
              roughness={0.9}
              side={DoubleSide}
            />
          </mesh>
          <mesh
            position={[-0.1, -0.002, 0.11]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.82, 0.68, 1]}
          >
            <circleGeometry args={[0.17, 14]} />
            <meshStandardMaterial
              color={WING_PATTERN_COLOR}
              metalness={0}
              roughness={0.94}
              side={DoubleSide}
            />
          </mesh>
        </group>

        <group ref={rightWing} position={[0.08, 0.015, -0.02]}>
          <mesh position={[0.13, 0, -0.07]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.19, 16]} />
            <meshStandardMaterial
              color={WING_COLOR}
              metalness={0}
              roughness={0.9}
              side={DoubleSide}
            />
          </mesh>
          <mesh
            position={[0.1, -0.002, 0.11]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.82, 0.68, 1]}
          >
            <circleGeometry args={[0.17, 14]} />
            <meshStandardMaterial
              color={WING_PATTERN_COLOR}
              metalness={0}
              roughness={0.94}
              side={DoubleSide}
            />
          </mesh>
        </group>

        <mesh position={[0, 0, 0.17]} scale={[0.11, 0.095, 0.27]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={BODY_COLOR} metalness={0} roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.012, -0.06]} scale={[0.145, 0.12, 0.19]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={BODY_COLOR} metalness={0} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.015, -0.25]}>
          <sphereGeometry args={[0.09, 12, 8]} />
          <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.88} />
        </mesh>

        <mesh position={[-0.052, 0.055, -0.36]} rotation={[1.12, 0, -0.28]}>
          <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
          <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.9} />
        </mesh>
        <mesh position={[0.052, 0.055, -0.36]} rotation={[1.12, 0, 0.28]}>
          <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
          <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.9} />
        </mesh>

        <group ref={legs} position={[0, -0.02, 0]}>
          {[-1, 1].map((side) => (
            <group key={side} scale={[side, 1, 1]}>
              <mesh position={[0.105, -0.09, -0.05]} rotation={[0.35, 0, -0.62]}>
                <cylinderGeometry args={[0.009, 0.007, 0.23, 6]} />
                <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.92} />
              </mesh>
              <mesh position={[0.115, -0.09, 0.13]} rotation={[-0.28, 0, -0.72]}>
                <cylinderGeometry args={[0.009, 0.007, 0.24, 6]} />
                <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.92} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
});
