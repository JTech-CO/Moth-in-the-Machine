import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';

import {
  CABINET_INSTANCE_COUNT,
  CORRIDOR_SECTION_Z,
  RAIL_INSTANCE_COUNT,
  RELAY_GRID,
  RELAY_INSTANCE_COUNT,
  SCENE_COLORS,
} from '@/components/three/sceneConfig';

const CORRIDOR_SIDES = [-1, 1] as const;

export function RelayArchitecture() {
  const cabinetFrames = useRef<InstancedMesh>(null);
  const cabinetFaces = useRef<InstancedMesh>(null);
  const relayBodies = useRef<InstancedMesh>(null);
  const relayContacts = useRef<InstancedMesh>(null);
  const brassRails = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const meshes = {
      cabinetFrames: cabinetFrames.current,
      cabinetFaces: cabinetFaces.current,
      relayBodies: relayBodies.current,
      relayContacts: relayContacts.current,
      brassRails: brassRails.current,
    };

    if (Object.values(meshes).some((mesh) => mesh === null)) {
      return;
    }

    const transform = new Object3D();
    let cabinetIndex = 0;
    let relayIndex = 0;
    let railIndex = 0;

    for (const side of CORRIDOR_SIDES) {
      for (const sectionZ of CORRIDOR_SECTION_Z) {
        transform.position.set(side * 4.75, 0, sectionZ);
        transform.updateMatrix();
        meshes.cabinetFrames!.setMatrixAt(cabinetIndex, transform.matrix);

        transform.position.set(side * 4.42, 0, sectionZ);
        transform.updateMatrix();
        meshes.cabinetFaces!.setMatrixAt(cabinetIndex, transform.matrix);

        for (const relay of RELAY_GRID) {
          transform.position.set(side * 4.26, relay.y, sectionZ + relay.x);
          transform.updateMatrix();
          meshes.relayBodies!.setMatrixAt(relayIndex, transform.matrix);

          transform.position.set(side * 4.09, relay.y, sectionZ + relay.x);
          transform.updateMatrix();
          meshes.relayContacts!.setMatrixAt(relayIndex, transform.matrix);
          relayIndex += 1;
        }

        for (const railOffset of [-1.84, 1.84]) {
          transform.position.set(side * 4.02, 0, sectionZ + railOffset);
          transform.updateMatrix();
          meshes.brassRails!.setMatrixAt(railIndex, transform.matrix);
          railIndex += 1;
        }

        cabinetIndex += 1;
      }
    }

    for (const mesh of Object.values(meshes)) {
      mesh!.instanceMatrix.needsUpdate = true;
      mesh!.computeBoundingSphere();
    }
  }, []);

  return (
    <group name="mark-ii-relay-architecture">
      <instancedMesh ref={cabinetFrames} args={[undefined, undefined, CABINET_INSTANCE_COUNT]}>
        <boxGeometry args={[0.55, 5.4, 4.45]} />
        <meshStandardMaterial color={SCENE_COLORS.metal} metalness={0.72} roughness={0.56} />
      </instancedMesh>

      <instancedMesh ref={cabinetFaces} args={[undefined, undefined, CABINET_INSTANCE_COUNT]}>
        <boxGeometry args={[0.18, 5, 4.05]} />
        <meshStandardMaterial color={SCENE_COLORS.metalLight} metalness={0.58} roughness={0.62} />
      </instancedMesh>

      <instancedMesh ref={relayBodies} args={[undefined, undefined, RELAY_INSTANCE_COUNT]}>
        <boxGeometry args={[0.25, 0.34, 0.5]} />
        <meshStandardMaterial color={SCENE_COLORS.bakelite} metalness={0.12} roughness={0.68} />
      </instancedMesh>

      <instancedMesh ref={relayContacts} args={[undefined, undefined, RELAY_INSTANCE_COUNT]}>
        <boxGeometry args={[0.07, 0.09, 0.2]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.78} roughness={0.34} />
      </instancedMesh>

      <instancedMesh ref={brassRails} args={[undefined, undefined, RAIL_INSTANCE_COUNT]}>
        <boxGeometry args={[0.07, 4.76, 0.08]} />
        <meshStandardMaterial color={SCENE_COLORS.brass} metalness={0.82} roughness={0.3} />
      </instancedMesh>
    </group>
  );
}
