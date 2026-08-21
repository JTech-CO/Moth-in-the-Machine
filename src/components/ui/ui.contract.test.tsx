import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/Button';
import { HealthBar } from '@/components/ui/HealthBar';
import { Modal } from '@/components/ui/Modal';
import { StarDisplay } from '@/components/ui/StarDisplay';

describe('M7 shared UI SSR contracts', () => {
  it('forwards native button attributes and renders each physical control variant', () => {
    const markup = renderToStaticMarkup(
      <>
        <Button variant="primary" size="sm" aria-label="Primary action">
          PRIMARY
        </Button>
        <Button variant="secondary" size="md" disabled>
          SECONDARY
        </Button>
        <Button variant="ghost" size="lg" data-control="ghost">
          GHOST
        </Button>
      </>,
    );

    expect(markup).toContain('aria-label="Primary action"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('data-control="ghost"');
    expect(markup.match(/type="button"/g)).toHaveLength(3);
  });

  it('renders a labelled dialog with description and an SSR inline fallback', () => {
    const markup = renderToStaticMarkup(
      <Modal
        title="FLIGHT PAUSED"
        description="Relay timing suspended"
        initialFocusRef={createRef<HTMLButtonElement>()}
        onClose={vi.fn()}
      >
        <Button>CONTINUE FLIGHT</Button>
      </Modal>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby=');
    expect(markup).toContain('aria-describedby=');
    expect(markup).toContain('MARK II · CONTROL INTERRUPT');
    expect(markup).toContain('CONTINUE FLIGHT');
  });

  it('renders a non-dismissible result dialog without a close affordance', () => {
    const markup = renderToStaticMarkup(
      <Modal
        title="STAGE CLEARED"
        dismissible={false}
        plateCode="FINAL RECORD"
        size="lg"
        onClose={vi.fn()}
      >
        <Button>RETURN TO STAGES · ENTER</Button>
      </Modal>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('FINAL RECORD');
    expect(markup).toContain('RETURN TO STAGES · ENTER');
  });

  it('exposes numeric health plus a non-colour status and ten instrument segments', () => {
    const markup = renderToStaticMarkup(<HealthBar health={24.2} damageRevision={3} />);

    expect(markup).toContain('aria-label="Moth health"');
    expect(markup).toContain('<meter');
    expect(markup).toContain('25 HP');
    expect(markup).toContain('CRITICAL');
    expect(markup.match(/data-health-segment=/g)).toHaveLength(10);
  });

  it.each([0, 1, 2, 3] as const)('renders three visible star icons for rating %i', (rating) => {
    const markup = renderToStaticMarkup(<StarDisplay rating={rating} />);

    expect(markup).toContain(`aria-label="별점 ${rating} / 3"`);
    expect((markup.match(/[★☆]/g) ?? []).length).toBe(3);
  });
});
