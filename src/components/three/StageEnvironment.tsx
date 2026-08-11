import { useCallback } from 'react';
import {
  PerformanceMonitor,
  type PerformanceMonitorApi,
} from '@react-three/drei/core/PerformanceMonitor.js';

import { PlayerFlightRig } from '@/components/three/PlayerFlightRig';
import { RelayArchitecture } from '@/components/three/RelayArchitecture';
import {
  CORRIDOR_SECTION_Z,
  FOG_CONFIG,
  getPerformanceBounds,
  PERFORMANCE_CONFIG,
  SCENE_COLORS,
  VACUUM_TUBE_POSITIONS,
} from '@/components/three/sceneConfig';
import { VacuumTube } from '@/components/three/VacuumTube';

const FLOOR_SEAM_Z = [-1, -6, -11, -16, -21] as const;

interface StageEnvironmentProps {
  readonly onPerformanceFactorChange: (factor: number) => void;
}

function AdaptiveSceneDpr({ onPerformanceFactorChange }: StageEnvironmentProps) {
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

function CorridorShell() {
  return (
    <group name="mark-ii-corridor-shell">
      <mesh position={[0, -2.34, -10]}>
        <boxGeometry args={[10.4, 0.26, 52]} />
        <meshStandardMaterial color={SCENE_COLORS.floor} metalness={0.66} roughness={0.68} />
      </mesh>

      {FLOOR_SEAM_Z.map((seamZ) => (
        <mesh key={seamZ} position={[0, -2.19, seamZ]}>
          <boxGeometry args={[10.08, 0.025, 0.055]} />
          <meshStandardMaterial color={SCENE_COLORS.metalLight} metalness={0.76} roughness={0.5} />
        </mesh>
      ))}

      <mesh position={[-1.35, -2.18, -10]}>
        <boxGeometry args={[0.075, 0.04, 52]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.8} roughness={0.36} />
      </mesh>
      <mesh position={[1.35, -2.18, -10]}>
        <boxGeometry args={[0.075, 0.04, 52]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.8} roughness={0.36} />
      </mesh>

      <mesh position={[-5.16, 0, -10]}>
        <boxGeometry args={[0.28, 6, 52]} />
        <meshStandardMaterial color={SCENE_COLORS.metal} metalness={0.72} roughness={0.62} />
      </mesh>
      <mesh position={[5.16, 0, -10]}>
        <boxGeometry args={[0.28, 6, 52]} />
        <meshStandardMaterial color={SCENE_COLORS.metal} metalness={0.72} roughness={0.62} />
      </mesh>

      <mesh position={[-4.72, 2.82, -10]}>
        <boxGeometry args={[0.18, 0.18, 52]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.82} roughness={0.34} />
      </mesh>
      <mesh position={[4.72, 2.82, -10]}>
        <boxGeometry args={[0.18, 0.18, 52]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.82} roughness={0.34} />
      </mesh>

      <mesh position={[-4.01, 1.96, -10]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 48, 8]} />
        <meshStandardMaterial color={SCENE_COLORS.bakelite} metalness={0.22} roughness={0.72} />
      </mesh>
      <mesh position={[4.01, 1.72, -10]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 48, 8]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.58} roughness={0.48} />
      </mesh>

      {CORRIDOR_SECTION_Z.map((sectionZ) => (
        <mesh key={sectionZ} position={[0, 2.84, sectionZ]}>
          <boxGeometry args={[10.2, 0.22, 0.22]} />
          <meshStandardMaterial color={SCENE_COLORS.metalLight} metalness={0.74} roughness={0.5} />
        </mesh>
      ))}

      <mesh position={[0, 0, -27]}>
        <boxGeometry args={[10.4, 6, 0.32]} />
        <meshStandardMaterial color={SCENE_COLORS.metal} metalness={0.68} roughness={0.64} />
      </mesh>
    </group>
  );
}

export function StageEnvironment({ onPerformanceFactorChange }: StageEnvironmentProps) {
  return (
    <>
      <color attach="background" args={[SCENE_COLORS.background]} />
      <fog attach="fog" args={[SCENE_COLORS.fog, FOG_CONFIG.near, FOG_CONFIG.far]} />

      <ambientLight color={SCENE_COLORS.cream} intensity={0.38} />

      <CorridorShell />
      <RelayArchitecture />

      {VACUUM_TUBE_POSITIONS.map((position) => (
        <VacuumTube key={position.join(':')} position={position} />
      ))}

      <PlayerFlightRig />
      <AdaptiveSceneDpr onPerformanceFactorChange={onPerformanceFactorChange} />
    </>
  );
}
