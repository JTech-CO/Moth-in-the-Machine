import { RelayArchitecture } from '@/components/three/RelayArchitecture';
import {
  CORRIDOR_SECTION_Z,
  SCENE_COLORS,
  VACUUM_TUBE_POSITIONS,
} from '@/components/three/sceneConfig';
import { VacuumTube } from '@/components/three/VacuumTube';
import {
  getCorridorLayout,
  type CorridorEnvironmentId,
  type StructuralBlockDefinition,
} from '@/utils/corridorLayouts';
import type { Aabb } from '@/utils/collision';
import { getCorridorLighting } from '@/utils/corridorLighting';

const FLOOR_SEAM_Z = [-1, -6, -11, -16, -21] as const;
const GALLERY_COIL_Z = [1.2, -2.2, -6.4, -10.6, -14.8, -19, -23.2] as const;
const CORE_FRAME_Z = [0.8, -3.1, -7, -10.9, -14.8, -18.7, -22.6] as const;

function getAabbTransform(collider: Aabb) {
  return {
    position: [
      (collider.min.x + collider.max.x) / 2,
      (collider.min.y + collider.max.y) / 2,
      (collider.min.z + collider.max.z) / 2,
    ] as [number, number, number],
    size: [
      collider.max.x - collider.min.x,
      collider.max.y - collider.min.y,
      collider.max.z - collider.min.z,
    ] as [number, number, number],
  };
}

function CorridorShell({ environment }: { readonly environment: CorridorEnvironmentId }) {
  const hard = environment === 'logic-labyrinth';
  const normal = environment === 'switching-gallery';
  const floorColor = hard ? '#0c1115' : normal ? '#12191c' : SCENE_COLORS.floor;
  const railOffset = hard ? 2.85 : normal ? 2.25 : 1.35;

  return (
    <group name={`corridor-shell-${environment}`}>
      <mesh position={[0, -2.34, -10]}>
        <boxGeometry args={[10.4, 0.26, 52]} />
        <meshStandardMaterial color={floorColor} metalness={0.66} roughness={0.68} />
      </mesh>

      {FLOOR_SEAM_Z.map((seamZ) => (
        <mesh key={seamZ} position={[0, -2.19, seamZ]}>
          <boxGeometry args={[10.08, 0.025, hard ? 0.09 : 0.055]} />
          <meshStandardMaterial color={SCENE_COLORS.metalLight} metalness={0.76} roughness={0.5} />
        </mesh>
      ))}

      {[-railOffset, railOffset].map((x) => (
        <mesh key={x} position={[x, -2.18, -10]}>
          <boxGeometry args={[hard ? 0.11 : 0.075, 0.04, 52]} />
          <meshStandardMaterial
            color={hard ? '#8d3a28' : SCENE_COLORS.brass}
            metalness={0.8}
            roughness={0.36}
          />
        </mesh>
      ))}

      {[-5.16, 5.16].map((x) => (
        <mesh key={x} position={[x, 0, -10]}>
          <boxGeometry args={[0.28, 6, 52]} />
          <meshStandardMaterial color={SCENE_COLORS.metal} metalness={0.72} roughness={0.62} />
        </mesh>
      ))}

      {[-4.72, 4.72].map((x) => (
        <mesh key={x} position={[x, 2.82, -10]}>
          <boxGeometry args={[0.18, 0.18, 52]} />
          <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.82} roughness={0.34} />
        </mesh>
      ))}

      {CORRIDOR_SECTION_Z.map((sectionZ) => (
        <mesh key={sectionZ} position={[0, 2.84, sectionZ]}>
          <boxGeometry args={[10.2, 0.22, hard ? 0.32 : 0.22]} />
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

function StructuralBlock({ structure }: { readonly structure: StructuralBlockDefinition }) {
  const { position, size } = getAabbTransform(structure.collider);
  const isDeck = structure.style === 'deck';
  const isCore = structure.style === 'core';
  const primaryColor = isCore ? '#151012' : isDeck ? '#202a2d' : '#192125';
  const accentColor = isCore ? '#d94a32' : SCENE_COLORS.brass;
  const accentSize: [number, number, number] = isDeck
    ? [Math.max(0.2, size[0] * 0.84), 0.035, size[2] + 0.018]
    : [Math.min(0.07, size[0] * 0.08), Math.max(0.18, size[1] * 0.72), size[2] + 0.018];

  return (
    <group position={position} name={`corridor-structure-${structure.id}`}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color={primaryColor} metalness={0.76} roughness={0.48} />
      </mesh>
      <mesh position={[0, isDeck ? size[1] / 2 + 0.019 : 0, size[2] / 2 + 0.01]}>
        <boxGeometry args={accentSize} />
        <meshStandardMaterial
          color={accentColor}
          emissive={isCore ? accentColor : '#000000'}
          emissiveIntensity={isCore ? 1.8 : 0}
          metalness={0.82}
          roughness={0.3}
        />
      </mesh>
      {!isDeck && !isCore
        ? [-0.32, 0, 0.32].map((ratio) => (
            <mesh key={ratio} position={[0, size[1] * ratio, size[2] / 2 + 0.016]}>
              <boxGeometry args={[Math.max(0.2, size[0] * 0.72), 0.045, 0.025]} />
              <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.78} roughness={0.34} />
            </mesh>
          ))
        : null}
    </group>
  );
}

function RelayBayDecor() {
  return (
    <>
      <RelayArchitecture />
      {VACUUM_TUBE_POSITIONS.map((position) => (
        <VacuumTube key={position.join(':')} position={position} />
      ))}
    </>
  );
}

function CorridorGuideLighting({ environment }: { readonly environment: CorridorEnvironmentId }) {
  const lighting = getCorridorLighting(environment);

  return (
    <group name={`corridor-guide-lighting-${environment}`}>
      {lighting.fill === null ? null : (
        <hemisphereLight
          args={[lighting.fill.skyColor, lighting.fill.groundColor, lighting.fill.intensity]}
        />
      )}
      {lighting.fixtures.map((fixture) => (
        <group key={fixture.id} name={fixture.id} position={fixture.position}>
          <pointLight
            castShadow={fixture.castsShadow}
            color={fixture.color}
            decay={fixture.decay}
            distance={fixture.distance}
            intensity={fixture.intensity}
          />
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.62, 0.055, 0.24]} />
            <meshStandardMaterial
              color={fixture.color}
              emissive={fixture.color}
              emissiveIntensity={1.35}
              metalness={0.44}
              roughness={0.34}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SwitchingGalleryDecor() {
  return (
    <group name="switching-gallery-machinery">
      {GALLERY_COIL_Z.flatMap((z) =>
        [-1, 1].map((side) => (
          <group key={`${side}:${z}`} position={[side * 4.12, 0.25, z]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.46, 0.46, 0.28, 16]} />
              <meshStandardMaterial
                color={SCENE_COLORS.bakelite}
                metalness={0.22}
                roughness={0.7}
              />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.31, 0.055, 7, 18]} />
              <meshStandardMaterial
                color={SCENE_COLORS.brass}
                emissive={SCENE_COLORS.amber}
                emissiveIntensity={0.45}
                metalness={0.74}
                roughness={0.3}
              />
            </mesh>
          </group>
        )),
      )}
      {[-2.6, 0, 2.6].map((x) => (
        <mesh key={x} position={[x, 2.46, -10]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 48, 8]} />
          <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function LogicLabyrinthDecor() {
  return (
    <group name="logic-labyrinth-machinery">
      {CORE_FRAME_Z.map((z, index) => (
        <group key={z} position={[0, 0.2, z]}>
          <mesh>
            <torusGeometry args={[3.72, 0.07, 6, 24]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? '#8d3a28' : SCENE_COLORS.brass}
              emissive={index % 2 === 0 ? '#5a160e' : '#000000'}
              emissiveIntensity={0.8}
              metalness={0.78}
              roughness={0.34}
            />
          </mesh>
          {[-2.65, 2.65].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, x < 0 ? -0.62 : 0.62]}>
              <boxGeometry args={[0.08, 4.5, 0.08]} />
              <meshStandardMaterial
                color={SCENE_COLORS.metalLight}
                metalness={0.8}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function CorridorEnvironment({
  environment,
}: {
  readonly environment: CorridorEnvironmentId;
}) {
  const layout = getCorridorLayout(environment);

  return (
    <group name={`corridor-environment-${environment}`} userData={{ environment }}>
      <CorridorShell environment={environment} />
      <CorridorGuideLighting environment={environment} />
      {environment === 'relay-bay' ? <RelayBayDecor /> : null}
      {environment === 'switching-gallery' ? <SwitchingGalleryDecor /> : null}
      {environment === 'logic-labyrinth' ? <LogicLabyrinthDecor /> : null}
      {layout.structures.map((structure) => (
        <StructuralBlock key={structure.id} structure={structure} />
      ))}
    </group>
  );
}
