export interface PointerLockDocument {
  readonly pointerLockElement: Element | null;
  exitPointerLock(): Promise<void> | void;
}

export function releaseCanvasPointerLock(
  canvas: HTMLCanvasElement | null,
  pointerLockDocument: PointerLockDocument | null = typeof document === 'undefined'
    ? null
    : document,
): boolean {
  if (
    canvas === null ||
    pointerLockDocument === null ||
    pointerLockDocument.pointerLockElement !== canvas
  ) {
    return false;
  }

  try {
    const release = pointerLockDocument.exitPointerLock();

    if (release !== undefined) {
      void release.catch(() => undefined);
    }

    return true;
  } catch {
    return false;
  }
}
