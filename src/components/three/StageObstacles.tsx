import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, Quaternion, Vector3, type Group, type InstancedMesh } from 'three';

import { PLAYER_CONFIG, SCENE_COLORS } from '@/components/three/sceneConfig';
import { LANDING_MAX_DISTANCE, type Aabb, type Vec3 } from '@/utils/collision';
import type { LandingTargetDefinition, ObstacleDefinition, StageDefinition } from '@/utils/stages';

const HAZARD_RED = '#d94a32';
const COPPER_COLOR = '#b87333';
const CERAMIC_COLOR = '#d2c7ad';
const SPARK_PATH = [
  [-0.58, 0],
  [-0.3, 0.2],
  [-0.08, -0.16],
  [0.16, 0.18],
  [0.38, -0.1],
  [0.58, 0],
] as const;
const SPARK_BRANCH_PATH = [
  [0.02, 0.02],
  [0.2, 0.34],
  [0.38, 0.23],
] as const;

type WireDefinition = Extract<ObstacleDefinition, { readonly type: 'wire' }>;
type SparkDefinition = Extract<ObstacleDefinition, { readonly type: 'spark' }>;
type OverheatedRelayDefinition = Extract<ObstacleDefinition, { readonly type: 'overheated-relay' }>;
type VacuumTubeDefinition = Extract<ObstacleDefinition, { readonly type: 'vacuum-tube' }>;

function toPosition(vector: Vec3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

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

function WireObstacle({ obstacle }: { readonly obstacle: WireDefinition }) {
  const { position, size } = getAabbTransform(obstacle.collider);
  const terminalHeight = Math.min(0.12, size[1] * 0.08);
  const conductorRadius = Math.min(size[0], size[2]) * 0.16;
  const insulatorRadius = Math.min(size[0], size[2]) * 0.44;
  const insulatorHeight = Math.min(0.34, size[1] * 0.1);
  const terminalY = size[1] / 2 - terminalHeight / 2;
  const insulatorPositions = [-size[1] * 0.28, 0, size[1] * 0.28] as const;

  return (
    <group
      position={position}
      name={`m6-obstacle-${obstacle.id}`}
      userData={{ hazardKind: 'live-wire' }}
    >
      <mesh>
        <cylinderGeometry args={[conductorRadius, conductorRadius, size[1], 8]} />
        <meshStandardMaterial
          color={COPPER_COLOR}
          emissive={HAZARD_RED}
          emissiveIntensity={0.22}
          metalness={0.72}
          roughness={0.38}
        />
      </mesh>

      {insulatorPositions.map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[insulatorRadius, insulatorRadius * 0.9, insulatorHeight, 10]} />
          <meshStandardMaterial color={CERAMIC_COLOR} metalness={0.06} roughness={0.76} />
        </mesh>
      ))}

      {[-terminalY, terminalY].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[insulatorRadius * 0.78, terminalHeight * 0.28, 6, 12]} />
          <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.84} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

interface SparkSegmentProps {
  readonly end: readonly [number, number];
  readonly radius: number;
  readonly start: readonly [number, number];
}

function SparkSegment({ end, radius, start }: SparkSegmentProps) {
  const deltaX = (end[0] - start[0]) * radius;
  const deltaY = (end[1] - start[1]) * radius;
  const length = Math.hypot(deltaX, deltaY);
  const thickness = Math.max(0.025, radius * 0.055);

  return (
    <mesh
      position={[((start[0] + end[0]) * radius) / 2, ((start[1] + end[1]) * radius) / 2, 0]}
      rotation={[0, 0, Math.atan2(deltaY, deltaX)]}
    >
      <boxGeometry args={[length, thickness, thickness]} />
      <meshStandardMaterial
        color={SCENE_COLORS.cream}
        emissive={SCENE_COLORS.amber}
        emissiveIntensity={3.2}
        roughness={0.26}
      />
    </mesh>
  );
}

function SparkObstacle({ obstacle }: { readonly obstacle: SparkDefinition }) {
  const { center, radius } = obstacle.collider;
  const contactOffset = radius * 0.72;
  const contactRadius = Math.max(0.075, radius * 0.15);
  const sparkArc = useRef<Group>(null);
  const phase = Array.from(obstacle.id).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );

  useFrame(({ clock }) => {
    const arc = sparkArc.current;

    if (arc === null) {
      return;
    }

    const pulse = clock.elapsedTime * 16 + phase;
    arc.scale.y = 0.94 + Math.abs(Math.sin(pulse)) * 0.09;
    arc.rotation.z = Math.sin(pulse * 0.73) * 0.025;
  });

  return (
    <group
      position={toPosition(center)}
      name={`m6-obstacle-${obstacle.id}`}
      userData={{ hazardKind: 'electrical-arc' }}
    >
      <group ref={sparkArc}>
        {SPARK_PATH.slice(0, -1).map((point, index) => (
          <SparkSegment
            key={`main-${point[0]}:${point[1]}`}
            start={point}
            end={SPARK_PATH[index + 1]}
            radius={radius}
          />
        ))}
        {SPARK_BRANCH_PATH.slice(0, -1).map((point, index) => (
          <SparkSegment
            key={`branch-${point[0]}:${point[1]}`}
            start={point}
            end={SPARK_BRANCH_PATH[index + 1]}
            radius={radius}
          />
        ))}
      </group>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * contactOffset, 0, 0]}>
          <mesh>
            <sphereGeometry args={[contactRadius, 10, 8]} />
            <meshStandardMaterial
              color={SCENE_COLORS.amber}
              emissive={SCENE_COLORS.amber}
              emissiveIntensity={1.8}
              metalness={0.48}
              roughness={0.28}
            />
          </mesh>
          <mesh position={[side * contactRadius * 0.78, 0, 0]}>
            <cylinderGeometry
              args={[contactRadius * 1.35, contactRadius * 1.35, contactRadius, 10]}
            />
            <meshStandardMaterial color={SCENE_COLORS.bakelite} metalness={0.12} roughness={0.76} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function OverheatedRelayObstacle({ obstacle }: { readonly obstacle: OverheatedRelayDefinition }) {
  const bodyDepth = Math.max(0.26, obstacle.coreRadius * 0.68);
  const bodyHeight = obstacle.coreRadius * 1.3;
  const bodyWidth = obstacle.coreRadius * 1.46;
  const corridorFacingSide = obstacle.center.x < 0 ? 1 : -1;
  const faceX = corridorFacingSide * (bodyDepth / 2 + 0.021);
  const coilRadius = bodyWidth * 0.21;
  const coilCenterX = faceX + corridorFacingSide * 0.07;
  const terminalX = faceX + corridorFacingSide * 0.11;

  return (
    <group
      position={toPosition(obstacle.center)}
      name={`m6-obstacle-${obstacle.id}`}
      userData={{ hazardKind: 'overheated-relay' }}
    >
      <mesh>
        <boxGeometry args={[bodyDepth, bodyHeight, bodyWidth]} />
        <meshStandardMaterial color={SCENE_COLORS.bakelite} metalness={0.16} roughness={0.7} />
      </mesh>

      <mesh position={[faceX, 0, 0]}>
        <boxGeometry args={[0.04, bodyHeight * 0.72, bodyWidth * 0.82]} />
        <meshStandardMaterial color={COPPER_COLOR} metalness={0.72} roughness={0.38} />
      </mesh>

      <mesh position={[coilCenterX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[coilRadius * 0.72, coilRadius * 0.72, 0.15, 12]} />
        <meshStandardMaterial
          color={HAZARD_RED}
          emissive={HAZARD_RED}
          emissiveIntensity={1.65}
          metalness={0.34}
          roughness={0.42}
        />
      </mesh>

      {[-0.045, 0, 0.045].map((offset) => (
        <mesh
          key={offset}
          position={[coilCenterX + corridorFacingSide * offset, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <torusGeometry args={[coilRadius, coilRadius * 0.12, 6, 14]} />
          <meshStandardMaterial
            color={SCENE_COLORS.amber}
            emissive={HAZARD_RED}
            emissiveIntensity={2.35}
            metalness={0.68}
            roughness={0.3}
          />
        </mesh>
      ))}

      <mesh
        position={[faceX + corridorFacingSide * 0.09, bodyHeight * 0.3, 0]}
        rotation={[0, 0, corridorFacingSide * -0.16]}
      >
        <boxGeometry args={[0.055, bodyHeight * 0.12, bodyWidth * 0.72]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.82} roughness={0.28} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[terminalX, -bodyHeight * 0.31, side * bodyWidth * 0.27]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[bodyWidth * 0.055, bodyWidth * 0.055, 0.18, 8]} />
          <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.86} roughness={0.26} />
        </mesh>
      ))}
    </group>
  );
}

function VacuumTubeObstacle({ obstacle }: { readonly obstacle: VacuumTubeDefinition }) {
  const { center, radius } = obstacle.collider;
  const glassRadius = Math.min(0.36, radius * 0.29);
  const glassHeight = Math.min(1.35, radius * 1.08);
  const baseRadius = glassRadius * 1.18;
  const supportOffset = glassRadius * 0.34;

  return (
    <group
      position={toPosition(center)}
      name={`m6-obstacle-${obstacle.id}`}
      userData={{ hazardKind: 'unstable-vacuum-tube' }}
    >
      <mesh position={[0, -glassHeight * 0.46, 0]}>
        <cylinderGeometry args={[baseRadius, baseRadius, glassHeight * 0.18, 14]} />
        <meshStandardMaterial color={SCENE_COLORS.bakelite} metalness={0.34} roughness={0.58} />
      </mesh>

      <mesh position={[0, -glassHeight * 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[baseRadius * 0.78, baseRadius * 0.12, 6, 16]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.8} roughness={0.3} />
      </mesh>

      <mesh
        position={[0, glassHeight * 0.02, 0]}
        scale={[glassRadius, glassHeight * 0.54, glassRadius]}
      >
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial
          color={SCENE_COLORS.cream}
          emissive={SCENE_COLORS.amber}
          emissiveIntensity={0.38}
          opacity={0.24}
          roughness={0.18}
          transparent
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, glassHeight * 0.03, 0]}>
        <cylinderGeometry args={[glassRadius * 0.1, glassRadius * 0.1, glassHeight * 0.52, 8]} />
        <meshStandardMaterial
          color={HAZARD_RED}
          emissive={SCENE_COLORS.amber}
          emissiveIntensity={3.6}
          roughness={0.34}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * supportOffset, -glassHeight * 0.08, 0]}>
          <cylinderGeometry
            args={[glassRadius * 0.035, glassRadius * 0.035, glassHeight * 0.58, 6]}
          />
          <meshStandardMaterial color={COPPER_COLOR} metalness={0.78} roughness={0.34} />
        </mesh>
      ))}

      <mesh position={[0, glassHeight * 0.2, 0]}>
        <boxGeometry args={[supportOffset * 2, glassRadius * 0.045, glassRadius * 0.045]} />
        <meshStandardMaterial
          color={SCENE_COLORS.amber}
          emissive={SCENE_COLORS.amber}
          emissiveIntensity={2.7}
          metalness={0.62}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[0, glassHeight * 0.51, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[glassRadius * 0.68, glassRadius * 0.08, 6, 14]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.76} roughness={0.34} />
      </mesh>

      {[0, Math.PI / 2].map((rotationY) => (
        <mesh key={rotationY} rotation={[0, rotationY, 0]}>
          <torusGeometry args={[radius * 0.9, Math.max(0.012, radius * 0.015), 5, 24]} />
          <meshStandardMaterial
            color={HAZARD_RED}
            emissive={HAZARD_RED}
            emissiveIntensity={1.45}
            opacity={0.72}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

interface DressingTransform {
  readonly position: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly scale: readonly [number, number, number];
}

const NORMAL_FRAME_TRANSFORMS: readonly DressingTransform[] = [
  ...[1, -4, -9, -14, -19, -24].map((z): DressingTransform => ({
    position: [0, 2.82, z],
    scale: [8.12, 0.1, 0.12],
  })),
  ...[-1, 1].flatMap((side) =>
    [-2, -10, -18].map((z): DressingTransform => ({
      position: [side * 4.08, 1.36, z],
      scale: [0.08, 0.34, 1.4],
    })),
  ),
];

const NORMAL_CONDUIT_TRANSFORMS: readonly DressingTransform[] = [-2.4, 0, 2.4].map(
  (x): DressingTransform => ({
    position: [x, 2.77, -10],
    rotation: [Math.PI / 2, 0, 0],
    scale: [0.035, 30, 0.035],
  }),
);

const HARD_FRAME_TRANSFORMS: readonly DressingTransform[] = [
  ...[1, -3, -7, -11, -15, -19, -23].flatMap((z): DressingTransform[] => [
    {
      position: [0, 2.83, z],
      scale: [8.18, 0.14, 0.18],
    },
    {
      position: [-4.1, 0.28, z],
      scale: [0.14, 5.08, 0.18],
    },
    {
      position: [4.1, 0.28, z],
      scale: [0.14, 5.08, 0.18],
    },
  ]),
  ...[-1, 1].flatMap((side) =>
    [-1, -5, -9, -13, -17, -21].map((z, index): DressingTransform => ({
      position: [side * 4.1, 0.18, z],
      rotation: [index % 2 === 0 ? 0.72 : -0.72, 0, 0],
      scale: [0.075, 2.2, 0.11],
    })),
  ),
];

const HARD_BUSBAR_TRANSFORMS: readonly DressingTransform[] = [-2.7, -0.9, 0.9, 2.7].map(
  (x): DressingTransform => ({
    position: [x, 2.76, -10],
    rotation: [Math.PI / 2, 0, 0],
    scale: [0.045, 30, 0.045],
  }),
);

interface DressingInstancesProps {
  readonly color: string;
  readonly emissive?: string;
  readonly kind: 'box' | 'cylinder';
  readonly name: string;
  readonly transforms: readonly DressingTransform[];
}

function DressingInstances({ color, emissive, kind, name, transforms }: DressingInstancesProps) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instances = mesh.current;

    if (instances === null) {
      return;
    }

    const dummy = new Object3D();

    transforms.forEach((transform, index) => {
      const rotation = transform.rotation ?? [0, 0, 0];

      dummy.position.set(...transform.position);
      dummy.rotation.set(...rotation);
      dummy.scale.set(...transform.scale);
      dummy.updateMatrix();
      instances.setMatrixAt(index, dummy.matrix);
    });

    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [transforms]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, transforms.length]} name={name}>
      {kind === 'box' ? <boxGeometry args={[1, 1, 1]} /> : <cylinderGeometry args={[1, 1, 1, 8]} />}
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissive === undefined ? 0 : 0.45}
        metalness={0.78}
        roughness={0.42}
      />
    </instancedMesh>
  );
}

function StageCorridorDressing({
  difficulty,
}: {
  readonly difficulty: StageDefinition['difficulty'];
}) {
  if (difficulty === 'tutorial' || difficulty === 'easy') {
    return null;
  }

  if (difficulty === 'normal') {
    return (
      <group name="m6-normal-cable-gallery" userData={{ environmentVariant: 'normal' }}>
        <DressingInstances
          color={SCENE_COLORS.metalLight}
          kind="box"
          name="m6-normal-cable-ladder"
          transforms={NORMAL_FRAME_TRANSFORMS}
        />
        <DressingInstances
          color={COPPER_COLOR}
          kind="cylinder"
          name="m6-normal-overhead-conduits"
          transforms={NORMAL_CONDUIT_TRANSFORMS}
        />
      </group>
    );
  }

  return (
    <group name="m6-hard-braced-busway" userData={{ environmentVariant: 'hard' }}>
      <DressingInstances
        color={SCENE_COLORS.metalLight}
        kind="box"
        name="m6-hard-portal-bracing"
        transforms={HARD_FRAME_TRANSFORMS}
      />
      <DressingInstances
        color={HAZARD_RED}
        emissive={HAZARD_RED}
        kind="cylinder"
        name="m6-hard-hot-busbars"
        transforms={HARD_BUSBAR_TRANSFORMS}
      />
    </group>
  );
}

function renderObstacle(obstacle: ObstacleDefinition) {
  switch (obstacle.type) {
    case 'wire':
      return <WireObstacle key={obstacle.id} obstacle={obstacle} />;
    case 'spark':
      return <SparkObstacle key={obstacle.id} obstacle={obstacle} />;
    case 'overheated-relay':
      return <OverheatedRelayObstacle key={obstacle.id} obstacle={obstacle} />;
    case 'vacuum-tube':
      return <VacuumTubeObstacle key={obstacle.id} obstacle={obstacle} />;
  }
}

export function StageObstacles({ stage }: { readonly stage: StageDefinition }) {
  return (
    <group
      name={`m6-stage-${stage.id}-obstacles`}
      userData={{ stageId: stage.id, stageName: stage.name }}
    >
      <StageCorridorDressing difficulty={stage.difficulty} />
      {stage.obstacles.map(renderObstacle)}
    </group>
  );
}

interface LandingTargetProps {
  readonly label: string;
  readonly target: LandingTargetDefinition;
}

export function LandingTarget({ label, target }: LandingTargetProps) {
  const { normal: configuredNormal, position, surface } = target;
  const unitNormal = new Vector3(configuredNormal.x, configuredNormal.y, configuredNormal.z);

  if (unitNormal.lengthSq() < Number.EPSILON) {
    unitNormal.set(0, 1, 0);
  } else {
    unitNormal.normalize();
  }

  const clearance =
    Math.abs(unitNormal.x) * PLAYER_CONFIG.halfExtents[0] +
    Math.abs(unitNormal.y) * PLAYER_CONFIG.halfExtents[1] +
    Math.abs(unitNormal.z) * PLAYER_CONFIG.halfExtents[2];
  const surfacePosition: [number, number, number] = [
    position.x - unitNormal.x * clearance,
    position.y - unitNormal.y * clearance,
    position.z - unitNormal.z * clearance,
  ];
  const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), unitNormal);

  return (
    <group
      position={surfacePosition}
      quaternion={[orientation.x, orientation.y, orientation.z, orientation.w]}
      name="m6-landing-target"
      userData={{
        label,
        landingRadius: LANDING_MAX_DISTANCE,
        surface,
        normal: [unitNormal.x, unitNormal.y, unitNormal.z],
      }}
    >
      <mesh position={[0, -0.018, 0]}>
        <boxGeometry args={[1.3, 0.036, 1.3]} />
        <meshStandardMaterial color={SCENE_COLORS.bakelite} metalness={0.22} roughness={0.7} />
      </mesh>

      <mesh position={[0, 0.003, 0]}>
        <boxGeometry args={[0.1, 0.006, 0.72]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.82} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.003, 0]}>
        <boxGeometry args={[0.72, 0.006, 0.1]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.82} roughness={0.3} />
      </mesh>

      <mesh position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[LANDING_MAX_DISTANCE, 0.012, 6, 40]} />
        <meshStandardMaterial
          color={SCENE_COLORS.amber}
          emissive={SCENE_COLORS.amber}
          emissiveIntensity={2.4}
          metalness={0.52}
          roughness={0.28}
        />
      </mesh>

      <pointLight
        position={[0, 0.42, 0]}
        color={SCENE_COLORS.amber}
        intensity={9}
        distance={3.2}
        decay={2}
      />
    </group>
  );
}
