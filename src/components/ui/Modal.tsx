import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import styles from '@/components/ui/Modal.module.scss';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalProps {
  readonly children: ReactNode;
  readonly description?: ReactNode;
  readonly dismissible?: boolean;
  readonly initialFocusRef?: RefObject<HTMLElement>;
  readonly onClose: () => void;
  readonly plateCode?: ReactNode;
  readonly size?: 'md' | 'lg';
  readonly title: ReactNode;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) =>
      !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  );
}

export function Modal({
  children,
  description,
  dismissible = true,
  initialFocusRef,
  onClose,
  plateCode = 'MARK II · CONTROL INTERRUPT',
  size = 'md',
  title,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusTarget =
      initialFocusRef?.current ?? (panel ? getFocusableElements(panel)[0] : null) ?? panel;
    focusTarget?.focus();

    return () => previouslyFocused?.focus();
  }, [initialFocusRef]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && dismissible) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || panelRef.current === null) {
      return;
    }

    const focusable = getFocusableElements(panelRef.current);

    if (focusable.length === 0) {
      event.preventDefault();
      panelRef.current.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;

    if (dismissible) {
      onClose();
    } else {
      event.preventDefault();
    }
  };

  const modal = (
    <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
      <div
        ref={panelRef}
        className={[styles.panel, styles[size]].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.plateCode} aria-hidden="true">
          {plateCode}
        </span>
        <h2 id={titleId}>{title}</h2>
        {description === undefined ? null : (
          <div id={descriptionId} className={styles.description}>
            {description}
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
