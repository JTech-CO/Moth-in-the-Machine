import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('M9 launch HTML contract', () => {
  it('ships meaningful title content before the React and 3D chunks execute', () => {
    expect(indexHtml).toContain('class="boot-shell"');
    expect(indexHtml).toContain('Moth <span>in the</span> Machine');
    expect(indexHtml).toContain('INITIALIZING RELAY BAY');
    expect(indexHtml).toContain('<noscript>');
    expect(indexHtml.indexOf('class="boot-shell"')).toBeLessThan(
      indexHtml.indexOf('src="/src/main.tsx"'),
    );
  });

  it('publishes canonical search and social metadata for the Pages release URL', () => {
    expect(indexHtml).toContain('name="description"');
    expect(indexHtml).toContain('name="robots" content="index, follow"');
    expect(indexHtml).toContain('property="og:title" content="Moth in the Machine"');
    expect(indexHtml).toContain(
      'property="og:url" content="https://jtech-co.github.io/Moth-in-the-Machine/"',
    );
    expect(indexHtml).toContain(
      'rel="canonical" href="https://jtech-co.github.io/Moth-in-the-Machine/"',
    );
    expect(indexHtml).toContain('name="twitter:card" content="summary"');
  });

  it('keeps viewport and theme metadata suitable for full-screen mobile rendering', () => {
    expect(indexHtml).toContain('name="viewport" content="width=device-width, initial-scale=1.0"');
    expect(indexHtml).toContain('name="theme-color" content="#0a0e17"');
    expect(indexHtml).toContain('min-height: 100dvh');
  });
});
