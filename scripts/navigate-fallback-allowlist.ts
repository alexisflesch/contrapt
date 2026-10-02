const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The navigations the service worker answers with `index.html` when offline:
 * the app's client-side routes (ADR 0008, `/import` included: it redirects to
 * `/my-levels`), under the deployment base path
 * (`/` locally, `/<repository>/` on GitHub Pages).
 */
export const createNavigateFallbackAllowlist = (basePath: string): RegExp => {
  const routeBasePattern = escapeRegExp(basePath === '/' ? '' : basePath.replace(/\/$/, ''));
  return new RegExp(
    `^${routeBasePattern}/(?:levels(?:/.*)?|my-levels(?:/.*)?|editor|import|settings|shared|bench(?:/.*)?)/?$|^${routeBasePattern}/?$`,
  );
};
