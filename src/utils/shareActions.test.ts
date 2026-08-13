import { describe, expect, it, vi } from 'vitest';

import {
  copyShareImage,
  copyShareText,
  downloadShareImage,
  ShareActionError,
} from '@/utils/shareActions';
import type { ResultPresentation } from '@/utils/resultPresentation';

const PRESENTATION = {
  outcome: 'cleared',
  statusLabel: 'FLIGHT CLEARED',
  stageId: 2,
  stageCode: 'E-01',
  stageName: 'Relay Approach',
  targetLabel: 'RELAY A-16',
  timeMs: 5_600,
  timeLabel: '00:05.6',
  timeIso: 'PT5.6S',
  remainingHealth: 100,
  healthLabel: '100 HP',
  stars: 3,
  starText: '★★★',
  timestamp: '1947-09-09T00:00:00.000Z',
  fileName: 'moth-in-the-machine-e-01.png',
  shareText: 'Moth in the Machine · E-01 · ★★★ · 00:05.6 · 100 HP',
} as const satisfies ResultPresentation;
const PNG = new Blob(['png'], { type: 'image/png' });

describe('copyShareImage', () => {
  it('copies the PNG with ClipboardItem when supported', async () => {
    const item = { type: 'image item' };
    const write = vi.fn(async () => undefined);
    const writeText = vi.fn(async () => undefined);
    const createClipboardItem = vi.fn(() => item);
    await expect(
      copyShareImage(PNG, PRESENTATION, {
        clipboard: { write, writeText },
        createClipboardItem,
      }),
    ).resolves.toBe('image');
    expect(createClipboardItem).toHaveBeenCalledWith({ 'image/png': PNG });
    expect(write).toHaveBeenCalledWith([item]);
    expect(writeText).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'image API missing', write: undefined },
    {
      label: 'image write rejected',
      write: vi.fn(async () => {
        throw new Error('denied');
      }),
    },
  ])('falls back to share text when $label', async ({ write }) => {
    const writeText = vi.fn(async () => undefined);
    await expect(
      copyShareImage(PNG, PRESENTATION, {
        clipboard: { write, writeText },
        createClipboardItem: () => ({}),
      }),
    ).resolves.toBe('text');
    expect(writeText).toHaveBeenCalledWith(PRESENTATION.shareText);
  });

  it('uses text when ClipboardItem construction fails', async () => {
    const writeText = vi.fn(async () => undefined);
    await expect(
      copyShareImage(PNG, PRESENTATION, {
        clipboard: { write: vi.fn(), writeText },
        createClipboardItem: () => {
          throw new Error('unsupported');
        },
      }),
    ).resolves.toBe('text');
  });

  it('reports a safe error when fallback rejects or clipboard is absent', async () => {
    await expect(
      copyShareImage(PNG, PRESENTATION, {
        clipboard: {
          write: async () => {
            throw new Error('image rejected');
          },
          writeText: async () => {
            throw new Error('text rejected');
          },
        },
        createClipboardItem: () => ({}),
      }),
    ).rejects.toMatchObject({
      name: 'ShareActionError',
      message: 'The image and text could not be copied to the clipboard.',
    });
    await expect(
      copyShareImage(PNG, PRESENTATION, {
        clipboard: null,
        createClipboardItem: null,
      }),
    ).rejects.toBeInstanceOf(ShareActionError);
  });
});
describe('copyShareText', () => {
  it('copies the canonical result text directly', async () => {
    const writeText = vi.fn(async () => undefined);
    await expect(
      copyShareText(PRESENTATION.shareText, { clipboard: { writeText } }),
    ).resolves.toBeUndefined();
    expect(writeText).toHaveBeenCalledWith(PRESENTATION.shareText);
  });

  it('reports unsupported and rejected text clipboards', async () => {
    await expect(copyShareText(PRESENTATION.shareText, { clipboard: null })).rejects.toThrow(
      'Text clipboard sharing is not supported',
    );
    await expect(
      copyShareText(PRESENTATION.shareText, {
        clipboard: {
          writeText: async () => {
            throw new Error('permission denied');
          },
        },
      }),
    ).rejects.toMatchObject({
      name: 'ShareActionError',
      message: 'The result text could not be copied to the clipboard.',
    });
  });
});

describe('downloadShareImage', () => {
  it('downloads the cached PNG filename and revokes its URL after a delay', () => {
    const anchor = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() };
    const appendAnchor = vi.fn();
    const createObjectUrl = vi.fn(() => 'blob:share-card');
    const revokeObjectUrl = vi.fn();
    const schedule = vi.fn((callback: () => void, delay: number) => {
      expect(delay).toBe(750);
      callback();
      return 1;
    });
    downloadShareImage(PNG, PRESENTATION, {
      createAnchor: () => anchor,
      appendAnchor,
      createObjectUrl,
      revokeObjectUrl,
      schedule,
      revokeDelayMs: 750,
    });
    expect(createObjectUrl).toHaveBeenCalledWith(PNG);
    expect(anchor.href).toBe('blob:share-card');
    expect(anchor.download).toBe(PRESENTATION.fileName);
    expect(anchor.rel).toBe('noopener');
    expect(appendAnchor).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:share-card');
  });

  it('rejects missing primitives and anchor failures', () => {
    expect(() =>
      downloadShareImage(PNG, PRESENTATION, {
        createAnchor: null,
        createObjectUrl: null,
        revokeObjectUrl: null,
        schedule: null,
      }),
    ).toThrow('File downloads are not supported');
    expect(() =>
      downloadShareImage(PNG, PRESENTATION, {
        createAnchor: () => null,
        createObjectUrl: () => 'blob:url',
        revokeObjectUrl: vi.fn(),
        schedule: vi.fn(),
      }),
    ).toThrow('download link could not be created');
  });

  it('wraps URL and click failures while cleaning up a created URL', () => {
    const anchor = {
      href: '',
      download: '',
      rel: '',
      click: vi.fn(() => {
        throw new Error('blocked');
      }),
      remove: vi.fn(),
    };
    expect(() =>
      downloadShareImage(PNG, PRESENTATION, {
        createAnchor: () => anchor,
        createObjectUrl: () => {
          throw new Error('unavailable');
        },
        revokeObjectUrl: vi.fn(),
        schedule: vi.fn(),
      }),
    ).toThrow('download URL could not be created');
    const revokeObjectUrl = vi.fn();
    const schedule = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });
    expect(() =>
      downloadShareImage(PNG, PRESENTATION, {
        createAnchor: () => anchor,
        createObjectUrl: () => 'blob:created',
        revokeObjectUrl,
        schedule,
      }),
    ).toThrow('download could not be started');
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:created');
  });
});
