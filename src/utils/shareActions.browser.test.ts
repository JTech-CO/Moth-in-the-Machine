import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyShareImage, copyShareText, downloadShareImage } from '@/utils/shareActions';
import type { ResultPresentation } from '@/utils/resultPresentation';

const PRESENTATION = {
  outcome: 'cleared',
  statusLabel: 'STAGE CLEARED',
  stageId: 2,
  stageCode: 'E-01',
  stageName: 'RELAY APPROACH',
  targetLabel: 'RELAY A-16',
  timeMs: 1_947,
  timeLabel: '00:01.9',
  timeIso: 'PT1.947S',
  remainingHealth: 100,
  healthLabel: '100 HP',
  stars: 3,
  starText: '★★★',
  timestamp: '1947-09-09T12:34:56.789Z',
  fileName: 'moth_E-01.png',
  shareText: 'Moth in the Machine share text',
} as const satisfies ResultPresentation;

const PNG = new Blob(['png'], { type: 'image/png' });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('shareActions browser defaults', () => {
  it('uses navigator.clipboard and the global ClipboardItem implementation', async () => {
    const write = vi.fn(async (items: readonly unknown[]) => {
      void items;
    });
    const writeText = vi.fn(async () => undefined);
    class FakeClipboardItem {
      public constructor(public readonly data: Record<string, Blob>) {}
    }
    vi.stubGlobal('navigator', { clipboard: { write, writeText } });
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);

    await expect(copyShareImage(PNG, PRESENTATION)).resolves.toBe('image');
    const items = write.mock.calls[0]?.[0] ?? [];
    const item = items[0] as FakeClipboardItem;
    expect(item.data).toEqual({ 'image/png': PNG });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to global clipboard text when ClipboardItem is unavailable', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { write: vi.fn(), writeText } });
    vi.stubGlobal('ClipboardItem', undefined);

    await expect(copyShareImage(PNG, PRESENTATION)).resolves.toBe('text');
    expect(writeText).toHaveBeenCalledWith(PRESENTATION.shareText);
  });

  it('uses the global text clipboard default', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyShareText(PRESENTATION.shareText)).resolves.toBeUndefined();
    expect(writeText).toHaveBeenCalledWith(PRESENTATION.shareText);
  });

  it('reports unsupported defaults when navigator or navigator.clipboard is absent', async () => {
    vi.stubGlobal('navigator', undefined);
    await expect(copyShareImage(PNG, PRESENTATION)).rejects.toThrow('not supported');

    vi.stubGlobal('navigator', {});
    await expect(copyShareImage(PNG, PRESENTATION)).rejects.toThrow('not supported');
  });

  it('uses DOM anchor and URL defaults, then performs delayed revocation', () => {
    vi.useFakeTimers();
    const anchor = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() };
    const append = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:default-download');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
      body: { append },
    });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    downloadShareImage(PNG, PRESENTATION);
    expect(append).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe(PRESENTATION.fileName);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:default-download');
  });

  it('handles default DOM absence and a document without a body', () => {
    vi.stubGlobal('document', undefined);
    expect(() =>
      downloadShareImage(PNG, PRESENTATION, {
        createObjectUrl: () => 'blob:test',
        revokeObjectUrl: vi.fn(),
        schedule: vi.fn(),
      }),
    ).toThrow('download link could not be created');

    const anchor = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('document', { createElement: () => anchor, body: null });
    downloadShareImage(PNG, PRESENTATION, {
      createObjectUrl: () => 'blob:test',
      revokeObjectUrl: vi.fn(),
      schedule: vi.fn((callback: () => void) => {
        callback();
        return 1;
      }),
    });
    expect(anchor.click).toHaveBeenCalledOnce();
  });
});
