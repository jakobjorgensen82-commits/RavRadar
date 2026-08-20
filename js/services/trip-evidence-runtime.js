import { createTripEvidenceController } from './trip-evidence-controller.js?v=4.0.242';
import { createTripStartFromPublicState } from './trip-evidence-public-adapter.js?v=4.0.242';

function defaultTripId() {
  if (globalThis.crypto?.randomUUID) return `trip-${globalThis.crypto.randomUUID()}`;
  return `trip-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPublicTripEvidenceRuntime({
  getContext,
  persist = null,
  storage = null,
  openDialog,
  now = () => new Date().toISOString(),
  createTripId = defaultTripId
} = {}) {
  if (typeof getContext !== 'function') throw new Error('RavRadar-konteksten mangler.');
  const controller = createTripEvidenceController({ storage, persist, openDialog });

  const readContext = () => {
    const context = getContext();
    if (!context || typeof context !== 'object') throw new Error('RavRadar-konteksten er ikke klar.');
    return context;
  };

  return Object.freeze({
    start() {
      const context = readContext();
      const startedAt = now();
      const prepared = createTripStartFromPublicState({
        tripId: createTripId(),
        startedAt,
        mode: context.mode,
        zoneId: context.zoneId,
        coastalPartId: context.coastalPartId,
        manifest: context.manifest,
        conditions: context.conditions,
        coastalPart: context.coastalPart,
        appVersion: context.appVersion,
        modelVersion: context.modelVersion
      });
      return controller.start({
        tripId: prepared.tripId,
        startedAt: prepared.startedAt,
        mode: prepared.mode,
        zoneId: prepared.forecastZoneId,
        coastalPartId: prepared.forecastCoastalPartId,
        forecastSnapshot: prepared.forecastSnapshot,
        calibrationFeatures: prepared.calibrationFeatures
      });
    },
    stop() {
      const context = readContext();
      return controller.stop({ endedAt: now(), zones: context.zones, coastalParts: context.coastalParts });
    },
    resume() {
      const context = readContext();
      return controller.resume({ zones: context.zones, coastalParts: context.coastalParts });
    },
    flush() {
      return controller.flush();
    },
    active() {
      return controller.active();
    }
  });
}
