import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResultPresentation } from '@/utils/resultPresentation';

const hookRuntime = vi.hoisted(() => ({
  setters: [] as Array<ReturnType<typeof vi.fn>>,
  cleanups: [] as Array<() => void>,
}));

vi.mock('react', () => ({
  useCallback: <T>(callback: T) => callback,
  useEffect: (effect: () => void | (() => void)) => {
    const cleanup = effect();
    if (typeof cleanup === 'function') hookRuntime.cleanups.push(cleanup);
  },
  useRef: <T>(initial: T) => ({ current: initial }),
  useState: <T>(initial: T | (() => T)) => {
    let value = typeof initial === 'function' ? (initial as () => T)() : initial;
    const setter = vi.fn((next: T | ((previous: T) => T)) => {
      value = typeof next === 'function' ? (next as (previous: T) => T)(value) : next;
    });
    hookRuntime.setters.push(setter);
    return [value, setter] as const;
  },
}));

import { createUseShareImage } from '@/hooks/useShareImage';

const PRESENTATION = {
  outcome: 'cleared',
  statusLabel: 'STAGE CLEARED',
  stageId: 2,
  stageCode: 'E-01',
  stageName: 'RELAY APPROACH',
  targetLabel: 'RELAY A-16',
  timeMs: 5_600,
  timeLabel: '00:05.6',
  timeIso: 'PT5.6S',
  remainingHealth: 100,
  healthLabel: '100 HP',
  stars: 3,
  starText: '★★★',
  timestamp: '1947-09-09T00:00:00.000Z',
  fileName: 'moth-in-the-machine_E-01.png',
  shareText: 'share text',
} as const satisfies ResultPresentation;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function dependencies(generate: (presentation: ResultPresentation) => Promise<Blob>) {
  return {
    generate: vi.fn(generate),
    copyImage: vi.fn(async (): Promise<'image' | 'text'> => 'image'),
    copyText: vi.fn(async (): Promise<void> => undefined),
    downloadImage: vi.fn(),
    createPreviewUrl: vi.fn(() => 'blob:preview'),
    revokePreviewUrl: vi.fn(),
  };
}

describe('useShareImage', () => {
  beforeEach(() => {
    hookRuntime.setters.length = 0;
    hookRuntime.cleanups.length = 0;
  });

  it('prepares once on terminal entry and shares the same in-flight Blob', async () => {
    const pending = deferred<Blob>();
    const deps = dependencies(() => pending.promise);
    const result = createUseShareImage(deps)(PRESENTATION);

    expect(deps.generate).toHaveBeenCalledOnce();
    expect(deps.generate).toHaveBeenCalledWith(PRESENTATION);
    expect(hookRuntime.setters[2]).toHaveBeenCalledWith('preparing');

    const copyPromise = result.copy();
    expect(deps.generate).toHaveBeenCalledOnce();
    const png = new Blob(['png'], { type: 'image/png' });
    pending.resolve(png);
    await copyPromise;

    expect(deps.createPreviewUrl).toHaveBeenCalledWith(png);
    expect(deps.copyImage).toHaveBeenCalledWith(png, PRESENTATION);
    expect(hookRuntime.setters[2]).toHaveBeenCalledWith('ready');
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'success',
      message: '공유 이미지를 클립보드에 복사했습니다.',
    });
  });

  it('starts cached clipboard writes synchronously to preserve transient activation', async () => {
    const png = new Blob(['cached']);
    const deps = dependencies(async () => png);
    const result = createUseShareImage(deps)(PRESENTATION);
    await flushPromises();

    const copyPromise = result.copy();
    expect(deps.copyImage).toHaveBeenCalledWith(png, PRESENTATION);
    await copyPromise;
  });

  it('reports the text fallback and reuses the cached Blob for subsequent copies', async () => {
    const png = new Blob(['cached']);
    const deps = dependencies(async () => png);
    deps.copyImage.mockResolvedValue('text');
    const result = createUseShareImage(deps)(PRESENTATION);
    await flushPromises();

    await result.copy();
    await result.copy();

    expect(deps.generate).toHaveBeenCalledOnce();
    expect(deps.copyImage).toHaveBeenCalledTimes(2);
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'success',
      message: '이미지 복사를 지원하지 않아 결과 텍스트를 복사했습니다.',
    });
  });

  it('downloads only a ready cached image and reports download failures', async () => {
    const pending = deferred<Blob>();
    const deps = dependencies(() => pending.promise);
    const result = createUseShareImage(deps)(PRESENTATION);

    result.download();
    expect(deps.downloadImage).not.toHaveBeenCalled();
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'error',
      message: '공유 이미지가 아직 준비되지 않았습니다.',
    });

    const png = new Blob(['ready']);
    pending.resolve(png);
    await flushPromises();
    result.download();
    expect(deps.downloadImage).toHaveBeenCalledWith(png, PRESENTATION);
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'success',
      message: '공유 이미지 다운로드를 시작했습니다.',
    });

    deps.downloadImage.mockImplementation(() => {
      throw new Error('download blocked');
    });
    result.download();
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'error',
      message: 'download blocked',
    });
  });

  it('surfaces preparation errors and retries with a fresh generation', async () => {
    const png = new Blob(['retry']);
    const deps = dependencies(
      vi.fn().mockRejectedValueOnce(new Error('encoder offline')).mockResolvedValueOnce(png),
    );
    const result = createUseShareImage(deps)(PRESENTATION);
    await flushPromises();

    expect(hookRuntime.setters[2]).toHaveBeenLastCalledWith('error');
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'error',
      message: 'encoder offline',
    });

    result.retry();
    await flushPromises();
    expect(deps.generate).toHaveBeenCalledTimes(2);
    expect(deps.createPreviewUrl).toHaveBeenCalledWith(png);
    expect(hookRuntime.setters[2]).toHaveBeenLastCalledWith('ready');
  });

  it('reports copy errors while mounted and does not update after unmount', async () => {
    const png = new Blob(['copy']);
    const deps = dependencies(async () => png);
    deps.copyImage.mockRejectedValue(new Error('clipboard denied'));
    const result = createUseShareImage(deps)(PRESENTATION);
    await flushPromises();

    await expect(result.copy()).rejects.toThrow('clipboard denied');
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'error',
      message: 'clipboard denied',
    });

    const feedbackCalls = hookRuntime.setters[3]?.mock.calls.length ?? 0;
    hookRuntime.cleanups[0]?.();
    await expect(result.copy()).rejects.toThrow('clipboard denied');
    expect(hookRuntime.setters[3]?.mock.calls.length).toBe(feedbackCalls);
    expect(deps.revokePreviewUrl).toHaveBeenCalledWith('blob:preview');
  });
  it('copies result text without requiring a generated image', async () => {
    const pending = deferred<Blob>();
    const deps = dependencies(() => pending.promise);
    const result = createUseShareImage(deps)(PRESENTATION);

    await result.copyText();
    expect(deps.copyText).toHaveBeenCalledWith(PRESENTATION.shareText);
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'success',
      message: '결과 텍스트를 클립보드에 복사했습니다.',
    });
  });

  it('reports text copy errors and guards unavailable results', async () => {
    const deps = dependencies(async () => new Blob());
    deps.copyText.mockRejectedValue(new Error('text clipboard denied'));
    const result = createUseShareImage(deps)(PRESENTATION);
    await flushPromises();

    await expect(result.copyText()).rejects.toThrow('text clipboard denied');
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'error',
      message: 'text clipboard denied',
    });

    const nullResult = createUseShareImage(deps)(null);
    await expect(nullResult.copyText()).rejects.toThrow('공유할 결과가 없습니다.');
  });

  it('does not publish text feedback after unmount', async () => {
    const pending = deferred<void>();
    const deps = dependencies(async () => new Blob());
    deps.copyText.mockImplementation(() => pending.promise);
    const result = createUseShareImage(deps)(PRESENTATION);
    const copyPromise = result.copyText();
    hookRuntime.cleanups[0]?.();
    pending.resolve();
    await copyPromise;
    expect(hookRuntime.setters[3]).not.toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'success' }),
    );
  });

  it('drops stale generation completions and unmounted preview work', async () => {
    const pending = deferred<Blob>();
    const deps = dependencies(() => pending.promise);
    createUseShareImage(deps)(PRESENTATION);
    hookRuntime.cleanups[0]?.();
    pending.resolve(new Blob(['late']));
    await flushPromises();

    expect(deps.createPreviewUrl).not.toHaveBeenCalled();
    expect(hookRuntime.setters[2]).not.toHaveBeenCalledWith('ready');
  });

  it('keeps a null presentation idle and rejects unavailable operations', async () => {
    const deps = dependencies(async () => new Blob());
    const result = createUseShareImage(deps)(null);

    expect(deps.generate).not.toHaveBeenCalled();
    expect(hookRuntime.setters[2]).toHaveBeenLastCalledWith('idle');
    await expect(result.copy()).rejects.toThrow('공유할 결과가 없습니다.');
    result.download();
    result.retry();
    expect(hookRuntime.setters[2]).toHaveBeenLastCalledWith('idle');
  });

  it('formats non-Error generation failures with a safe fallback message', async () => {
    const deps = dependencies(async () => {
      throw 'offline';
    });
    createUseShareImage(deps)(PRESENTATION);
    await flushPromises();
    expect(hookRuntime.setters[3]).toHaveBeenLastCalledWith({
      tone: 'error',
      message: '공유 이미지를 준비하지 못했습니다.',
    });
  });
});
