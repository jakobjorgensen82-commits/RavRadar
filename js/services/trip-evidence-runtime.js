import { createTripEvidenceController } from './trip-evidence-controller.js?v=4.0.312';
import { createTripStartFromPublicState } from './trip-evidence-public-adapter.js?v=4.0.312';
import { openTripEvidenceStartDialog } from '../ui/trip-evidence-dialog.js?v=4.0.312';

function defaultTripId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createPublicTripEvidenceRuntime({
  getContext,
  persist = null,
  storage = null,
  openDialog,
  openStartDialog = openTripEvidenceStartDialog,
  now = () => new Date().toISOString(),
  createTripId = defaultTripId
} = {}) {
  if (typeof getContext !== 'function') throw new Error('RavRadar mangler oplysninger om området. Genindlæs siden og prøv igen.');
  const controller = createTripEvidenceController({ storage, persist, openDialog });

  const readContext = selection => {
    const context = getContext(selection);
    if (!context || typeof context !== 'object') throw new Error('Oplysningerne om området er ikke klar endnu. Vent et øjeblik og prøv igen.');
    return context;
  };

  return Object.freeze({
    start(selection = null, { tripId = createTripId(), startedAt = now() } = {}) {
      const context = readContext(selection);
      const prepared = createTripStartFromPublicState({
        tripId,
        startedAt,
        mode: selection?.mode || context.mode,
        zoneId: selection?.zoneId || context.zoneId,
        coastalPartId: selection?.coastalPartId || context.coastalPartId,
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
        calibrationFeatures: prepared.calibrationFeatures,
        forecastCalibrationEligible: prepared.forecastCalibrationEligible,
        dataQualityFlags: prepared.dataQualityFlags
      });
    },
    async startWithPrompt({ tripId = createTripId(), startedAt = now() } = {}) {
      const context = readContext();
      const selection = await openStartDialog({
        mode: context.mode,
        zoneId: context.zoneId,
        coastalPartId: context.coastalPartId,
        zones: context.zones,
        coastalParts: context.coastalParts
      });
      if (!selection) return { status: 'cancelled' };
      const record = this.start(selection, { tripId, startedAt });
      return { status: 'started', tripId: record.tripId };
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
