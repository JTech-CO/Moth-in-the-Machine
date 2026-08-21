import { memo } from 'react';

import styles from '@/components/hud/Minimap.module.scss';
import { PLAYER_CENTER_BOUNDS } from '@/components/three/sceneConfig';
import { useGameStore } from '@/hooks/useGameStore';
import { projectMinimapPoint } from '@/utils/hudMetrics';
import type { StageDefinition, TargetSurface } from '@/utils/stages';

export interface MinimapProps {
  readonly stage: StageDefinition;
}

const SURFACE_COPY: Readonly<Record<TargetSurface, { badge: string; direction: string }>> = {
  floor: { badge: 'FLOOR', direction: 'LOW APPROACH' },
  ceiling: { badge: 'CEILING', direction: 'HIGH APPROACH' },
  'left-wall': { badge: 'LEFT', direction: 'PORT WALL' },
  'right-wall': { badge: 'RIGHT', direction: 'STARBOARD WALL' },
};

export const Minimap = memo(function Minimap({ stage }: MinimapProps) {
  const playerPosition = useGameStore((state) => state.player.position);
  const player = projectMinimapPoint(playerPosition, PLAYER_CENTER_BOUNDS);
  const target = projectMinimapPoint(stage.target.position, PLAYER_CENTER_BOUNDS);
  const surface = SURFACE_COPY[stage.target.surface];
  const altitudeDelta = stage.target.position.y - playerPosition.y;
  const altitude =
    Math.abs(altitudeDelta) < 0.2 ? 'LEVEL' : altitudeDelta > 0 ? 'ASCEND' : 'DESCEND';
  const figureTitle = `${stage.targetLabel} navigation plot`;

  return (
    <figure className={styles.root} aria-labelledby={`minimap-${stage.id}-title`}>
      <figcaption>
        <span id={`minimap-${stage.id}-title`}>{figureTitle}</span>
        <strong>{surface.badge}</strong>
      </figcaption>
      <svg
        className={styles.plot}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Top-down route to ${stage.targetLabel}; ${surface.direction}; ${altitude}`}
      >
        <path className={styles.grid} d="M8 25H92M8 50H92M8 75H92M29 8V92M50 8V92M71 8V92" />
        <line
          className={styles.route}
          x1={player.xPercent}
          y1={player.yPercent}
          x2={target.xPercent}
          y2={target.yPercent}
        />
        <circle className={styles.target} cx={target.xPercent} cy={target.yPercent} r="5.5" />
        <circle className={styles.targetCore} cx={target.xPercent} cy={target.yPercent} r="1.7" />
        <path
          className={styles.player}
          d={`M ${player.xPercent} ${player.yPercent - 4.5} L ${player.xPercent - 3.6} ${player.yPercent + 3.2} L ${player.xPercent} ${player.yPercent + 1.4} L ${player.xPercent + 3.6} ${player.yPercent + 3.2} Z`}
        />
      </svg>
      <div className={styles.readout}>
        <span>{surface.direction}</span>
        <strong>{altitude}</strong>
      </div>
    </figure>
  );
});
