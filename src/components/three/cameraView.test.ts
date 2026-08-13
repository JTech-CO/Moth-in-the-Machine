import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  CAMERA_VIEW_TOGGLE_CODE,
  DEFAULT_CAMERA_VIEW_INPUT_STATE,
  FIRST_PERSON_CAMERA_CONFIG,
  toggleCameraView,
  updateCameraViewInput,
  writeFirstPersonCameraPose,
} from '@/components/three/cameraView';

describe('camera view controls', () => {
  it('defaults to third-person and toggles both directions', () => {
    expect(DEFAULT_CAMERA_VIEW_INPUT_STATE).toEqual({
      mode: 'third-person',
      togglePressed: false,
    });
    expect(toggleCameraView('third-person')).toBe('first-person');
    expect(toggleCameraView('first-person')).toBe('third-person');
    expect(() => toggleCameraView('overhead' as never)).toThrow(TypeError);
  });

  it('toggles once per T press while ignoring key repeat and duplicate keydown', () => {
    const pressed = updateCameraViewInput(DEFAULT_CAMERA_VIEW_INPUT_STATE, {
      type: 'keydown',
      code: CAMERA_VIEW_TOGGLE_CODE,
      repeat: false,
    });
    const repeated = updateCameraViewInput(pressed, {
      type: 'keydown',
      code: CAMERA_VIEW_TOGGLE_CODE,
      repeat: true,
    });
    const duplicate = updateCameraViewInput(repeated, {
      type: 'keydown',
      code: CAMERA_VIEW_TOGGLE_CODE,
      repeat: false,
    });
    const released = updateCameraViewInput(duplicate, {
      type: 'keyup',
      code: CAMERA_VIEW_TOGGLE_CODE,
    });
    const pressedAgain = updateCameraViewInput(released, {
      type: 'keydown',
      code: CAMERA_VIEW_TOGGLE_CODE,
    });

    expect(pressed).toEqual({ mode: 'first-person', togglePressed: true });
    expect(repeated).toBe(pressed);
    expect(duplicate).toBe(pressed);
    expect(released).toEqual({ mode: 'first-person', togglePressed: false });
    expect(pressedAgain).toEqual({ mode: 'third-person', togglePressed: true });
  });

  it('ignores unrelated keys and releases a held toggle on window blur', () => {
    const unrelated = updateCameraViewInput(DEFAULT_CAMERA_VIEW_INPUT_STATE, {
      type: 'keydown',
      code: 'KeyR',
    });
    const held = { mode: 'first-person', togglePressed: true } as const;

    expect(unrelated).toBe(DEFAULT_CAMERA_VIEW_INPUT_STATE);
    expect(updateCameraViewInput(held, { type: 'blur' })).toEqual({
      mode: 'first-person',
      togglePressed: false,
    });
  });
});

describe('first-person camera pose', () => {
  it('places the camera near the moth head and looks forward by default', () => {
    const position = new Vector3();
    const target = new Vector3();

    writeFirstPersonCameraPose(position, target, { x: 1, y: 2, z: 3 }, { yaw: 0, pitch: 0 });

    expect(position.toArray()).toEqual([
      1,
      2 + FIRST_PERSON_CAMERA_CONFIG.headHeight,
      3 - FIRST_PERSON_CAMERA_CONFIG.headForwardOffset,
    ]);
    expect(target.x).toBeCloseTo(position.x);
    expect(target.y).toBeCloseTo(position.y);
    expect(target.z).toBeCloseTo(position.z - FIRST_PERSON_CAMERA_CONFIG.lookAhead);
  });

  it('uses yaw and pitch for both the head offset and forward look', () => {
    const position = new Vector3();
    const target = new Vector3();
    const yaw = Math.PI / 2;
    const pitch = Math.PI / 6;

    writeFirstPersonCameraPose(position, target, { x: 0, y: 0, z: 0 }, { yaw, pitch });

    const lookDirection = target.clone().sub(position).normalize();
    expect(lookDirection.x).toBeCloseTo(Math.cos(pitch));
    expect(lookDirection.y).toBeCloseTo(Math.sin(pitch));
    expect(lookDirection.z).toBeCloseTo(0);
    expect(position.x).toBeCloseTo(Math.cos(pitch) * FIRST_PERSON_CAMERA_CONFIG.headForwardOffset);
    expect(position.y).toBeCloseTo(
      FIRST_PERSON_CAMERA_CONFIG.headHeight +
        Math.sin(pitch) * FIRST_PERSON_CAMERA_CONFIG.headForwardOffset,
    );
  });

  it('keeps the camera pose finite for corrupted runtime inputs', () => {
    const position = new Vector3();
    const target = new Vector3();

    writeFirstPersonCameraPose(
      position,
      target,
      { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: Number.NEGATIVE_INFINITY },
      { yaw: Number.NaN, pitch: Number.POSITIVE_INFINITY },
    );

    expect([...position.toArray(), ...target.toArray()].every(Number.isFinite)).toBe(true);
  });
});
