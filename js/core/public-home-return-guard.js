(function installRavRadarPublicHomeReturn(scope) {
  const RETURN_SOURCE = 'about';

  function createPublicHomeReturnGuard({
    search = '',
    isHealthy,
    replace,
    mark = () => {},
    now = () => Date.now(),
    schedule = (callback, delay) => scope.setTimeout(callback, delay),
    timeoutMs = 6000,
    pollMs = 250,
  }) {
    const params = new URLSearchParams(search);
    const source = params.get('return');
    const retry = Math.max(0, Number.parseInt(params.get('retry') || '0', 10) || 0);
    let finished = false;
    let startedAt = 0;

    const finish = status => {
      if (finished) return status;
      finished = true;
      mark(status);
      return status;
    };

    const check = () => {
      if (finished) return;
      if (isHealthy()) {
        finish('ready');
        return;
      }
      if (now() - startedAt >= timeoutMs) {
        if (retry < 1) {
          finish('retrying');
          replace({ source: RETURN_SOURCE, retry: retry + 1 });
        } else {
          finish('failed');
        }
        return;
      }
      schedule(check, pollMs);
    };

    return {
      start() {
        if (source !== RETURN_SOURCE) return finish('ignored');
        mark('pending');
        startedAt = now();
        if (isHealthy()) return finish('ready');
        schedule(check, pollMs);
        return 'watching';
      },
    };
  }

  scope.RavRadarPublicHomeReturn = Object.freeze({ createPublicHomeReturnGuard });

  if (!scope.document || !scope.location) return;
  const root = scope.document.documentElement;
  const guard = createPublicHomeReturnGuard({
    search: scope.location.search,
    isHealthy: () => Boolean(
      scope.document.querySelector('#map .leaflet-map-pane')
      && scope.document.querySelector('#map .leaflet-overlay-pane path.leaflet-interactive')
      && scope.document.querySelectorAll('#ranking .ranking-item').length === 5
      && scope.document.querySelectorAll('.national-day-tab').length === 5
      && scope.document.querySelectorAll('#nationalForecastContent .national-zone-row').length === 5
    ),
    replace: ({ source, retry }) => {
      const target = new URL('./', scope.location.href);
      target.searchParams.set('return', source);
      target.searchParams.set('retry', String(retry));
      target.searchParams.set('nonce', String(Date.now()));
      scope.location.replace(target.href);
    },
    mark: status => { root.dataset.ravradarHomeReturn = status; },
  });
  guard.start();
})(globalThis);
