import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';

import {
  DEFAULT_LOOK_INPUT_CONFIG,
  toggleFlightMode,
  updateLookAngles,
  type FlightMode,
  type LookAngles,
} from '@/utils/playerControls';
import { releaseCanvasPointerLock } from '@/utils/pointerLock';

const MOVEMENT_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);
const FLIGHT_MODE_CODE = 'Space';

export interface PlayerControlRefs {
  readonly activeCodes: MutableRefObject<Set<string>>;
  readonly lookAngles: MutableRefObject<LookAngles>;
  readonly flightMode: MutableRefObject<FlightMode>;
  readonly pointerLocked: MutableRefObject<boolean>;
}

export function usePlayerControls(
  canvas: HTMLCanvasElement | null,
  inputEnabled = true,
): PlayerControlRefs {
  const activeCodes = useRef(new Set<string>());
  const lookAngles = useRef<LookAngles>({ yaw: 0, pitch: 0 });
  const flightMode = useRef<FlightMode>('hover');
  const pointerLocked = useRef(false);
  const inputEnabledRef = useRef(inputEnabled);
  const pointerLockReleaseRequested = useRef(false);
  const controls = useMemo(() => ({ activeCodes, lookAngles, flightMode, pointerLocked }), []);

  inputEnabledRef.current = inputEnabled;

  useEffect(() => {
    if (canvas === null) {
      return;
    }

    let effectActive = true;
    let flightModeKeyPressed = false;

    const clearMovement = () => {
      activeCodes.current.clear();
      flightModeKeyPressed = false;
    };

    const releasePointerLock = () => {
      pointerLocked.current = false;
      clearMovement();

      if (pointerLockReleaseRequested.current) {
        return;
      }

      pointerLockReleaseRequested.current = releaseCanvasPointerLock(canvas);
    };

    const syncPointerLock = () => {
      pointerLocked.current = document.pointerLockElement === canvas;
      pointerLockReleaseRequested.current = false;

      if (!pointerLocked.current) {
        clearMovement();
      }
    };

    const requestCanvasPointerLock = () => {
      if (!inputEnabledRef.current) {
        return;
      }

      if (document.pointerLockElement === canvas) {
        pointerLocked.current = true;
        return;
      }

      try {
        const request: Promise<void> | void = canvas.requestPointerLock();

        if (request !== undefined) {
          void request.catch(() => {
            if (effectActive) {
              pointerLocked.current = false;
              clearMovement();
            }
          });
        }
      } catch {
        pointerLocked.current = false;
        clearMovement();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !inputEnabledRef.current ||
        !pointerLocked.current ||
        document.pointerLockElement !== canvas
      ) {
        return;
      }

      if (MOVEMENT_CODES.has(event.code)) {
        event.preventDefault();
        activeCodes.current.add(event.code);
        return;
      }

      if (event.code === FLIGHT_MODE_CODE) {
        event.preventDefault();

        if (!event.repeat && !flightModeKeyPressed) {
          flightMode.current = toggleFlightMode(flightMode.current);
        }

        flightModeKeyPressed = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === FLIGHT_MODE_CODE) {
        if (pointerLocked.current && document.pointerLockElement === canvas) {
          event.preventDefault();
        }

        flightModeKeyPressed = false;
        return;
      }

      if (!MOVEMENT_CODES.has(event.code)) {
        return;
      }

      if (pointerLocked.current) {
        event.preventDefault();
      }

      activeCodes.current.delete(event.code);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (
        !inputEnabledRef.current ||
        !pointerLocked.current ||
        document.pointerLockElement !== canvas
      ) {
        return;
      }

      if (!Number.isFinite(event.movementX) || !Number.isFinite(event.movementY)) {
        return;
      }

      lookAngles.current = updateLookAngles(
        lookAngles.current,
        event.movementX,
        event.movementY,
        DEFAULT_LOOK_INPUT_CONFIG,
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearMovement();
      }
    };

    const handlePointerLockError = () => {
      if (document.pointerLockElement !== canvas) {
        pointerLocked.current = false;
        clearMovement();
      }
    };

    canvas.addEventListener('pointerdown', requestCanvasPointerLock);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearMovement);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', syncPointerLock);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    syncPointerLock();

    return () => {
      effectActive = false;
      canvas.removeEventListener('pointerdown', requestCanvasPointerLock);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearMovement);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', syncPointerLock);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releasePointerLock();
    };
  }, [canvas]);

  useEffect(() => {
    if (inputEnabled || canvas === null) {
      return;
    }

    activeCodes.current.clear();
    pointerLocked.current = false;

    if (!pointerLockReleaseRequested.current) {
      pointerLockReleaseRequested.current = releaseCanvasPointerLock(canvas);
    }
  }, [canvas, inputEnabled]);

  return controls;
}
