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
const HINDWING_COLOR = '#9e896d';
const WING_PATTERN_COLOR = '#74604d';
const DETAIL_COLOR = '#17110f';
const EYE_COLOR = '#d9a83a';

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
  const leftHindWing = useRef<Group>(null);
  const rightHindWing = useRef<Group>(null);
  const legs = useRef<Group>(null);

  useFrame((_, delta) => {
    const visual = visualGroup.current;
    const left = leftWing.current;
    const right = rightWing.current;
    const leftHind = leftHindWing.current;
    const rightHind = rightHindWing.current;
    const legGroup = legs.current;

    if (
      visual === null ||
      left === null ||
      right === null ||
      leftHind === null ||
      rightHind === null ||
      legGroup === null
    ) {
      return;
    }

    const state = motion.current;
    const landingReady = state.flightMode === 'landing-ready';
    const frequency = landingReady ? 6.8 : 7.8 + state.speedRatio * 1.6;
    const amplitude = landingReady ? 0.3 : 0.44 + state.speedRatio * 0.11;
    const phase = state.elapsedSeconds * frequency * Math.PI * 2;
    const flap = Math.sin(phase) * amplitude;
    const hindFlap = Math.sin(phase + 0.42) * amplitude * 0.78;

    left.rotation.z = flap;
    right.rotation.z = -flap;
    leftHind.rotation.z = hindFlap - flap;
    rightHind.rotation.z = -hindFlap + flap;
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
          <mesh
            position={[-0.14, 0, -0.085]}
            rotation={[-Math.PI / 2, 0, -0.16]}
            scale={[1.08, 0.78, 1]}
          >
            <circleGeometry args={[0.19, 16]} />
            <meshStandardMaterial
              color={WING_COLOR}
              metalness={0}
              roughness={0.9}
              side={DoubleSide}
            />
          </mesh>
          <group ref={leftHindWing}>
            <mesh
              position={[-0.1, -0.002, 0.11]}
              rotation={[-Math.PI / 2, 0, 0.18]}
              scale={[0.88, 0.72, 1]}
            >
              <circleGeometry args={[0.17, 14]} />
              <meshStandardMaterial
                color={HINDWING_COLOR}
                metalness={0}
                roughness={0.94}
                side={DoubleSide}
              />
            </mesh>
            <mesh
              position={[-0.115, 0.002, 0.12]}
              rotation={[-Math.PI / 2, 0, 0.18]}
              scale={[1.35, 0.65, 1]}
            >
              <circleGeometry args={[0.045, 10]} />
              <meshStandardMaterial
                color={WING_PATTERN_COLOR}
                metalness={0}
                roughness={0.96}
                side={DoubleSide}
              />
            </mesh>
          </group>
        </group>

        <group ref={rightWing} position={[0.08, 0.015, -0.02]}>
          <mesh
            position={[0.14, 0, -0.085]}
            rotation={[-Math.PI / 2, 0, 0.16]}
            scale={[1.08, 0.78, 1]}
          >
            <circleGeometry args={[0.19, 16]} />
            <meshStandardMaterial
              color={WING_COLOR}
              metalness={0}
              roughness={0.9}
              side={DoubleSide}
            />
          </mesh>
          <group ref={rightHindWing}>
            <mesh
              position={[0.1, -0.002, 0.11]}
              rotation={[-Math.PI / 2, 0, -0.18]}
              scale={[0.88, 0.72, 1]}
            >
              <circleGeometry args={[0.17, 14]} />
              <meshStandardMaterial
                color={HINDWING_COLOR}
                metalness={0}
                roughness={0.94}
                side={DoubleSide}
              />
            </mesh>
            <mesh
              position={[0.115, 0.002, 0.12]}
              rotation={[-Math.PI / 2, 0, -0.18]}
              scale={[1.35, 0.65, 1]}
            >
              <circleGeometry args={[0.045, 10]} />
              <meshStandardMaterial
                color={WING_PATTERN_COLOR}
                metalness={0}
                roughness={0.96}
                side={DoubleSide}
              />
            </mesh>
          </group>
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

        {[-1, 1].map((side) => (
          <mesh key={`eye-${side}`} position={[side * 0.052, 0.06, -0.295]}>
            <sphereGeometry args={[0.016, 8, 6]} />
            <meshStandardMaterial
              color={EYE_COLOR}
              emissive={EYE_COLOR}
              emissiveIntensity={0.55}
              metalness={0.1}
              roughness={0.44}
            />
          </mesh>
        ))}

        <mesh position={[-0.052, 0.055, -0.36]} rotation={[1.12, 0, -0.28]}>
          <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
          <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.9} />
        </mesh>
        <mesh position={[-0.13, 0.08, -0.43]} rotation={[1.35, 0, -0.62]}>
          <cylinderGeometry args={[0.004, 0.007, 0.13, 6]} />
          <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.94} />
        </mesh>
        <mesh position={[0.052, 0.055, -0.36]} rotation={[1.12, 0, 0.28]}>
          <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
          <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.9} />
        </mesh>
        <mesh position={[0.13, 0.08, -0.43]} rotation={[1.35, 0, 0.62]}>
          <cylinderGeometry args={[0.004, 0.007, 0.13, 6]} />
          <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.94} />
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
              <mesh position={[0.1, -0.085, 0.27]} rotation={[-0.62, 0, -0.58]}>
                <cylinderGeometry args={[0.008, 0.005, 0.21, 6]} />
                <meshStandardMaterial color={DETAIL_COLOR} metalness={0} roughness={0.94} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
});
