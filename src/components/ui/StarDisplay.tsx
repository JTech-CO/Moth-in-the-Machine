import { memo } from 'react';

import styles from '@/components/ui/StarDisplay.module.scss';
import type { StarRating } from '@/utils/starCalculator';

export interface StarDisplayProps {
  readonly label?: string;
  readonly rating: StarRating;
}

const RATING_CLASS = ['unrated', 'bronze', 'silver', 'gold'] as const;

export const StarDisplay = memo(function StarDisplay({ label = '별점', rating }: StarDisplayProps) {
  return (
    <span
      className={[styles.root, styles[RATING_CLASS[rating]]].join(' ')}
      role="img"
      aria-label={`${label} ${rating} / 3`}
    >
      {Array.from({ length: 3 }, (_, index) => (
        <span
          key={index}
          className={index < rating ? styles.filled : styles.empty}
          aria-hidden="true"
        >
          {index < rating ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
});
