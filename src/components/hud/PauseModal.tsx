import { memo, useRef } from 'react';

import styles from '@/components/hud/PauseModal.module.scss';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export interface PauseModalProps {
  readonly needsPointerLock: boolean;
  readonly onContinue: () => void;
  readonly onRestart: () => void;
  readonly onReturnToStages: () => void;
}

export const PauseModal = memo(function PauseModal({
  needsPointerLock,
  onContinue,
  onRestart,
  onReturnToStages,
}: PauseModalProps) {
  const continueRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      title="FLIGHT PAUSED"
      description="Mark II relay timing is suspended. Resume when your controls are ready."
      initialFocusRef={continueRef}
      onClose={onContinue}
    >
      {needsPointerLock ? (
        <p className={styles.lockHint} role="status">
          POINTER CONTROL RELEASED · CONTINUE를 누르거나 화면을 클릭해 시야 제어를 복구하세요.
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button ref={continueRef} variant="primary" size="lg" onClick={onContinue}>
          CONTINUE FLIGHT
        </Button>
        <Button variant="secondary" onClick={onRestart}>
          RESTART STAGE
        </Button>
        <Button variant="ghost" onClick={onReturnToStages}>
          RETURN TO STAGES
        </Button>
      </div>
      <small className={styles.shortcut}>P / ESC · CONTINUE</small>
    </Modal>
  );
});
