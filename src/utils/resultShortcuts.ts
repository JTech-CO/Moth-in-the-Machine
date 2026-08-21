export interface ResultShortcutEvent {
  readonly altKey: boolean;
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly defaultPrevented: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly shiftKey: boolean;
}

export type ResultShortcut = 'restart' | 'return' | null;

export function resolveResultShortcut(
  event: ResultShortcutEvent,
  interactiveTarget: boolean,
): ResultShortcut {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return null;
  }

  if (event.code === 'KeyR') return 'restart';
  if (event.code === 'Enter' && !interactiveTarget) return 'return';
  return null;
}
