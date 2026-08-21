import type { ResultPresentation } from '@/utils/resultPresentation';

export type ShareCopyResult = 'image' | 'text';

interface ShareClipboard {
  write?: (items: readonly unknown[]) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}

interface ShareAnchor {
  href: string;
  download: string;
  rel: string;
  click(): void;
  remove(): void;
}

export interface ShareCopyDependencies {
  readonly clipboard?: ShareClipboard | null;
  readonly createClipboardItem?: ((data: Record<string, Blob>) => unknown) | null;
}

export interface ShareTextCopyDependencies {
  readonly clipboard?: Pick<ShareClipboard, 'writeText'> | null;
}

export interface ShareDownloadDependencies {
  readonly createAnchor?: (() => ShareAnchor | null) | null;
  readonly appendAnchor?: ((anchor: ShareAnchor) => void) | null;
  readonly createObjectUrl?: ((blob: Blob) => string) | null;
  readonly revokeObjectUrl?: ((url: string) => void) | null;
  readonly schedule?: ((callback: () => void, delay: number) => unknown) | null;
  readonly revokeDelayMs?: number;
}

export class ShareActionError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ShareActionError';
  }
}

function browserClipboard(): ShareClipboard | null {
  if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
    return null;
  }

  return {
    write: navigator.clipboard.write?.bind(navigator.clipboard) as
      ((items: readonly unknown[]) => Promise<void>) | undefined,
    writeText: navigator.clipboard.writeText?.bind(navigator.clipboard),
  };
}

function browserClipboardItem(data: Record<string, Blob>): unknown {
  if (typeof ClipboardItem === 'undefined') {
    throw new ShareActionError('Image clipboard items are not supported.');
  }

  return new ClipboardItem(data);
}

export async function copyShareImage(
  blob: Blob,
  presentation: ResultPresentation,
  dependencies: ShareCopyDependencies = {},
): Promise<ShareCopyResult> {
  const clipboard =
    dependencies.clipboard === undefined ? browserClipboard() : dependencies.clipboard;
  const createClipboardItem =
    dependencies.createClipboardItem === undefined
      ? browserClipboardItem
      : dependencies.createClipboardItem;
  let imageFailure: unknown;

  if (clipboard?.write !== undefined && createClipboardItem !== null) {
    try {
      const item = createClipboardItem({ 'image/png': blob });
      await clipboard.write([item]);
      return 'image';
    } catch (error) {
      imageFailure = error;
    }
  }

  if (clipboard?.writeText !== undefined) {
    try {
      await clipboard.writeText(presentation.shareText);
      return 'text';
    } catch (error) {
      throw new ShareActionError('The image and text could not be copied to the clipboard.', {
        cause: error,
      });
    }
  }

  throw new ShareActionError('Clipboard sharing is not supported by this browser.', {
    cause: imageFailure,
  });
}
export async function copyShareText(
  text: string,
  dependencies: ShareTextCopyDependencies = {},
): Promise<void> {
  const clipboard =
    dependencies.clipboard === undefined ? browserClipboard() : dependencies.clipboard;

  if (clipboard?.writeText === undefined) {
    throw new ShareActionError('Text clipboard sharing is not supported by this browser.');
  }

  try {
    await clipboard.writeText(text);
  } catch (error) {
    throw new ShareActionError('The result text could not be copied to the clipboard.', {
      cause: error,
    });
  }
}

function browserAnchor(): ShareAnchor | null {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.createElement('a');
}

function appendBrowserAnchor(anchor: ShareAnchor): void {
  if (typeof document !== 'undefined' && document.body !== null) {
    document.body.append(anchor as HTMLAnchorElement);
  }
}

function browserCreateObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

function browserRevokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function downloadShareImage(
  blob: Blob,
  presentation: ResultPresentation,
  dependencies: ShareDownloadDependencies = {},
): void {
  const createAnchor =
    dependencies.createAnchor === undefined ? browserAnchor : dependencies.createAnchor;
  const appendAnchor =
    dependencies.appendAnchor === undefined ? appendBrowserAnchor : dependencies.appendAnchor;
  const createObjectUrl =
    dependencies.createObjectUrl === undefined
      ? browserCreateObjectUrl
      : dependencies.createObjectUrl;
  const revokeObjectUrl =
    dependencies.revokeObjectUrl === undefined
      ? browserRevokeObjectUrl
      : dependencies.revokeObjectUrl;
  const schedule =
    dependencies.schedule === undefined ? globalThis.setTimeout : dependencies.schedule;

  if (
    createAnchor === null ||
    createObjectUrl === null ||
    revokeObjectUrl === null ||
    schedule === null
  ) {
    throw new ShareActionError('File downloads are not supported by this browser.');
  }

  const anchor = createAnchor();
  if (anchor === null) {
    throw new ShareActionError('A download link could not be created.');
  }

  let objectUrl: string;
  try {
    objectUrl = createObjectUrl(blob);
  } catch (error) {
    throw new ShareActionError('A download URL could not be created.', { cause: error });
  }

  try {
    anchor.href = objectUrl;
    anchor.download = presentation.fileName;
    anchor.rel = 'noopener';
    appendAnchor?.(anchor);
    anchor.click();
  } catch (error) {
    throw new ShareActionError('The share image download could not be started.', { cause: error });
  } finally {
    anchor.remove();
    schedule(
      () => {
        revokeObjectUrl(objectUrl);
      },
      Math.max(0, dependencies.revokeDelayMs ?? 1_000),
    );
  }
}
