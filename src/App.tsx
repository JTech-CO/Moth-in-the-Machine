import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';

import styles from '@/App.module.scss';
import type { SceneAvailability } from '@/components/three/SceneCanvas';
import { useGameStore } from '@/hooks/useGameStore';
import {
  CAMPAIGN_DIFFICULTIES,
  getDifficultyUnlocks,
  getStageIdsForDifficulty,
  normalizeCompletedStageIds,
  type CampaignDifficulty,
} from '@/utils/campaignProgression';
import { getStageDefinition, isStageId, TOTAL_STAGE_COUNT } from '@/utils/stages';

const SceneCanvas = lazy(() => import('@/components/three/SceneCanvas'));

type SceneStatus = 'loading' | SceneAvailability;

interface SceneErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onError: () => void;
}

interface SceneErrorBoundaryState {
  readonly hasError: boolean;
}

interface DifficultyCopy {
  readonly label: string;
  readonly environment: string;
  readonly description: string;
}

const DIFFICULTY_COPY: Readonly<Record<CampaignDifficulty, DifficultyCopy>> = {
  tutorial: {
    label: 'TUTORIAL',
    environment: 'CONTACT CHECK',
    description: '비행과 표면 착륙을 익히는 1개 연습 단계',
  },
  easy: {
    label: 'EASY',
    environment: 'RELAY BAY',
    description: 'Mark II 릴레이 회랑을 통과하는 6개 단계',
  },
  normal: {
    label: 'NORMAL',
    environment: 'SWITCHING GALLERY',
    description: '교차 게이트와 다중 표면 착륙이 포함된 6개 단계',
  },
  hard: {
    label: 'HARD',
    environment: 'LOGIC LABYRINTH',
    description: '복잡한 데크와 코어를 돌파하는 6개 단계',
  },
};

class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error('The M6 stage scene failed to render.', error, errorInfo.componentStack);
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.hasError ? <SceneFailure /> : this.props.children;
  }
}

function SceneLoading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.loadingLight} aria-hidden="true" />
      INITIALIZING RELAY BAY
    </div>
  );
}

function SceneFailure() {
  return (
    <div className={styles.failure} role="alert">
      <div>
        <span>RELAY BAY · FAULT</span>
        <strong>3D 환경을 불러오지 못했습니다.</strong>
        <p>페이지를 새로고침하거나 WebGL2를 지원하는 최신 브라우저에서 다시 시도해 주세요.</p>
      </div>
    </div>
  );
}

function formatBestTime(bestTimeMs: number): string {
  const minutes = Math.floor(bestTimeMs / 60_000);
  const seconds = (bestTimeMs % 60_000) / 1000;

  return minutes > 0
    ? `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`
    : `${seconds.toFixed(1)}s`;
}

function App() {
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>('loading');
  const [selectedDifficulty, setSelectedDifficulty] = useState<CampaignDifficulty | null>(null);
  const currentStageId = useGameStore((state) => state.currentStageId);
  const health = useGameStore((state) => state.player.health);
  const gameStatus = useGameStore((state) => state.status);
  const stars = useGameStore((state) => state.stars);
  const progress = useGameStore((state) => state.progress);
  const startStage = useGameStore((state) => state.startStage);
  const markSceneUnavailable = useCallback(() => setSceneStatus('unavailable'), []);
  const sceneReady = sceneStatus === 'ready';
  const showMenu = gameStatus === 'idle';
  const showResultPrompt = gameStatus === 'cleared' || gameStatus === 'failed';
  const completedStageIds = [
    ...normalizeCompletedStageIds(progress.completedStages.map((stage) => stage.stageId)),
  ];
  const unlocks = getDifficultyUnlocks(completedStageIds);
  const activeStage =
    currentStageId !== null && isStageId(currentStageId)
      ? getStageDefinition(currentStageId)
      : null;
  const campaignSection =
    activeStage === null
      ? 'CAMPAIGN'
      : activeStage.difficulty === 'tutorial'
        ? 'TUTORIAL'
        : activeStage.difficulty.toUpperCase() +
          ' ' +
          String(activeStage.stageNumberWithinDifficulty).padStart(2, '0') +
          ' / 06';
  const launchStage = useCallback(
    (stageId: number) => {
      if (sceneStatus === 'ready' && gameStatus === 'idle') {
        startStage(stageId);
      }
    },
    [gameStatus, sceneStatus, startStage],
  );
  const statusReadout =
    gameStatus === 'cleared' ? 'CLEARED · ' + stars + ' STAR' : gameStatus.toUpperCase();
  const environmentChecks = [
    [
      'STAGE',
      currentStageId === null
        ? '-- / ' + TOTAL_STAGE_COUNT
        : String(currentStageId).padStart(2, '0') + ' / ' + TOTAL_STAGE_COUNT,
    ],
    ['HEALTH', Math.ceil(health) + ' HP'],
    ['STATUS', statusReadout],
  ] as const;
  const menuStatus =
    sceneStatus === 'unavailable'
      ? 'FLIGHT SYSTEMS OFFLINE'
      : sceneReady
        ? 'FLIGHT SYSTEMS READY'
        : 'FLIGHT SYSTEMS SYNCING';

  return (
    <main className={styles.screen}>
      <SceneErrorBoundary onError={markSceneUnavailable}>
        <Suspense fallback={<SceneLoading />}>
          <SceneCanvas menuDifficulty={selectedDifficulty} onAvailabilityChange={setSceneStatus} />
        </Suspense>
      </SceneErrorBoundary>

      <div className={styles.vignette} aria-hidden="true" />

      <section
        className={[styles.readout, showMenu ? styles.campaignReadout : '']
          .filter(Boolean)
          .join(' ')}
        aria-labelledby="project-title"
      >
        <p className={styles.eyebrow}>HARVARD COMPUTATION LABORATORY · MARK II · 1947</p>
        <h1 id="project-title" className={styles.title}>
          Moth <span>in the</span> Machine
        </h1>

        {showMenu ? (
          selectedDifficulty === null ? (
            <>
              <p className={styles.introStory}>
                1947년 하버드 Mark II의 릴레이 회랑. 실제 기록에 남은 ‘나방 버그’가 되어 난이도와
                단계를 고른 뒤 START FLIGHT. 지정 접점에 정확히 착지하세요.
              </p>
              <ul className={styles.introControls} aria-label="기본 조작법">
                <li>
                  <strong>WASD / ARROWS</strong>
                  <span>비행</span>
                </li>
                <li>
                  <strong>MOUSE</strong>
                  <span>시야</span>
                </li>
                <li>
                  <strong>SPACE</strong>
                  <span>착륙 준비 / 호버</span>
                </li>
                <li>
                  <strong>T</strong>
                  <span>1인칭 / 3인칭</span>
                </li>
              </ul>

              <div className={styles.menuHeading}>
                <div>
                  <span>CAMPAIGN SELECT</span>
                  <h2>난이도를 선택하세요</h2>
                </div>
                <strong>
                  {completedStageIds.length} / {TOTAL_STAGE_COUNT} CLEARED
                </strong>
              </div>

              <nav className={styles.difficultyGrid} aria-label="난이도 선택">
                {CAMPAIGN_DIFFICULTIES.map((difficulty) => {
                  const copy = DIFFICULTY_COPY[difficulty];
                  const unlock = unlocks[difficulty];
                  const stageIds = getStageIdsForDifficulty(difficulty);
                  const completedCount = stageIds.filter((stageId) =>
                    completedStageIds.includes(stageId),
                  ).length;
                  const lockedCondition =
                    difficulty === 'easy'
                      ? '튜토리얼 클리어 시 플레이 가능'
                      : difficulty === 'normal'
                        ? `EASY 단계 3개 이상 클리어 시 플레이 가능 (${unlock.prerequisiteCompleted} / 3)`
                        : difficulty === 'hard'
                          ? `NORMAL 단계 3개 이상 클리어 시 플레이 가능 (${unlock.prerequisiteCompleted} / 3)`
                          : '잠금 조건 없음';

                  return (
                    <button
                      key={difficulty}
                      className={[
                        styles.difficultyCard,
                        unlock.unlocked ? styles.unlockedCard : styles.lockedCard,
                      ].join(' ')}
                      type="button"
                      disabled={!unlock.unlocked}
                      aria-label={`${copy.label} 난이도, ${unlock.unlocked ? '플레이 가능' : lockedCondition}`}
                      onClick={() => setSelectedDifficulty(difficulty)}
                    >
                      <span className={styles.cardStatus}>
                        {unlock.unlocked
                          ? `${completedCount} / ${stageIds.length} CLEARED`
                          : 'LOCKED'}
                      </span>
                      <strong>{copy.label}</strong>
                      <span className={styles.cardEnvironment}>{copy.environment}</span>
                      <span className={styles.cardDescription}>{copy.description}</span>
                      <span className={styles.unlockCondition}>
                        {unlock.unlocked ? lockedCondition : `LOCKED · ${lockedCondition}`}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </>
          ) : (
            <>
              <div className={styles.stageMenuHeader}>
                <button
                  className={styles.backButton}
                  type="button"
                  onClick={() => setSelectedDifficulty(null)}
                >
                  ← BACK TO DIFFICULTY
                </button>
                <div>
                  <span>{DIFFICULTY_COPY[selectedDifficulty].environment}</span>
                  <h2>{DIFFICULTY_COPY[selectedDifficulty].label} STAGES</h2>
                  <p>{DIFFICULTY_COPY[selectedDifficulty].description}</p>
                </div>
              </div>

              <div
                className={styles.stageGrid}
                aria-label={`${DIFFICULTY_COPY[selectedDifficulty].label} 단계 선택`}
              >
                {getStageIdsForDifficulty(selectedDifficulty).map((stageId) => {
                  const stage = getStageDefinition(stageId);
                  const record = progress.completedStages.find((item) => item.stageId === stageId);
                  const stageNumber = String(stage.stageNumberWithinDifficulty).padStart(2, '0');

                  return (
                    <button
                      key={stageId}
                      className={[
                        styles.stageCard,
                        record === undefined ? '' : styles.completedStage,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      type="button"
                      disabled={!sceneReady}
                      aria-label={`${DIFFICULTY_COPY[selectedDifficulty].label} ${stageNumber}, ${stage.name}, 목표 ${stage.targetLabel}${
                        record === undefined
                          ? ', 미완료'
                          : `, 별 ${record.bestStars}개, 최고 기록 ${formatBestTime(record.bestTimeMs)}`
                      }, ${sceneReady ? '비행 시작' : '시스템 준비 중'}`}
                      onClick={() => launchStage(stageId)}
                    >
                      <span className={styles.stageNumber}>
                        {selectedDifficulty === 'tutorial'
                          ? 'T-01'
                          : `${DIFFICULTY_COPY[selectedDifficulty].label[0]}-${stageNumber}`}
                      </span>
                      <strong className={styles.stageTitle}>{stage.name}</strong>
                      <span className={styles.stageTarget}>{stage.targetLabel}</span>
                      {record === undefined ? (
                        <span className={styles.stageRecord}>
                          <span className={styles.stageStars} role="img" aria-label="별 기록 없음">
                            ☆☆☆
                          </span>
                          <span className={styles.stageTime}>NO RECORD</span>
                        </span>
                      ) : (
                        <span className={styles.stageRecord}>
                          <span
                            className={styles.stageStars}
                            role="img"
                            aria-label={`최고 별 ${record.bestStars}개`}
                          >
                            {'★'.repeat(record.bestStars)}
                            {'☆'.repeat(3 - record.bestStars)}
                          </span>
                          <span className={styles.stageTime}>
                            BEST {formatBestTime(record.bestTimeMs)}
                          </span>
                        </span>
                      )}
                      <span className={styles.stageAction}>
                        <span>{sceneReady ? 'START FLIGHT' : 'SYSTEMS SYNCING'}</span>
                        {sceneReady ? <span aria-hidden="true">→</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )
        ) : (
          <>
            <p className={styles.summary}>
              {sceneReady
                ? campaignSection +
                  ' · 목표 접점에 정확히 착지하세요. R은 재시작, 종료 후 Enter는 단계 선택입니다.'
                : '비행 시스템을 동기화하고 있습니다. 3D 렌더러가 준비되는 중입니다.'}
            </p>

            <dl className={styles.systems}>
              {environmentChecks.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{sceneReady ? value : 'SYNCING'}</dd>
                  {label === 'HEALTH' ? (
                    <meter
                      className={styles.healthMeter}
                      min={0}
                      max={100}
                      value={health}
                      aria-label="Moth health"
                    >
                      {health}
                    </meter>
                  ) : null}
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
      {showResultPrompt ? (
        <aside
          className={[
            styles.resultPrompt,
            gameStatus === 'cleared' ? styles.clearedPrompt : styles.failedPrompt,
          ].join(' ')}
          role="status"
          aria-live="polite"
        >
          <span>{gameStatus === 'cleared' ? 'STAGE CLEARED' : 'FLIGHT FAILED'}</span>
          <strong>ENTER</strong>
          <p>
            {gameStatus === 'cleared'
              ? '다음 단계 선택 화면으로 이동'
              : '메인 · 단계 선택 화면으로 복귀'}
          </p>
          <small>R · 현재 단계 다시 시작</small>
        </aside>
      ) : null}

      <footer className={styles.footer}>
        <span>
          {showMenu
            ? 'NO INSTALL · 19 STAGES · TUTORIAL + EASY / NORMAL / HARD'
            : 'CLICK · WASD / ARROWS + MOUSE · SPACE MODE · T VIEW · R RETRY · ENTER MENU'}
        </span>
        {showMenu ? (
          <span className={sceneReady ? styles.ready : styles.pending} role="status">
            <span aria-hidden="true">●</span> {menuStatus}
          </span>
        ) : (
          <span className={sceneReady ? styles.ready : styles.pending}>
            <span aria-hidden="true">●</span>{' '}
            {sceneReady ? 'M6 · STAGE SYSTEMS ONLINE' : 'STAGE SYSTEMS SYNCING'}
          </span>
        )}
      </footer>
    </main>
  );
}

export default App;
