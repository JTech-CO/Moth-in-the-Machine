import { memo } from 'react';

import styles from '@/components/ui/HealthBar.module.scss';

export interface HealthBarProps {
  readonly damageRevision?: number;
  readonly health: number;
}

function getHealthState(health: number): 'stable' | 'caution' | 'critical' {
  if (health <= 25) return 'critical';
  if (health <= 50) return 'caution';
  return 'stable';
}

export const HealthBar = memo(function HealthBar({ damageRevision = 0, health }: HealthBarProps) {
  const normalizedHealth = Number.isFinite(health) ? Math.min(100, Math.max(0, health)) : 0;
  const state = getHealthState(normalizedHealth);
  const activeSegments = Math.ceil(normalizedHealth / 10);

  return (
    <section
      key={damageRevision}
      className={[styles.root, styles[state], damageRevision > 0 ? styles.damaged : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Moth health"
    >
      <div className={styles.heading}>
        <span>HEALTH</span>
        <strong>{Math.ceil(normalizedHealth)} HP</strong>
        <em>{state.toUpperCase()}</em>
      </div>
      <meter className={styles.semanticMeter} min={0} max={100} value={normalizedHealth}>
        {normalizedHealth} of 100
      </meter>
      <div className={styles.segments} aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className={index < activeSegments ? styles.activeSegment : undefined}
            data-health-segment={index + 1}
          />
        ))}
      </div>
    </section>
  );
});
