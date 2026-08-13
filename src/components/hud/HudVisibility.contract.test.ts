import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

function readStylesheet(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function readClassRule(stylesheet: string, className: string): string {
  const match = new RegExp(`\\.${className}\\s*\\{([^}]+)\\}`).exec(stylesheet);

  if (match === null) {
    throw new Error(`Missing .${className} rule.`);
  }

  return match[1];
}

describe('M7 HUD visibility CSS contract', () => {
  it('fills the Drei fullscreen child instead of using a fixed containing block', () => {
    const rootRule = readClassRule(readStylesheet('./GameHud.module.scss'), 'root');

    expect(rootRule).toMatch(/position:\s*absolute\s*;/);
    expect(rootRule).toMatch(/inset:\s*0\s*;/);
    expect(rootRule).toMatch(/width:\s*100%\s*;/);
    expect(rootRule).toMatch(/height:\s*100%\s*;/);
    expect(rootRule).not.toMatch(/position:\s*fixed\s*;/);
  });

  it('sizes damage feedback against the HUD surface rather than the transformed Html wrapper', () => {
    const overlayRule = readClassRule(readStylesheet('./DamageOverlay.module.scss'), 'overlay');

    expect(overlayRule).toMatch(/position:\s*absolute\s*;/);
    expect(overlayRule).toMatch(/inset:\s*0\s*;/);
    expect(overlayRule).not.toMatch(/position:\s*fixed\s*;/);
    expect(overlayRule).toMatch(/animation:\s*damage-pulse\b/);
  });
});
