import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResultScreen } from '@/components/layout/ResultScreen';
import type { ResultSnapshotInput } from '@/utils/resultPresentation';
import { getStageDefinition } from '@/utils/stages';

const captured = vi.hoisted(() => ({
  presentation: null as unknown,
  shareStatus: 'ready' as 'idle' | 'preparing' | 'ready' | 'error',
}));

vi.mock('@/hooks/useShareImage', () => ({
  useShareImage: (presentation: unknown) => {
    captured.presentation = presentation;
    return {
      blob: new Blob(['png'], { type: 'image/png' }),
      previewUrl: captured.shareStatus === 'ready' ? 'blob:m8-result-preview' : null,
      status: captured.shareStatus,
      feedback: { tone: 'idle', message: '' },
      copy: vi.fn(),
      copyText: vi.fn(),
      download: vi.fn(),
      retry: vi.fn(),
    };
  },
}));

function result(patch: Partial<ResultSnapshotInput> = {}): ResultSnapshotInput {
  return {
    stageId: 2,
    timeMs: 62_340,
    remainingHealth: 100,
    stars: 3,
    timestamp: new Date('2026-08-14T01:02:03.000Z'),
    ...patch,
  };
}

describe('M8 ResultScreen SSR contract', () => {
  beforeEach(() => {
    captured.presentation = null;
    captured.shareStatus = 'ready';
  });

  it('renders matching cleared stats, semantic values, preview, and all result actions', () => {
    const markup = renderToStaticMarkup(
      <ResultScreen
        status="cleared"
        result={result()}
        stage={getStageDefinition(2)}
        onRestart={vi.fn()}
        onReturnToStages={vi.fn()}
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('MARK II · FINAL FLIGHT RECORD');
    expect(markup).toContain('STAGE CLEARED');
    expect(markup).toContain('E-01');
    expect(markup).toContain('RELAY APPROACH');
    expect(markup).toContain('RELAY A-16');
    expect(markup).toContain('aria-label="획득 별점 3 / 3"');
    expect(markup).toContain('★★★');
    expect(markup).toContain('<time dateTime="PT1M2.34S">01:02.3</time>');
    expect(markup).toContain('<data value="100">100 HP</data>');
    expect(markup).toContain('width="1080" height="1080" role="img"');
    expect(markup).toContain('1080 × 1080 PNG');
    expect(markup).toContain('COPY IMAGE');
    expect(markup).toContain('DOWNLOAD PNG');
    expect(markup).toContain('COPY RESULT TEXT');
    expect(markup).toContain('RETRY STAGE · R');
    expect(markup).toContain('RETURN TO STAGES · ENTER');
    expect(markup).not.toContain('disabled=""');
    expect(markup.indexOf('RETURN TO STAGES · ENTER')).toBeGreaterThan(
      markup.indexOf('RETRY STAGE · R'),
    );
    expect(captured.presentation).toMatchObject({
      outcome: 'cleared',
      stageCode: 'E-01',
    });
  });

  it('offers a text-only copy fallback when cleared image generation fails', () => {
    captured.shareStatus = 'error';
    const markup = renderToStaticMarkup(
      <ResultScreen
        status="cleared"
        result={result()}
        stage={getStageDefinition(2)}
        onRestart={vi.fn()}
        onReturnToStages={vi.fn()}
      />,
    );

    expect(markup).toContain('IMAGE GENERATION FAULT');
    expect(markup).toContain('REBUILD IMAGE');
    expect(markup).toContain('COPY RESULT TEXT');
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(markup.match(/COPY RESULT TEXT/g)).toHaveLength(2);
  });

  it('keeps failed results local to retry and return without starting image generation', () => {
    const markup = renderToStaticMarkup(
      <ResultScreen
        status="failed"
        result={result({ remainingHealth: 0, stars: 0 })}
        stage={getStageDefinition(2)}
        onRestart={vi.fn()}
        onReturnToStages={vi.fn()}
      />,
    );

    expect(markup).toContain('FLIGHT FAILED');
    expect(markup).toContain('RUN ABORTED');
    expect(markup).toContain('aria-label="획득 별점 0 / 3"');
    expect(markup).toContain('☆☆☆');
    expect(markup).toContain('0 HP');
    expect(markup).toContain('RETRY STAGE · R');
    expect(markup).toContain('RETURN TO STAGES · ENTER');
    expect(markup).not.toContain('COPY IMAGE');
    expect(markup).not.toContain('DOWNLOAD PNG');
    expect(markup).not.toContain('COPY RESULT TEXT');
    expect(markup).not.toContain('SHARE IMAGE');
    expect(captured.presentation).toBeNull();
  });

  it('disables sharing and announces the invalid-record fallback without throwing', () => {
    const markup = renderToStaticMarkup(
      <ResultScreen
        status="cleared"
        result={null}
        stage={getStageDefinition(2)}
        onRestart={vi.fn()}
        onReturnToStages={vi.fn()}
      />,
    );

    expect(markup).toContain('RELAY APPROACH');
    expect(markup).toContain('RESULT RECORD FAULT');
    expect(markup).toContain('role="alert"');
    expect(markup.match(/disabled=""/g)).toHaveLength(3);
    expect(captured.presentation).toBeNull();
  });
});
