import { memo } from 'react';

import styles from '@/components/hud/Timer.module.scss';
import { useGameStore } from '@/hooks/useGameStore';
import { formatHudTime, toDurationIso } from '@/utils/hudMetrics';

export const Timer = memo(function Timer() {
  const elapsedTimeMs = useGameStore((state) => state.elapsedTimeMs);

  return (
    <section className={styles.root} aria-label="Flight timer">
      <span>ELAPSED</span>
      <time dateTime={toDurationIso(elapsedTimeMs)}>{formatHudTime(elapsedTimeMs)}</time>
    </section>
  );
});
