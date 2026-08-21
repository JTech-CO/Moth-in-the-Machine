import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GameHud } from '@/components/hud/GameHud';
import { getStageDefinition } from '@/utils/stages';

const captured = vi.hoisted(() => ({
  state: {
    player: { health: 72, position: { x: 0, y: -0.25, z: 3.55 } },
    elapsedTimeMs: 62_340,
    status: 'playing',
    stars: 0,
    settings: { showControlHints: true },
    pauseStage: vi.fn(),
    resumeStage: vi.fn(),
    startStage: vi.fn(),
    returnToMenu: vi.fn(),
  },
}));

vi.mock('@/hooks/useGameStore', () => ({
  useGameStore: (selector: (state: typeof captured.state) => unknown) => selector(captured.state),
}));

describe('M7 GameHud SSR contract', () => {
  beforeEach(() => {
    captured.state.status = 'playing';
    captured.state.stars = 0;
    captured.state.player.health = 72;
    captured.state.settings.showControlHints = true;
  });

  it('renders stage, health, timer, stars, navigation plot, controls, and pause affordance', () => {
    const canvas = {} as HTMLCanvasElement;
    const markup = renderToStaticMarkup(<GameHud stage={getStageDefinition(8)} canvas={canvas} />);

    expect(markup).toContain('aria-label="Flight instruments"');
    expect(markup).toContain('NORMAL · 01');
    expect(markup).toContain('aria-label="Moth health"');
    expect(markup).toContain('72 HP');
    expect(markup).toContain('<time dateTime="PT1M2.34S">01:02.3</time>');
    expect(markup).toContain('aria-label="예상 별점 2 / 3"');
    expect(markup).toContain('navigation plot');
    expect(markup).toContain('<svg');
    expect(markup).toContain('Top-down route');
    expect(markup).toContain('P / ESC · PAUSE');
    expect(markup).toContain('PAUSE · P');
    expect(markup).toContain('CLICK FLIGHT VIEW · POINTER CONTROL');
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain('aria-live');
  });

  it('renders the accessible pause dialog and all three actions only while paused', () => {
    captured.state.status = 'paused';
    const markup = renderToStaticMarkup(
      <GameHud stage={getStageDefinition(8)} canvas={{} as HTMLCanvasElement} />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('FLIGHT PAUSED');
    expect(markup).toContain('CONTINUE FLIGHT');
    expect(markup).toContain('RESTART STAGE');
    expect(markup).toContain('RETURN TO STAGES');
  });

  it('uses final store stars and removes pause controls for a terminal run', () => {
    captured.state.status = 'cleared';
    captured.state.stars = 1;
    captured.state.player.health = 100;
    const markup = renderToStaticMarkup(
      <GameHud stage={getStageDefinition(8)} canvas={{} as HTMLCanvasElement} />,
    );

    expect(markup).toContain('aria-label="획득 별점 1 / 3"');
    expect(markup).not.toContain('PAUSE · P');
    expect(markup).not.toContain('P / ESC · PAUSE');
    expect(markup).not.toContain('role="dialog"');
  });
});
