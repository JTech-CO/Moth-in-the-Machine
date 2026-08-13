import { useCallback, useEffect, useRef, useState } from 'react';

import {
  copyShareImage,
  copyShareText as copyResultText,
  downloadShareImage,
} from '@/utils/shareActions';
import { generateShareImage } from '@/utils/shareImage';
import type { ResultPresentation } from '@/utils/resultPresentation';

export type ShareImageStatus = 'idle' | 'preparing' | 'ready' | 'error';
export type ShareFeedbackTone = 'idle' | 'success' | 'error';

export interface ShareFeedback {
  readonly tone: ShareFeedbackTone;
  readonly message: string;
}

export interface UseShareImageResult {
  readonly blob: Blob | null;
  readonly previewUrl: string | null;
  readonly status: ShareImageStatus;
  readonly feedback: ShareFeedback;
  copy(): Promise<void>;
  copyText(): Promise<void>;
  download(): void;
  retry(): void;
}

export interface UseShareImageDependencies {
  readonly generate: (presentation: ResultPresentation) => Promise<Blob>;
  readonly copyImage: (blob: Blob, presentation: ResultPresentation) => Promise<'image' | 'text'>;
  readonly copyText: (text: string) => Promise<void>;
  readonly downloadImage: (blob: Blob, presentation: ResultPresentation) => void;
  readonly createPreviewUrl: (blob: Blob) => string;
  readonly revokePreviewUrl: (url: string) => void;
}

const IDLE_FEEDBACK: ShareFeedback = { tone: 'idle', message: '' };

const DEFAULT_DEPENDENCIES: UseShareImageDependencies = {
  generate: generateShareImage,
  copyImage: copyShareImage,
  copyText: copyResultText,
  downloadImage: downloadShareImage,
  createPreviewUrl: (blob) => URL.createObjectURL(blob),
  revokePreviewUrl: (url) => URL.revokeObjectURL(url),
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '공유 이미지를 준비하지 못했습니다.';
}

export function createUseShareImage(
  dependencyOverrides: Partial<UseShareImageDependencies> = {},
): (presentation: ResultPresentation | null) => UseShareImageResult {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...dependencyOverrides };

  return function useConfiguredShareImage(
    presentation: ResultPresentation | null,
  ): UseShareImageResult {
    const [blob, setBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<ShareImageStatus>('idle');
    const [feedback, setFeedback] = useState<ShareFeedback>(IDLE_FEEDBACK);
    const mountedRef = useRef(false);
    const presentationRef = useRef<ResultPresentation | null>(presentation);
    const blobRef = useRef<Blob | null>(null);
    const cachedPresentationRef = useRef<ResultPresentation | null>(null);
    const previewUrlRef = useRef<string | null>(null);
    const flightRef = useRef<{
      readonly presentation: ResultPresentation;
      readonly promise: Promise<Blob>;
    } | null>(null);
    presentationRef.current = presentation;

    const clearPreview = useCallback(() => {
      if (previewUrlRef.current !== null) {
        dependencies.revokePreviewUrl(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
    }, []);

    const commitBlob = useCallback(
      (candidate: ResultPresentation, imageBlob: Blob) => {
        if (!mountedRef.current || presentationRef.current !== candidate) {
          return;
        }

        clearPreview();
        const nextPreviewUrl = dependencies.createPreviewUrl(imageBlob);
        blobRef.current = imageBlob;
        cachedPresentationRef.current = candidate;
        previewUrlRef.current = nextPreviewUrl;
        setBlob(imageBlob);
        setPreviewUrl(nextPreviewUrl);
        setStatus('ready');
      },
      [clearPreview],
    );

    const ensureBlob = useCallback(
      (candidate: ResultPresentation): Promise<Blob> => {
        if (cachedPresentationRef.current === candidate && blobRef.current !== null) {
          return Promise.resolve(blobRef.current);
        }

        const activeFlight = flightRef.current;
        if (activeFlight?.presentation === candidate) {
          return activeFlight.promise;
        }

        const promise = dependencies
          .generate(candidate)
          .then((imageBlob) => {
            commitBlob(candidate, imageBlob);
            return imageBlob;
          })
          .finally(() => {
            if (flightRef.current?.promise === promise) {
              flightRef.current = null;
            }
          });
        flightRef.current = { presentation: candidate, promise };
        return promise;
      },
      [commitBlob],
    );

    const reportPreparationError = useCallback((candidate: ResultPresentation, error: unknown) => {
      if (!mountedRef.current || presentationRef.current !== candidate) {
        return;
      }
      setStatus('error');
      setFeedback({ tone: 'error', message: errorMessage(error) });
    }, []);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (previewUrlRef.current !== null) {
          dependencies.revokePreviewUrl(previewUrlRef.current);
          previewUrlRef.current = null;
        }
      };
    }, []);

    useEffect(() => {
      clearPreview();
      blobRef.current = null;
      cachedPresentationRef.current = null;
      setBlob(null);
      setFeedback(IDLE_FEEDBACK);

      if (presentation === null) {
        setStatus('idle');
        return;
      }

      setStatus('preparing');
      void ensureBlob(presentation).catch((error: unknown) => {
        reportPreparationError(presentation, error);
      });
    }, [clearPreview, ensureBlob, presentation, reportPreparationError]);

    const copy = useCallback(async () => {
      const candidate = presentationRef.current;
      if (candidate === null) {
        const error = new Error('공유할 결과가 없습니다.');
        setFeedback({ tone: 'error', message: error.message });
        throw error;
      }

      try {
        const cachedBlob = cachedPresentationRef.current === candidate ? blobRef.current : null;
        const imageBlobPromise =
          cachedBlob === null
            ? ensureBlob(candidate).then((imageBlob) => {
                if (!mountedRef.current || presentationRef.current !== candidate) {
                  throw new Error('공유할 결과가 변경되었습니다.');
                }
                return dependencies.copyImage(imageBlob, candidate);
              })
            : dependencies.copyImage(cachedBlob, candidate);
        const copied = await imageBlobPromise;
        if (!mountedRef.current || presentationRef.current !== candidate) {
          return;
        }
        setFeedback({
          tone: 'success',
          message:
            copied === 'image'
              ? '공유 이미지를 클립보드에 복사했습니다.'
              : '이미지 복사를 지원하지 않아 결과 텍스트를 복사했습니다.',
        });
      } catch (error) {
        if (mountedRef.current && presentationRef.current === candidate) {
          setFeedback({ tone: 'error', message: errorMessage(error) });
        }
        throw error;
      }
    }, [ensureBlob]);

    const copyText = useCallback(async () => {
      const candidate = presentationRef.current;
      if (candidate === null) {
        const error = new Error('공유할 결과가 없습니다.');
        if (mountedRef.current) {
          setFeedback({ tone: 'error', message: error.message });
        }
        throw error;
      }

      try {
        await dependencies.copyText(candidate.shareText);
        if (!mountedRef.current || presentationRef.current !== candidate) {
          return;
        }
        setFeedback({
          tone: 'success',
          message: '결과 텍스트를 클립보드에 복사했습니다.',
        });
      } catch (error) {
        if (mountedRef.current && presentationRef.current === candidate) {
          setFeedback({ tone: 'error', message: errorMessage(error) });
        }
        throw error;
      }
    }, []);

    const download = useCallback(() => {
      const candidate = presentationRef.current;
      if (candidate === null || blobRef.current === null) {
        setFeedback({
          tone: 'error',
          message: '공유 이미지가 아직 준비되지 않았습니다.',
        });
        return;
      }

      try {
        dependencies.downloadImage(blobRef.current, candidate);
        setFeedback({
          tone: 'success',
          message: '공유 이미지 다운로드를 시작했습니다.',
        });
      } catch (error) {
        setFeedback({ tone: 'error', message: errorMessage(error) });
      }
    }, []);

    const retry = useCallback(() => {
      const candidate = presentationRef.current;
      if (candidate === null) {
        setStatus('idle');
        return;
      }

      clearPreview();
      blobRef.current = null;
      cachedPresentationRef.current = null;
      setBlob(null);
      setStatus('preparing');
      setFeedback(IDLE_FEEDBACK);
      void ensureBlob(candidate).catch((error: unknown) => {
        reportPreparationError(candidate, error);
      });
    }, [clearPreview, ensureBlob, reportPreparationError]);

    return {
      blob,
      previewUrl,
      status,
      feedback,
      copy,
      copyText,
      download,
      retry,
    };
  };
}

export const useShareImage = createUseShareImage();
