import { memo, useCallback, useEffect, useRef, useState } from 'react';

import styles from '@/components/hud/GameHud.module.scss';
import { DamageOverlay } from '@/components/hud/DamageOverlay';
import { Minimap } from '@/components/hud/Minimap';
import { PauseModal } from '@/components/hud/PauseModal';
import { Timer } from '@/components/hud/Timer';
import { Button } from '@/components/ui/Button';
import { HealthBar } from '@/components/ui/HealthBar';
import { StarDisplay } from '@/components/ui/StarDisplay';
import { useGameStore } from '@/hooks/useGameStore';
import { resolveHudStars } from '@/utils/hudMetrics';
import { requestCanvasPointerLock } from '@/utils/pointerLock';
import type { StageDefinition } from '@/utils/stages';

export interface GameHudProps {
  readonly canvas: HTMLCanvasElement;
  readonly stage: StageDefinition;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]') !== null
  );
}

export const GameHud = memo(function GameHud({ canvas, stage }: GameHudProps) {
  const health = useGameStore((state) => state.player.health);
  const status = useGameStore((state) => state.status);
  const finalStars = useGameStore((state) => state.stars);
  const showControlHints = useGameStore((state) => state.settings.showControlHints);
  const pauseStage = useGameStore((state) => state.pauseStage);
  const resumeStage = useGameStore((state) => state.resumeStage);
  const startStage = useGameStore((state) => state.startStage);
  const returnToMenu = useGameStore((state) => state.returnToMenu);
  const [damageRevision, setDamageRevision] = useState(0);
  const [needsPointerLock, setNeedsPointerLock] = useState(status === 'playing');
  const previousHealth = useRef(health);
  const statusRef = useRef(status);
  const acquiredCanvasLock = useRef(false);
  const wasCanvasLocked = useRef(false);
  const terminal = status === 'cleared' || status === 'failed';
  const hudStars = resolveHudStars(health, terminal ? finalStars : undefined);

  statusRef.current = status;

  useEffect(() => {
    if (health < previousHealth.current) {
      setDamageRevision((revision) => revision + 1);
    }

    previousHealth.current = health;
  }, [health]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    statusRef.current = 'paused';
    pauseStage();
  }, [pauseStage]);

  const continueFlight = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    const lockStarted = requestCanvasPointerLock(canvas);
    setNeedsPointerLock(!lockStarted);
    statusRef.current = 'playing';
    resumeStage();
  }, [canvas, resumeStage]);

  const restartStage = useCallback(() => {
    acquiredCanvasLock.current = false;
    wasCanvasLocked.current = false;
    setNeedsPointerLock(true);
    statusRef.current = 'playing';
    startStage(stage.id);
  }, [stage.id, startStage]);

  const returnToStages = useCallback(() => {
    setNeedsPointerLock(false);
    statusRef.current = 'idle';
    returnToMenu();
  }, [returnToMenu]);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isEditableTarget(event.target) ||
        (event.code !== 'KeyP' && event.code !== 'Escape' && event.code !== 'KeyR')
      ) {
        return;
      }

      if (event.code === 'KeyR') {
        if (statusRef.current === 'playing' || statusRef.current === 'paused') {
          event.preventDefault();
          restartStage();
        }
        return;
      }

      if (statusRef.current === 'playing') {
        event.preventDefault();
        pause();
      } else if (statusRef.current === 'paused') {
        event.preventDefault();
        continueFlight();
      }
    };
    const handleVisibility = () => {
      if (document.hidden && statusRef.current === 'playing') pause();
    };
    const handlePointerLock = () => {
      const canvasLocked = document.pointerLockElement === canvas;

      if (canvasLocked) {
        acquiredCanvasLock.current = true;
        setNeedsPointerLock(false);
      } else if (statusRef.current === 'playing') {
        setNeedsPointerLock(true);

        if (acquiredCanvasLock.current && wasCanvasLocked.current) {
          statusRef.current = 'paused';
          pauseStage();
        }
      }

      wasCanvasLocked.current = canvasLocked;
    };
    const handlePointerLockError = () => {
      if (statusRef.current === 'playing') {
        setNeedsPointerLock(true);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('pointerlockchange', handlePointerLock);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    handlePointerLock();

    return () => {
      window.removeEventListener('keydown', handleKeyboard);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('pointerlockchange', handlePointerLock);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
    };
  }, [canvas, continueFlight, pause, pauseStage, restartStage, status]);

  return (
    <div className={styles.root} data-hud-status={status} aria-label="Flight instruments">
      <DamageOverlay />
      <header className={styles.header}>
        <section className={styles.stagePanel} aria-label="Current stage">
          <span>
            {stage.difficulty.toUpperCase()} ·{' '}
            {String(stage.stageNumberWithinDifficulty).padStart(2, '0')}
          </span>
          <strong>{stage.name}</strong>
          <StarDisplay rating={hudStars} label={terminal ? '획득 별점' : '예상 별점'} />
        </section>
        <HealthBar health={health} damageRevision={damageRevision} />
        <Timer />
      </header>

      <aside className={styles.navigation} aria-label="Navigation instruments">
        <Minimap stage={stage} />
        {!terminal ? (
          <Button className={styles.pauseButton} variant="ghost" size="sm" onClick={pause}>
            PAUSE · P
          </Button>
        ) : null}
      </aside>

      {showControlHints && !terminal ? (
        <p className={styles.controlHints}>
          <span>WASD / ARROWS · FLIGHT</span>
          <span>SPACE · LANDING MODE</span>
          <span>T · CAMERA</span>
          <span>P / ESC · PAUSE</span>
        </p>
      ) : null}

      {needsPointerLock && status === 'playing' ? (
        <p className={styles.pointerHint} role="status">
          CLICK FLIGHT VIEW · POINTER CONTROL
        </p>
      ) : null}

      {status === 'paused' ? (
        <PauseModal
          needsPointerLock={needsPointerLock}
          onContinue={continueFlight}
          onRestart={restartStage}
          onReturnToStages={returnToStages}
        />
      ) : null}
    </div>
  );
});
