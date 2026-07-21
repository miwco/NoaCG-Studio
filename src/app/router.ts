// Hash routing for /app (docs/SAVED_CONTENT_MODEL.md §3). Hash routes survive any static
// host with zero rewrite config, refresh restores the same surface, and browser Back/Forward
// are real history — which is the whole point: Package → Graphic → Back returns to the
// package. The `?control=` / `?chat=` QUERY routes (hosted capability URLs) stay untouched
// in App.tsx; this store only owns the in-app surface.
//
// Routes:
//   ''                     the editor (whichever kind docKind persisted)
//   #/home[/<section>]     Home — recent / graphics / packages / controls / videos / looks
//   #/package/<id>         one package's contents
//   #/graphic/<id>         open that library graphic in the SPX editor (refresh restores it)
//   #/control/<graphicId>  the graphic's control panel
//   #/video                the video editor shell
//   #/new                  the creation wizard (Back closes it)

import { create } from 'zustand';

export type Route =
  | { view: 'editor' }
  | { view: 'home'; section: string | null }
  | { view: 'package'; id: string }
  | { view: 'graphic'; id: string }
  | { view: 'control'; id: string }
  | { view: 'video' }
  | { view: 'new' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'home':
      return { view: 'home', section: parts[1] ?? null };
    case 'package':
      return parts[1] ? { view: 'package', id: parts[1] } : { view: 'home', section: 'packages' };
    case 'graphic':
      return parts[1] ? { view: 'graphic', id: parts[1] } : { view: 'editor' };
    case 'control':
      return parts[1] ? { view: 'control', id: parts[1] } : { view: 'home', section: 'controls' };
    case 'video':
      return { view: 'video' };
    case 'new':
      return { view: 'new' };
    default:
      return { view: 'editor' };
  }
}

export function routeHash(route: Route): string {
  switch (route.view) {
    case 'editor':
      return '';
    case 'home':
      return route.section ? `#/home/${encodeURIComponent(route.section)}` : '#/home';
    case 'package':
      return `#/package/${encodeURIComponent(route.id)}`;
    case 'graphic':
      return `#/graphic/${encodeURIComponent(route.id)}`;
    case 'control':
      return `#/control/${encodeURIComponent(route.id)}`;
    case 'video':
      return '#/video';
    case 'new':
      return '#/new';
  }
}

interface RouterState {
  route: Route;
  /** Navigate forward (pushes history — Back returns here). */
  navigate: (route: Route) => void;
  /** Replace the current entry (no new history — e.g. after Save As re-points the URL). */
  replace: (route: Route) => void;
}

function currentRoute(): Route {
  return typeof window !== 'undefined' ? parseRoute(window.location.hash) : { view: 'editor' };
}

/** Write a hash without a same-route no-op (which would push a duplicate history entry). */
function writeHash(route: Route, mode: 'push' | 'replace'): void {
  const hash = routeHash(route);
  const url = hash === '' ? window.location.pathname + window.location.search : hash;
  if (window.location.hash === hash || (hash === '' && window.location.hash === '')) return;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

export const useRouter = create<RouterState>((set) => ({
  route: currentRoute(),
  navigate: (route) => {
    writeHash(route, 'push');
    set({ route });
  },
  replace: (route) => {
    writeHash(route, 'replace');
    set({ route });
  },
}));

// Back/Forward (and manual hash edits) update the store. pushState doesn't fire hashchange
// in the same document, so both events feed one handler; popstate covers history traversal.
if (typeof window !== 'undefined') {
  const sync = () => useRouter.setState({ route: currentRoute() });
  window.addEventListener('popstate', sync);
  window.addEventListener('hashchange', sync);
}
