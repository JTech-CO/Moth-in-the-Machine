import { memo, useEffect, useRef, useState } from 'react';

import styles from '@/components/hud/DamageOverlay.module.scss';
import { useGameStore } from '@/hooks/useGameStore';
import { getDamageFeedback, type DamageFeedback } from '@/utils/hudMetrics';

interface DamagePulse extends DamageFeedback {
  readonly revision: number;
}

export const DamageOverlay = memo(function DamageOverlay() {
  const health = useGameStore((state) => state.player.health);
  const previousHealth = useRef(health);
  const [pulse, setPulse] = useState<DamagePulse | null>(null);

  useEffect(() => {
    const feedback = getDamageFeedback(previousHealth.current, health);
    previousHealth.current = health;

    if (feedback !== null) {
      setPulse((current) => ({ ...feedback, revision: (current?.revision ?? 0) + 1 }));
    }
  }, [health]);

  if (pulse === null) return null;

  return (
    <div
      key={pulse.revision}
      className={styles.overlay}
      style={{ '--damage-severity': pulse.severity } as React.CSSProperties}
      aria-hidden="true"
    />
  );
});
