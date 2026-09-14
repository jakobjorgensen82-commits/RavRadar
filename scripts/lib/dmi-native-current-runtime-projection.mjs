import { buildDmiForecastHourly } from './dmi-forecast-store.mjs';

/**
 * Project one already verified native DMI current source through the public
 * hourly forecast builder. This audit-only adapter deliberately lives outside
 * the model bundle: it exercises production code without changing that code
 * or duplicating its provenance transformation.
 */
export function projectExactDmiNativeCurrentSourceToForecast(
  source,
  validTime,
  productionReferenceAt,
) {
  const validMs = Date.parse(validTime ?? '');
  const referenceMs = Date.parse(productionReferenceAt ?? '');
  if (!Number.isFinite(validMs) || !Number.isFinite(referenceMs)) return null;
  const canonicalValidTime = new Date(validMs).toISOString();
  const projection = buildDmiForecastHourly({
    ocean: [{
      step: canonicalValidTime,
      'current-u': 0,
      'current-v': 0,
      provenance: { current: source },
    }],
    generatedAt: new Date(referenceMs).toISOString(),
    startAt: canonicalValidTime,
    hours: 1,
  });
  const row = projection.hourly?.[0];
  if (row?.time !== canonicalValidTime) return null;
  const projectedSource = row?.sources?.current;
  return projectedSource?.provider === 'missing' ? null : projectedSource ?? null;
}
