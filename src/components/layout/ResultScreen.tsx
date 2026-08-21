import { memo, useEffect, useMemo, useRef, type RefObject } from 'react';

import styles from '@/components/layout/ResultScreen.module.scss';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useShareImage } from '@/hooks/useShareImage';
import {
  createResultPresentation,
  type ResultPresentation,
  type ResultSnapshotInput,
} from '@/utils/resultPresentation';
import { resolveResultShortcut } from '@/utils/resultShortcuts';
import type { StageDefinition } from '@/utils/stages';

export interface ResultScreenProps {
  readonly status: 'cleared' | 'failed';
  readonly result: ResultSnapshotInput | null;
  readonly stage: StageDefinition | null;
  readonly onRestart: () => void;
  readonly onReturnToStages: () => void;
}

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[role="textbox"]',
].join(',');

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    typeof Element !== 'undefined' &&
    target instanceof Element &&
    target.closest(INTERACTIVE_SELECTOR) !== null
  );
}

function createPresentation(
  result: ResultSnapshotInput | null,
  status: ResultScreenProps['status'],
  stage: StageDefinition | null,
): ResultPresentation | null {
  if (result === null || stage === null) return null;

  try {
    return createResultPresentation(result, status, stage);
  } catch {
    return null;
  }
}

interface ResultRecordProps {
  readonly presentation: ResultPresentation | null;
  readonly stage: StageDefinition | null;
  readonly status: ResultScreenProps['status'];
}

function ResultRecord({ presentation, stage, status }: ResultRecordProps) {
  const stageCode = presentation?.stageCode ?? '—';
  const stageName = presentation?.stageName ?? stage?.name ?? 'RESULT UNAVAILABLE';
  const targetLabel = presentation?.targetLabel ?? stage?.targetLabel ?? 'NO TARGET RECORD';
  const stars = presentation?.stars ?? 0;
  const starText = presentation?.starText ?? '☆☆☆';

  return (
    <article className={styles.record} aria-label="Flight result record">
      <div className={styles.paperRule} aria-hidden="true" />
      <div className={styles.recordHeading}>
        <div>
          <span>HARVARD COMPUTATION LABORATORY</span>
          <strong>MARK II RELAY LOG</strong>
        </div>
        <span className={styles.recordNumber}>NO. {stageCode}</span>
      </div>

      <div className={styles.specimen} aria-hidden="true">
        <span className={styles.tape} />
        <span className={styles.leftWing} />
        <span className={styles.rightWing} />
        <span className={styles.mothBody} />
      </div>

      <p className={styles.recordStatus}>{status === 'cleared' ? 'CONTACT MADE' : 'RUN ABORTED'}</p>
      <h3>{stageName}</h3>
      <p className={styles.target}>{targetLabel}</p>

      <dl className={styles.metrics}>
        <div>
          <dt>STAGE</dt>
          <dd>{stageCode}</dd>
        </div>
        <div>
          <dt>RATING</dt>
          <dd>
            <span className={styles.stars} role="img" aria-label={`획득 별점 ${stars} / 3`}>
              {starText}
            </span>
          </dd>
        </div>
        <div>
          <dt>TIME</dt>
          <dd>
            {presentation === null ? (
              '—'
            ) : (
              <time dateTime={presentation.timeIso}>{presentation.timeLabel}</time>
            )}
          </dd>
        </div>
        <div>
          <dt>HEALTH</dt>
          <dd>
            {presentation === null ? (
              '—'
            ) : (
              <data value={presentation.remainingHealth}>{presentation.healthLabel}</data>
            )}
          </dd>
        </div>
      </dl>

      <p className={styles.logNote}>
        {status === 'cleared'
          ? 'RELAY CONTACT VERIFIED · SPECIMEN RECORDED'
          : 'NO CONTACT · INSPECT WINGS AND RETRY'}
      </p>
    </article>
  );
}

interface SharePreviewProps {
  readonly presentation: ResultPresentation | null;
  readonly previewUrl: string | null;
  readonly shareStatus: ReturnType<typeof useShareImage>['status'];
  readonly errorMessage: string;
  readonly onRetryImage: () => void;
  readonly retryFocusRef: RefObject<HTMLButtonElement>;
  readonly onCopyText: () => void;
}

function SharePreview({
  presentation,
  previewUrl,
  shareStatus,
  errorMessage,
  onRetryImage,
  retryFocusRef,
  onCopyText,
}: SharePreviewProps) {
  return (
    <section className={styles.sharePreview} aria-labelledby="share-preview-title">
      <div className={styles.previewHeading}>
        <div>
          <span>SHARE IMAGE</span>
          <h3 id="share-preview-title">LOGBOOK PLATE</h3>
        </div>
        <span>1080 × 1080 PNG</span>
      </div>

      <div className={styles.previewFrame}>
        {shareStatus === 'ready' && previewUrl !== null && presentation !== null ? (
          <img
            src={previewUrl}
            width="1080"
            height="1080"
            role="img"
            alt={`${presentation.stageCode} ${presentation.stageName} 클리어 결과 공유 이미지 미리보기`}
          />
        ) : shareStatus === 'error' ? (
          <div className={styles.previewError} role="alert">
            <strong>IMAGE GENERATION FAULT</strong>
            <p>{errorMessage || '공유 이미지를 준비하지 못했습니다.'}</p>
            <div className={styles.fallbackActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  retryFocusRef.current?.focus();
                  onRetryImage();
                }}
              >
                REBUILD IMAGE
              </Button>
              <Button variant="ghost" size="sm" onClick={onCopyText}>
                COPY RESULT TEXT
              </Button>
            </div>
          </div>
        ) : presentation === null ? (
          <div className={styles.previewError} role="alert">
            <strong>RESULT RECORD FAULT</strong>
            <p>공유 가능한 클리어 기록이 없습니다.</p>
          </div>
        ) : (
          <div className={styles.previewLoading} role="status">
            <span aria-hidden="true" />
            <strong>DEVELOPING LOGBOOK PLATE</strong>
            <p>1080 × 1080 PNG를 준비하고 있습니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export const ResultScreen = memo(function ResultScreen({
  status,
  result,
  stage,
  onRestart,
  onReturnToStages,
}: ResultScreenProps) {
  const presentation = useMemo(
    () => createPresentation(result, status, stage),
    [result, stage, status],
  );
  const sharePresentation = status === 'cleared' ? presentation : null;
  const {
    previewUrl,
    status: shareStatus,
    feedback,
    copy,
    copyText,
    download,
    retry,
  } = useShareImage(sharePresentation);
  const returnActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const shortcut = resolveResultShortcut(event, isInteractiveTarget(event.target));

      if (shortcut === null) return;
      event.preventDefault();

      if (shortcut === 'restart') onRestart();
      else onReturnToStages();
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [onRestart, onReturnToStages]);

  const title = status === 'cleared' ? 'STAGE CLEARED' : 'FLIGHT FAILED';
  const description =
    status === 'cleared'
      ? '접점 기록을 확인하고 1080 × 1080 로그북 이미지를 저장하거나 복사하세요.'
      : '비행 기록을 확인한 뒤 같은 단계를 다시 시도하거나 단계 선택으로 돌아가세요.';

  return (
    <Modal
      title={title}
      description={description}
      dismissible={false}
      initialFocusRef={returnActionRef as RefObject<HTMLElement>}
      onClose={() => undefined}
      plateCode="MARK II · FINAL FLIGHT RECORD"
      size="lg"
    >
      <div className={styles.layout} data-result-status={status}>
        <div className={styles.summaryColumn}>
          <ResultRecord presentation={presentation} stage={stage} status={status} />

          <div className={styles.actions} aria-label="Flight result actions">
            {status === 'cleared' ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  disabled={presentation === null || shareStatus !== 'ready'}
                  onClick={() => {
                    void copy().catch(() => undefined);
                  }}
                >
                  COPY IMAGE
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={presentation === null || shareStatus !== 'ready'}
                  onClick={download}
                >
                  DOWNLOAD PNG
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  disabled={presentation === null}
                  onClick={() => {
                    void copyText().catch(() => undefined);
                  }}
                >
                  COPY RESULT TEXT
                </Button>
              </>
            ) : null}
            <Button
              variant={status === 'failed' ? 'primary' : 'secondary'}
              size="lg"
              onClick={onRestart}
            >
              RETRY STAGE · R
            </Button>
            <Button ref={returnActionRef} variant="ghost" size="lg" onClick={onReturnToStages}>
              RETURN TO STAGES · ENTER
            </Button>
          </div>

          <p
            className={[styles.feedback, styles[feedback.tone]].join(' ')}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            aria-atomic="true"
          >
            {feedback.message || '\u00a0'}
          </p>
          <p className={styles.shortcutHint}>R · RETRY / ENTER · RETURN TO STAGES</p>
        </div>

        {status === 'cleared' ? (
          <SharePreview
            presentation={presentation}
            previewUrl={previewUrl}
            shareStatus={shareStatus}
            errorMessage={feedback.message}
            onRetryImage={retry}
            retryFocusRef={returnActionRef}
            onCopyText={() => {
              void copyText().catch(() => undefined);
            }}
          />
        ) : (
          <aside className={styles.failureBrief} aria-label="Failed flight guidance">
            <span aria-hidden="true">×</span>
            <strong>CONTACT NOT RECORDED</strong>
            <p>
              장애물과 접촉 경로를 다시 확인하세요. R로 즉시 재시작하거나 Enter로 단계 목록에 돌아갈
              수 있습니다.
            </p>
          </aside>
        )}
      </div>
    </Modal>
  );
});

export default ResultScreen;
