const GITHUB_PAGES_MODE = 'github-pages';

export const GITHUB_PAGES_BASE_PATH = '/Moth-in-the-Machine/';

export function resolveViteBasePath(mode: string): string {
  return mode === GITHUB_PAGES_MODE ? GITHUB_PAGES_BASE_PATH : '/';
}
