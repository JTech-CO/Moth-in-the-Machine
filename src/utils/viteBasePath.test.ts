import { describe, expect, it } from 'vitest';

import { GITHUB_PAGES_BASE_PATH, resolveViteBasePath } from '@/utils/viteBasePath';

describe('resolveViteBasePath', () => {
  it('uses the repository path for the GitHub Pages build mode', () => {
    expect(resolveViteBasePath('github-pages')).toBe('/Moth-in-the-Machine/');
    expect(resolveViteBasePath('github-pages')).toBe(GITHUB_PAGES_BASE_PATH);
  });

  it('keeps local development and ordinary production builds at the origin root', () => {
    expect(resolveViteBasePath('development')).toBe('/');
    expect(resolveViteBasePath('production')).toBe('/');
  });
});
