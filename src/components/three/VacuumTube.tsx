import { SCENE_COLORS, type SceneVector } from '@/components/three/sceneConfig';

interface VacuumTubeProps {
  readonly position: SceneVector;
}

export function VacuumTube({ position }: VacuumTubeProps) {
  const wallOffset = position[0] < 0 ? -0.16 : 0.16;

  return (
    <group position={position} name="cabinet-mounted-vacuum-tube">
      <mesh position={[wallOffset, 0, 0]}>
        <boxGeometry args={[0.1, 1.16, 0.62]} />
        <meshStandardMaterial color={SCENE_COLORS.metalLight} metalness={0.68} roughness={0.58} />
      </mesh>

      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.17, 0.22, 0.76, 16]} />
        <meshStandardMaterial
          color={SCENE_COLORS.cream}
          emissive={SCENE_COLORS.amber}
          emissiveIntensity={0.34}
          opacity={0.3}
          roughness={0.2}
          transparent
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.48, 8]} />
        <meshStandardMaterial
          color={SCENE_COLORS.amber}
          emissive={SCENE_COLORS.amber}
          emissiveIntensity={2.2}
          roughness={0.42}
        />
      </mesh>

      <mesh position={[0, -0.39, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.18, 16]} />
        <meshStandardMaterial color={SCENE_COLORS.bakelite} metalness={0.34} roughness={0.58} />
      </mesh>

      <pointLight
        position={[0, 0.32, 0]}
        color={SCENE_COLORS.amber}
        intensity={34}
        distance={7}
        decay={2}
      />
    </group>
  );
}
