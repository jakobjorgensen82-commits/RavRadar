const DEFAULT_STALE_AFTER_MS = 48 * 60 * 60 * 1000;

function timestamp(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function classifyLocalWeatherSnapshot({
  conditions,
  manifest,
  activeZoneIds,
  nowMs = Date.now(),
  staleAfterMs = DEFAULT_STALE_AFTER_MS
}) {
  const activeIds = new Set(activeZoneIds || []);
  const conditionIds = new Set(Object.keys(conditions?.zones || {}));
  const missingZoneIds = [...activeIds].filter(id => !conditionIds.has(id)).sort();
  const unknownZoneIds = [...conditionIds].filter(id => !activeIds.has(id)).sort();
  const generatedAtMs = timestamp(conditions?.generatedAt);
  const validUntilMs = timestamp(manifest?.validUntil);
  const datasetPairMatches = Boolean(
    conditions?.datasetId &&
    manifest?.datasetId &&
    conditions.datasetId === manifest.datasetId
  );
  const staleReasons = [];

  if (validUntilMs !== null && validUntilMs < nowMs) staleReasons.push('manifestets gyldighed er udløbet');
  if (generatedAtMs === null) staleReasons.push('conditions mangler et gyldigt generatedAt');
  else if (generatedAtMs < nowMs - staleAfterMs) staleReasons.push('conditions er ældre end 48 timer');

  return {
    status: !datasetPairMatches
      ? 'dataset-mismatch'
      : (missingZoneIds.length || unknownZoneIds.length)
        ? (staleReasons.length ? 'stale-coverage-mismatch' : 'current-coverage-mismatch')
        : (staleReasons.length ? 'stale-complete' : 'current-complete'),
    datasetPairMatches,
    missingZoneIds,
    unknownZoneIds,
    staleReasons,
    generatedAt: conditions?.generatedAt || null,
    validUntil: manifest?.validUntil || null,
    activeZoneCount: activeIds.size,
    conditionZoneCount: conditionIds.size
  };
}

export function formatCoverageFailure(snapshot) {
  const examples = [...snapshot.missingZoneIds, ...snapshot.unknownZoneIds].slice(0, 5).join(', ');
  const coverage = `${snapshot.conditionZoneCount}/${snapshot.activeZoneCount} zoner`;
  if (snapshot.status === 'dataset-mismatch') {
    return 'Lokalt manifest og conditions tilhører ikke samme dataset. Kør npm run hydrate:deployed-weather og derefter npm run validate.';
  }
  if (snapshot.status === 'stale-coverage-mismatch') {
    return [
      `FORÆLDET LOKALT VEJRSNAPSHOT: snapshotet dækker ${coverage} og afviger fra det aktive register`,
      examples ? `(bl.a. ${examples})` : '',
      `Snapshot: ${snapshot.generatedAt || 'ukendt tidspunkt'}; gyldig til: ${snapshot.validUntil || 'ukendt'}.`,
      'Dette er ikke i sig selv dokumentation for defekte zoner. Dækningskravet er fortsat strengt.',
      'Kør npm run audit:deployed-zone-weather for en skrivebeskyttet produktionskontrol.',
      'En fuld frisk validering skal først anvende central adminhydrering/tombstones og derefter nyt vejr, som produktionsworkflowet gør.'
    ].filter(Boolean).join(' ');
  }
  return `Det aktuelle conditions-datasæt afviger fra zoneregisteret: ${coverage}; ` +
    `${snapshot.missingZoneIds.length} mangler og ${snapshot.unknownZoneIds.length} er ukendte` +
    (examples ? ` (bl.a. ${examples})` : '') + '.';
}
