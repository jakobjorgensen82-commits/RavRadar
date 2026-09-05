import { normalizeZoneRegistry } from './zone-registry.js?v=4.0.324';
import {
  RAVSCORE_CALIBRATION_ELIGIBLE,
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../core/ravscore-model-contract.js?v=4.0.324';
import {
  RAVSCORE_PUBLIC_COASTAL_PART_COUNT,
  RAVSCORE_PUBLIC_DETAILS_KIND,
  RAVSCORE_PUBLIC_FORECAST_HOURS,
  RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY,
  RAVSCORE_PUBLIC_STARTUP_KIND,
  RAVSCORE_PUBLIC_ZONE_COUNT,
  assertPublicRuntimeEnvelope,
  assertPublicRuntimeManifest,
  canonicalPublicRuntimeJson,
  publicRuntimeDocumentBody,
  ravScorePublicHorizonValidUntil,
  selectPublicRuntimeAvailability,
  sameRavScoreModelBinding,
} from '../core/ravscore-public-runtime-contract.js?v=4.0.324';
import {
  assertExactPublicRavScoreProfile,
} from '../core/ravscore-public-profile-contract.js?v=4.0.324';
import {
  assertRavScoreVerifiedEvidenceTrust,
} from '../core/ravscore-evidence-trust-contract.js?v=4.0.324';

export { createForecastSnapshotReference } from './trip-evidence-contract.js?v=4.0.324';

const DEFAULT_PUBLIC_CONDITIONS_URL = './data/live/public-conditions.json';
const DEFAULT_PUBLIC_DETAILS_URL = './data/live/public-condition-details.json';
const MANIFEST_URL = './data/live/manifest.json';
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const SCORE_QUALITIES = Object.freeze(['FULL_HISTORY', 'HISTORY_INCOMPLETE', 'UNAVAILABLE']);
const HISTORY_REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const HISTORY_COVERAGE_HOURS = RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours;
const SCORE_BOUND_FIELDS = Object.freeze([
  'lower','upper','modelUncertaintyPoints','rawLower','rawUpper',
]);
const memory = new Map();

async function sha256Text(text) {
  if (!globalThis.crypto?.subtle) throw new Error('Browseren kan ikke kontrollere runtime-pakkens SHA-256-hash.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function utf8Bytes(text) {
  return new TextEncoder().encode(text).byteLength;
}

async function fetchJson(url, {
  ttlMs = 0,
  cache = 'default',
  expectedSha256 = null,
  expectedBytes = null,
} = {}) {
  const integrityRequired = expectedSha256 !== null || expectedBytes !== null;
  const expected = integrityRequired ? String(expectedSha256).toLowerCase() : null;
  if (integrityRequired) {
    if (!SHA256_PATTERN.test(expected)) throw new Error(`${url}: manifestet mangler en gyldig SHA-256-hash.`);
    if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1) {
      throw new Error(`${url}: manifestet mangler et gyldigt byteantal.`);
    }
  }
  const cached = memory.get(url);
  if (cached && Date.now() - cached.at < ttlMs) {
    if (integrityRequired && (cached.sha256 !== expected || cached.bytes !== expectedBytes)) {
      throw new Error(`${url}: den cachede fil matcher ikke det aktuelle manifest.`);
    }
    return cached.value;
  }
  const response = await fetch(url, { cache });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  let value;
  let actualSha256 = null;
  let actualBytes = null;
  if (integrityRequired) {
    if (typeof response.text !== 'function') throw new Error(`${url}: svaret kan ikke hashkontrolleres.`);
    const text = await response.text();
    actualBytes = utf8Bytes(text);
    if (actualBytes !== expectedBytes) throw new Error(`${url}: byteantallet matcher ikke manifestet.`);
    actualSha256 = await sha256Text(text);
    if (actualSha256 !== expected) throw new Error(`${url}: indholdets SHA-256-hash matcher ikke manifestet.`);
    try { value = JSON.parse(text); }
    catch { throw new Error(`${url}: ugyldig JSON.`); }
  } else if (typeof response.text === 'function') {
    const text = await response.text();
    try { value = JSON.parse(text); }
    catch { throw new Error(`${url}: ugyldig JSON.`); }
  } else {
    value = await response.json();
  }
  memory.set(url, { at: Date.now(), value, sha256: actualSha256, bytes: actualBytes });
  return value;
}

function contentAddressedUrl(base, datasetId, sha256) {
  if (!datasetId) return base;
  const params = new URLSearchParams({ dataset: String(datasetId) });
  if (SHA256_PATTERN.test(String(sha256 || ''))) params.set('sha', String(sha256).toLowerCase());
  return `${base}?${params}`;
}

function publicConditionsUrl(manifest) {
  const path = String(manifest?.conditionsPath || DEFAULT_PUBLIC_CONDITIONS_URL)
    .replace(/^\.\//, './data/live/').replace('./data/live/data/live/', './data/live/');
  const base = path.startsWith('./data/') ? path : `./data/live/${path.replace(/^\.\//, '')}`;
  return contentAddressedUrl(base, manifest?.datasetId, manifest?.publicConditionsSha256);
}

function publicDetailsUrl(manifest) {
  const path = String(manifest?.conditionDetailsPath || DEFAULT_PUBLIC_DETAILS_URL)
    .replace(/^\.\//, './data/live/').replace('./data/live/data/live/', './data/live/');
  const base = path.startsWith('./data/') ? path : `./data/live/${path.replace(/^\.\//, '')}`;
  return contentAddressedUrl(base, manifest?.datasetId, manifest?.publicConditionDetailsSha256);
}

function coastalPartsUrl(manifest) {
  const path = String(manifest?.coastalPartsPath || '')
    .replace(/^\.\//, './data/live/').replace('./data/live/data/live/', './data/live/');
  const base = path.startsWith('./data/') ? path : `./data/live/${path.replace(/^\.\//, '')}`;
  return contentAddressedUrl(base, manifest?.datasetId, manifest?.coastalPartsSha256);
}

function zoneRegistryUrl(manifest) {
  return contentAddressedUrl('./data/zones.geojson', manifest?.datasetId, manifest?.zoneRegistrySha256);
}

function contentAddressedCache(url) {
  return /[?&]dataset=[^&]+/.test(url) && /[?&]sha=[a-f0-9]{64}(?:&|$)/i.test(url) ? 'force-cache' : 'no-store';
}

function assertNestedModelBindings(value, expected, path = 'payload') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNestedModelBindings(item, expected, `${path}[${index}]`));
    return true;
  }
  if (!value || typeof value !== 'object') return true;
  for (const [key, nested] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (key === 'modelBinding' || key === 'ravScoreModelBinding') {
      assertRavScoreModelBinding(nested, nestedPath);
      if (!sameRavScoreModelBinding(nested, expected)) {
        throw new Error(`${nestedPath} tilhører en anden RavScore-model eller bundle.`);
      }
    }
    assertNestedModelBindings(nested, expected, nestedPath);
  }
  return true;
}

function assertPublicVerifiedEvidenceTrust(document, label) {
  const root = assertRavScoreVerifiedEvidenceTrust(
    document?.ravScoreEvidenceTrust,
    `${label}.ravScoreEvidenceTrust`,
  );
  assertRavScoreVerifiedEvidenceTrust(
    document?.coastalParts?.evidenceTrust,
    `${label}.coastalParts.evidenceTrust`,
  );
  const parts = document?.coastalParts?.parts;
  if (!parts || typeof parts !== 'object' || Array.isArray(parts)) {
    throw new Error(`${label} mangler sin trust-bundne kystdelssamling.`);
  }
  for (const [partId, part] of Object.entries(parts)) {
    assertRavScoreVerifiedEvidenceTrust(
      part?.ravScoreEvidenceTrust,
      `${label}.coastalParts.parts.${partId}.ravScoreEvidenceTrust`,
    );
  }
  return root;
}

function assertManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Datamanifestet mangler.');
  if (manifest.schemaVersion !== 4 || manifest.complete !== true || !manifest.datasetId) {
    throw new Error('Datamanifestet har ikke den atomiske runtimekontrakt.');
  }
  let expectedValidUntil = null;
  try { expectedValidUntil = ravScorePublicHorizonValidUntil(manifest.productionReferenceAt); }
  catch { throw new Error('Datamanifestet mangler den eksakte fælles RavScore-horisont.'); }
  if (manifest.conditionsPath !== './public-conditions.json'
    || manifest.conditionDetailsPath !== './public-condition-details.json'
    || manifest.coastalPartsPath !== './coastal-parts-v2.json'
    || manifest.zoneRegistryPath !== './data/zones.geojson'
    || !SHA256_PATTERN.test(String(manifest.publicConditionsSha256 ?? ''))
    || !SHA256_PATTERN.test(String(manifest.publicConditionDetailsSha256 ?? ''))
    || !SHA256_PATTERN.test(String(manifest.coastalPartsSha256 ?? ''))
    || !SHA256_PATTERN.test(String(manifest.zoneRegistrySha256 ?? ''))
    || !Number.isSafeInteger(manifest.publicConditionsBytes)
    || manifest.publicConditionsBytes < 1
    || !Number.isSafeInteger(manifest.publicConditionDetailsBytes)
    || manifest.publicConditionDetailsBytes < 1
    || !Number.isSafeInteger(manifest.coastalPartsBytes)
    || manifest.coastalPartsBytes < 1
    || !Number.isSafeInteger(manifest.zoneRegistryBytes)
    || manifest.zoneRegistryBytes < 1
    || !Number.isSafeInteger(manifest.zoneRegistryFeatureCount)
    || manifest.zoneRegistryFeatureCount < manifest.zoneCount
    || !Number.isSafeInteger(manifest.zoneRegistryActiveCount)
    || manifest.zoneRegistryActiveCount < manifest.zoneCount
    || manifest.zoneRegistryActiveCount > manifest.zoneRegistryFeatureCount
    || manifest.zoneCount !== RAVSCORE_PUBLIC_ZONE_COUNT
    || manifest.coastalPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || manifest.validUntil !== expectedValidUntil
    || 'fullConditionsPath' in manifest
    || 'currentPilotHistoryPath' in manifest
    || 'recoveryFallback' in manifest
    || 'emergencyFallback' in manifest) {
    throw new Error('Datamanifestet indeholder en usikker eller ufuldstændig offentlig filkontrakt.');
  }
  assertRavScoreModelBinding(manifest.ravScoreModelBinding, 'manifestets RavScore-modelbinding');
  assertRavScoreVerifiedEvidenceTrust(
    manifest.ravScoreEvidenceTrust,
    'manifestets RavScore-evidenstillid',
  );
  assertExactPublicRavScoreProfile(manifest.ravScoreProfile,
    manifest.ravScoreModelBinding, 'manifestets RavScore-scoreprofil');
  const runtime = manifest.ravScoreRuntime;
  assertPublicRuntimeManifest(runtime, {
    modelBinding: manifest.ravScoreModelBinding,
    startup: {
      fileSha256: manifest.publicConditionsSha256,
      bytes: manifest.publicConditionsBytes,
    },
    details: {
      fileSha256: manifest.publicConditionDetailsSha256,
      bytes: manifest.publicConditionDetailsBytes,
    },
    label: 'Manifestets runtimebinding',
  });
  return manifest;
}

function assertZoneRegistryDocument(document, manifest) {
  const registry = normalizeZoneRegistry(document);
  if (document?.type !== 'FeatureCollection'
    || !registry.counts.registered
    || registry.duplicates.length
    || registry.all.some(feature => typeof feature?.properties?.id !== 'string'
      || !feature.properties.id)
    || registry.counts.registered !== manifest.zoneRegistryFeatureCount
    || registry.counts.active !== manifest.zoneRegistryActiveCount) {
    throw new Error('Zoneregisteret har en ugyldig eller ufuldstændig manifestbundet kontrakt.');
  }
  return registry;
}

function assertCoastalPartsDocument(document, manifest, zones) {
  if (!document || typeof document !== 'object' || Array.isArray(document)
    || document.schemaVersion !== 2
    || document.enabled !== true
    || !document.zones
    || typeof document.zones !== 'object'
    || Array.isArray(document.zones)) {
    throw new Error('Kystdelspakken har ikke den forventede offentlige kontrakt.');
  }
  if ('datasetId' in document && document.datasetId !== manifest.datasetId) {
    throw new Error('Kystdelspakken tilhører et andet datasæt end manifestet.');
  }
  if ('modelBinding' in document) {
    assertRavScoreModelBinding(document.modelBinding, 'kystdelspakkens RavScore-modelbinding');
    if (!sameRavScoreModelBinding(document.modelBinding, manifest.ravScoreModelBinding)) {
      throw new Error('Kystdelspakken tilhører en anden RavScore-model eller bundle.');
    }
  }
  assertNestedModelBindings(document, manifest.ravScoreModelBinding, 'Kystdelspakken');

  const activeZoneIds = (zones?.features || []).map(feature => feature?.properties?.id).filter(Boolean);
  const coastalZoneIds = Object.keys(document.zones);
  const rows = coastalZoneIds.flatMap(zoneId => {
    const value = document.zones[zoneId];
    if (!Array.isArray(value) || value.length < 1) {
      throw new Error(`Kystdelspakken har ingen gyldige dele for ${zoneId}.`);
    }
    return value.map(part => ({ zoneId, part }));
  });
  const partIds = rows.map(({ zoneId, part }) => {
    if (!part || typeof part !== 'object' || Array.isArray(part)
      || typeof part.partId !== 'string' || !part.partId
      || part.sourceZoneId !== zoneId) {
      throw new Error(`Kystdelspakken har en ugyldig del i ${zoneId}.`);
    }
    return part.partId;
  });
  if (new Set(activeZoneIds).size !== activeZoneIds.length
    || new Set(coastalZoneIds).size !== coastalZoneIds.length
    || new Set(partIds).size !== partIds.length) {
    throw new Error('Kystdelspakken eller zoneregisteret indeholder dublerede identiteter.');
  }
  if (activeZoneIds.length !== manifest.zoneCount
    || coastalZoneIds.length !== manifest.zoneCount
    || document.zoneCount !== manifest.zoneCount
    || rows.length !== manifest.coastalPartCount
    || document.partCount !== manifest.coastalPartCount
    || activeZoneIds.some(zoneId => !Object.hasOwn(document.zones, zoneId))
    || coastalZoneIds.some(zoneId => !activeZoneIds.includes(zoneId))) {
    throw new Error('Kystdelspakken, manifestet og det aktive zoneregister dækker ikke samme 210/673-datasæt.');
  }
  return document;
}

async function assertLoadedPayload(document, { kind, descriptor, datasetId, productionReferenceAt, modelBinding, label }) {
  assertPublicRuntimeEnvelope(document, {
    kind,
    datasetId,
    productionReferenceAt,
    payloadBodySha256: descriptor.payloadBodySha256,
    modelBinding,
    label,
  });
  const actualBodySha256 = await sha256Text(canonicalPublicRuntimeJson(publicRuntimeDocumentBody(document)));
  if (actualBodySha256 !== document.ravScoreRuntime.payloadBodySha256) {
    throw new Error(`${label} har en ugyldig intern body-hash.`);
  }
  assertNestedModelBindings(document, modelBinding, label);
  assertPublicVerifiedEvidenceTrust(document, label);
  const profile = document.coastalParts?.scoreProfile ?? null;
  if (profile) assertExactPublicRavScoreProfile(profile, modelBinding,
    `${label} coastalParts.scoreProfile`);
  const nestedBindings = [
    ['coastalParts.modelBinding', document.coastalParts?.modelBinding],
    ['nationalForecast.modelBinding', document.nationalForecast?.modelBinding],
  ];
  for (const [path, binding] of nestedBindings) {
    if (binding && !sameRavScoreModelBinding(binding, modelBinding)) {
      throw new Error(`${label} har en afvigende RavScore-modelbinding i ${path}.`);
    }
  }
  return true;
}

function exactPublicHorizonTimes(manifest) {
  const referenceMs = Date.parse(manifest.productionReferenceAt);
  return Array.from({ length: RAVSCORE_PUBLIC_FORECAST_HOURS }, (_, index) =>
    new Date(referenceMs + index * 3_600_000).toISOString());
}

function assertPublicScoreQuality(value, label, { ranked = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !SCORE_QUALITIES.includes(value.scoreQuality)
    || typeof value.calibrationEligible !== 'boolean') {
    throw new Error(label + ' mangler en gyldig maskinlæsbar scorekvalitet.');
  }
  if (ranked && value.scoreQuality === 'UNAVAILABLE') {
    throw new Error(label + ' kan ikke rangere en utilgængelig score.');
  }
  if (!ranked) {
    if (value.available !== true && value.available !== false) {
      throw new Error(label + ' mangler en eksplicit availability-status.');
    }
    if (value.available === true && value.scoreQuality === 'UNAVAILABLE') {
      throw new Error(label + ' markerer en tilgængelig score som utilgængelig.');
    }
    if (value.available === false && value.scoreQuality !== 'UNAVAILABLE') {
      throw new Error(label + ' mangler UNAVAILABLE-kvalitet.');
    }
  }
  if (value.scoreQuality === 'FULL_HISTORY') {
    if (RAVSCORE_CALIBRATION_ELIGIBLE !== true
      && value.calibrationEligible !== false) {
      throw new Error(label + ' har en forkert kalibreringsstatus for den aktive model.');
    }
  } else if (value.calibrationEligible !== false) {
    throw new Error(label + ' må ikke være kalibreringsberettiget.');
  }
  if (!Array.isArray(value.historyReasonCodes)
    || value.historyReasonCodes.some(code => typeof code !== 'string'
      || !HISTORY_REASON_CODE_PATTERN.test(code))
    || new Set(value.historyReasonCodes).size !== value.historyReasonCodes.length) {
    throw new Error(label + ' har ugyldige historikårsagskoder.');
  }
  if (value.scoreQuality === 'UNAVAILABLE') {
    if (ranked
      || value.historyCoverageHours !== null
      || value.historyReasonCodes.length !== 0
      || value.scoreSemantics !== null
      || value.conservativeTailResetApplied !== false
      || value.scoreBounds !== null) {
      throw new Error(label + ' må ikke kopiere historik eller scoresemantik uden en score.');
    }
    return true;
  }
  if (!Number.isFinite(value.historyCoverageHours)
    || value.historyCoverageHours < 0
    || value.historyCoverageHours > HISTORY_COVERAGE_HOURS) {
    throw new Error(label + ' mangler et gyldigt antal dækkede historiktimer.');
  }
  if (value.scoreQuality === 'HISTORY_INCOMPLETE' && value.historyReasonCodes.length === 0) {
    throw new Error(label + ' forklarer ikke den ufuldstændige historik.');
  }
  if (value.scoreQuality === 'HISTORY_INCOMPLETE'
    && RAVSCORE_CALIBRATION_ELIGIBLE !== true) {
    throw new Error(label + ' må ikke bruge den integrerede historikintervaltilstand i rollbackmodellen.');
  }
  if (value.scoreQuality === 'FULL_HISTORY'
    && (value.historyCoverageHours !== HISTORY_COVERAGE_HOURS
      || value.historyReasonCodes.length !== 0)) {
    throw new Error(label + ' har ikke et eksakt komplet historikvindue.');
  }
  if (value.scoreQuality === 'FULL_HISTORY'
    && (!['EXACT_POINT_SCORE', 'CONSERVATIVE_TAIL_RESET_POINT_SCORE']
      .includes(value.scoreSemantics)
      || typeof value.conservativeTailResetApplied !== 'boolean'
      || value.conservativeTailResetApplied
        !== (value.scoreSemantics === 'CONSERVATIVE_TAIL_RESET_POINT_SCORE'))) {
    throw new Error(label + ' har ugyldig point-score-semantik.');
  }
  if (value.scoreQuality === 'HISTORY_INCOMPLETE'
    && (value.scoreSemantics !== 'CONSERVATIVE_ENCLOSING_LOWER_BOUND'
      || typeof value.conservativeTailResetApplied !== 'boolean')) {
    throw new Error(label + ' har ugyldig konservativ intervalsemantik.');
  }
  const bounds=value.scoreBounds;
  if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)
    || JSON.stringify(Object.keys(bounds).sort())!==JSON.stringify([...SCORE_BOUND_FIELDS].sort())
    || !SCORE_BOUND_FIELDS.every(field=>Number.isFinite(bounds[field]))
    || bounds.lower<0||bounds.upper>100||bounds.lower>bounds.upper
    || bounds.rawLower<0||bounds.rawUpper>100||bounds.rawLower>bounds.rawUpper
    || Math.abs(bounds.modelUncertaintyPoints-(bounds.upper-bounds.lower))>1e-9
    || value.score!==bounds.lower) {
    throw new Error(label + ' har et ugyldigt RavScore-interval.');
  }
  if(value.scoreQuality==='FULL_HISTORY'
    &&(bounds.lower!==bounds.upper||bounds.rawLower!==bounds.rawUpper)) {
    throw new Error(label + ' har et ikke-sammenfaldende FULL_HISTORY-interval.');
  }
  if (!ranked) {
    if (typeof value.winningPartUncertain !== 'boolean'
      || !Number.isSafeInteger(value.possibleWinningPartCount)
      || value.possibleWinningPartCount < 1
      || !Array.isArray(value.possibleWinningParts)
      || value.possibleWinningParts.length !== value.possibleWinningPartCount) {
      throw new Error(label + ' har en ugyldig mulig-vinder-kontrakt.');
    }
    const ids=[];
    for (const part of value.possibleWinningParts) {
      const partBounds=part?.scoreBounds;
      if (!part || typeof part !== 'object' || Array.isArray(part)
        || JSON.stringify(Object.keys(part).sort())
          !== JSON.stringify(['name','partId','score','scoreBounds'].sort())
        || typeof part.partId !== 'string' || !part.partId
        || typeof part.name !== 'string' || !part.name
        || !Number.isFinite(part.score)
        || !partBounds || typeof partBounds !== 'object' || Array.isArray(partBounds)
        || JSON.stringify(Object.keys(partBounds).sort())
          !== JSON.stringify([...SCORE_BOUND_FIELDS].sort())
        || !SCORE_BOUND_FIELDS.every(field=>Number.isFinite(partBounds[field]))
        || part.score !== partBounds.lower
        || partBounds.lower < 0 || partBounds.upper > 100
        || partBounds.lower > partBounds.upper
        || partBounds.rawLower < 0 || partBounds.rawUpper > 100
        || partBounds.rawLower > partBounds.rawUpper
        || Math.abs(partBounds.modelUncertaintyPoints
          - (partBounds.upper-partBounds.lower)) > 1e-9
        || partBounds.upper < value.score) {
        throw new Error(label + ' har en ugyldig mulig-vinder-række.');
      }
      ids.push(part.partId);
    }
    if(new Set(ids).size!==ids.length
      || JSON.stringify(ids)!==JSON.stringify([...ids].sort())
      || !value.possibleWinningParts.some(part=>part.partId===value.winningPartId
        && part.score===value.score)
      || value.winningPartUncertain !== (value.scoreQuality==='HISTORY_INCOMPLETE'
        && ids.some(partId=>partId!==value.winningPartId))) {
      throw new Error(label + ' har en inkonsistent mulig-vinder-rækkefølge.');
    }
  }
  return true;
}

function assertScoreAvailabilityQuality(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.allCurrentScoresFullHistory !== 'boolean') {
    throw new Error(label + ' mangler sin historikkvalitetssummering.');
  }
  for (const field of ['fullHistoryModeCount', 'historyIncompleteModeCount', 'historyIncompleteZoneCount']) {
    if (!Number.isSafeInteger(value[field]) || value[field] < 0) {
      throw new Error(label + ' har en ugyldig historikkvalitetstælling.');
    }
  }
  if (value.allCurrentScoresFullHistory !== (value.unavailableZoneCount === 0
      && value.historyIncompleteModeCount === 0)
    || !Array.isArray(value.historyIncompleteZones)
    || value.historyIncompleteZones.length !== value.historyIncompleteZoneCount) {
    throw new Error(label + ' har en inkonsistent historikkvalitetssummering.');
  }
  return true;
}

function assertExactPublicRows(rows, expectedTimes, label, validateRow = null) {
  if (!Array.isArray(rows) || rows.length !== expectedTimes.length) {
    throw new Error(`${label} dækker ikke den eksakte RavScore-prognosehorisont.`);
  }
  rows.forEach((row, index) => {
    if (!row || row.time !== expectedTimes[index]) {
      throw new Error(`${label} har et hul, en dublet eller en forskudt RavScore-time.`);
    }
    if (validateRow) validateRow(row);
  });
}

function assertStartupCoverage(document, manifest) {
  const weatherZoneIds = Object.keys(document?.zones ?? {});
  const scoreZoneIds = Object.keys(document?.coastalParts?.zones ?? {});
  if (weatherZoneIds.length !== RAVSCORE_PUBLIC_ZONE_COUNT
    || scoreZoneIds.length !== RAVSCORE_PUBLIC_ZONE_COUNT
    || document?.coastalParts?.expectedPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || document?.coastalParts?.scoredPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || document?.coastalParts?.scoreAvailability?.allZonesActive !== true
    || weatherZoneIds.some(zoneId => !Object.hasOwn(document.coastalParts.zones, zoneId))) {
    throw new Error('Startpakken er ikke den komplette manifestbundne 210/673-pakke.');
  }
  assertScoreAvailabilityQuality(
    document.coastalParts.scoreAvailability,
    'Startpakkens scoretilgængelighed',
  );
  for (const zoneId of scoreZoneIds) {
    const rows = document.coastalParts.zones[zoneId]?.hourly;
    if (!Array.isArray(rows) || rows.length !== 1) {
      throw new Error('Startpakkens scorezone mangler sin aktuelle scoretime.');
    }
    for (const mode of ['waders', 'beach']) {
      const score = rows[0]?.[mode];
      if (score?.available !== true
        || typeof score.score !== 'number'
        || !Number.isFinite(score.score)) {
        throw new Error('Startpakkens aktuelle score er ikke numerisk tilgængelig.');
      }
      assertPublicScoreQuality(score, 'Startpakkens aktuelle score');
    }
  }
  for (const mode of ['waders', 'beach']) {
    const days = document?.nationalForecast?.modes?.[mode];
    if (!Array.isArray(days)) {
      throw new Error('Startpakkens nationale femdøgnsvisning mangler.');
    }
    for (const day of days) {
      for (const row of day?.rows ?? []) {
        if (typeof row?.score !== 'number' || !Number.isFinite(row.score)) {
          throw new Error('Startpakkens nationale rangliste indeholder en ikke-numerisk score.');
        }
        assertPublicScoreQuality(row, 'Startpakkens nationale ranglistescore', { ranked: true });
      }
    }
  }
  assertNestedModelBindings(document, manifest.ravScoreModelBinding, 'Startpakken');
  return true;
}

function assertDetailedCoverage(document, manifest) {
  const expectedTimes = exactPublicHorizonTimes(manifest);
  const weatherZones = document?.zones;
  const coastalParts = document?.coastalParts;
  const scoreZones = coastalParts?.zones;
  const weatherZoneIds = weatherZones && typeof weatherZones === 'object'
    && !Array.isArray(weatherZones) ? Object.keys(weatherZones) : [];
  const scoreZoneIds = scoreZones && typeof scoreZones === 'object'
    && !Array.isArray(scoreZones) ? Object.keys(scoreZones) : [];
  const partIds = coastalParts?.parts && typeof coastalParts.parts === 'object'
    && !Array.isArray(coastalParts.parts) ? Object.keys(coastalParts.parts) : [];
  if (weatherZoneIds.length !== RAVSCORE_PUBLIC_ZONE_COUNT
    || scoreZoneIds.length !== RAVSCORE_PUBLIC_ZONE_COUNT
    || partIds.length !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || coastalParts?.expectedPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || coastalParts?.scoredPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || coastalParts?.scoreAvailability?.allZonesActive !== true
    || weatherZoneIds.some(zoneId => !Object.hasOwn(scoreZones, zoneId))) {
    throw new Error('Detaljepakken er ikke den komplette manifestbundne 210/673-pakke.');
  }
  assertScoreAvailabilityQuality(
    coastalParts.scoreAvailability,
    'Detaljepakkens scoretilgængelighed',
  );
  let expectedPartCount = 0;
  let scoredPartCount = 0;
  for (const zoneId of weatherZoneIds) {
    assertExactPublicRows(
      weatherZones[zoneId]?.forecast?.hourly,
      expectedTimes,
      `Detaljepakkens vejrzone ${zoneId}`,
    );
    const scoreZone = scoreZones[zoneId];
    if (!Number.isSafeInteger(scoreZone?.expectedPartCount)
      || scoreZone.expectedPartCount < 1
      || scoreZone.scoredPartCount !== scoreZone.expectedPartCount) {
      throw new Error(`Detaljepakkens scorezone ${zoneId} har ufuldstændig kystdelsdækning.`);
    }
    expectedPartCount += scoreZone.expectedPartCount;
    scoredPartCount += scoreZone.scoredPartCount;
    assertExactPublicRows(scoreZone.hourly, expectedTimes,
      `Detaljepakkens scorezone ${zoneId}`, row => {
        for (const mode of ['waders', 'beach']) {
          assertPublicScoreQuality(row[mode], 'Detaljepakkens timebaserede score');
          if (row[mode]?.available !== true
            || typeof row[mode].score !== 'number'
            || !Number.isFinite(row[mode].score)
            || !sameRavScoreModelBinding(row[mode].modelBinding, manifest.ravScoreModelBinding)) {
            throw new Error(`Detaljepakkens ${mode}-score mangler eller har forkert modelbinding.`);
          }
        }
      });
  }
  if (expectedPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || scoredPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT) {
    throw new Error('Detaljepakkens scorezoner lukker ikke den samlede 673-delskontrakt.');
  }
  return true;
}

function emergencyWeatherCurrent(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Nødpakken mangler den valgte vejrrække.');
  }
  const { time: _time, airTemperatureC: _airTemperatureC, ...current } = row;
  return current;
}

function projectEmergencyConditions(startup, details, availability, manifest) {
  assertRavScoreVerifiedEvidenceTrust(
    manifest?.ravScoreEvidenceTrust,
    'Nøddriftsmanifestets RavScore-evidenstillid',
  );
  assertPublicVerifiedEvidenceTrust(startup, 'Nøddriftens startpakke');
  assertPublicVerifiedEvidenceTrust(details, 'Nøddriftens detaljepakke');
  const selectedReferenceAt = availability?.selectedReferenceAt;
  const expectedTimes = exactPublicHorizonTimes(manifest);
  const selectedIndex = expectedTimes.indexOf(selectedReferenceAt);
  if (selectedIndex < 0) {
    throw new Error('Nøddriftens valgte tidspunkt ligger ikke på den forseglede RavScore-akse.');
  }

  const zones = {};
  const scoreZones = {};
  const projectedParts = Object.fromEntries(Object.entries(details.coastalParts.parts).map(([partId, part]) => {
    const { current: _staleCurrent, ...metadata } = part;
    return [partId, {
      ...metadata,
      current: {
        time: selectedReferenceAt,
        weather: null,
        waders: {
          available: false,
          score: null,
          scoreQuality: 'UNAVAILABLE',
          scoreBounds: null,
          calibrationEligible: false,
          scoreSemantics: null,
          conservativeTailResetApplied: false,
          historyCoverageHours: null,
          historyReasonCodes: [],
          emergencyUnavailable: true,
        },
        beach: {
          available: false,
          score: null,
          scoreQuality: 'UNAVAILABLE',
          scoreBounds: null,
          calibrationEligible: false,
          scoreSemantics: null,
          conservativeTailResetApplied: false,
          historyCoverageHours: null,
          historyReasonCodes: [],
          emergencyUnavailable: true,
        },
      },
    }];
  }));

  for (const zoneId of Object.keys(details.zones)) {
    const weatherRow = details.zones[zoneId].forecast.hourly[selectedIndex];
    const scoreZone = details.coastalParts.zones[zoneId];
    const scoreRow = scoreZone.hourly[selectedIndex];
    if (weatherRow?.time !== selectedReferenceAt || scoreRow?.time !== selectedReferenceAt) {
      throw new Error(`Nøddriftens vejr og RavScore er ikke samtidige for ${zoneId}.`);
    }
    zones[zoneId] = {
      ...startup.zones[zoneId],
      currentReferenceAt: selectedReferenceAt,
      current: emergencyWeatherCurrent(weatherRow),
      forecast: details.zones[zoneId].forecast,
    };
    scoreZones[zoneId] = {
      ...scoreZone,
      currentReferenceAt: selectedReferenceAt,
    };

    for (const mode of ['waders', 'beach']) {
      const score = scoreRow[mode];
      const winnerId = score?.winningPartId;
      if (typeof winnerId !== 'string' || !winnerId || !Object.hasOwn(projectedParts, winnerId)) {
        throw new Error(`Nøddriftens ${mode}-vinder mangler i den samme 673-dels-pakke.`);
      }
      if (!score.weather || typeof score.weather !== 'object' || Array.isArray(score.weather)) {
        throw new Error(`Nøddriftens ${mode}-vinder mangler sit eksakte lokale vejr.`);
      }
      const current = projectedParts[winnerId].current;
      const exactWeather = { ...score.weather, time: selectedReferenceAt };
      if (current.time !== selectedReferenceAt) {
        throw new Error('Nøddriften forsøgte at blande snapshots fra forskellige timer.');
      }
      if (current.weather !== null
        && canonicalPublicRuntimeJson(current.weather) !== canonicalPublicRuntimeJson(exactWeather)) {
        throw new Error('Nøddriftens to jagtformer peger ikke på samme lokale vejr for vinderdelen.');
      }
      projectedParts[winnerId] = {
        ...projectedParts[winnerId],
        current: {
          ...current,
          weather: exactWeather,
          [mode]: score,
        },
      };
    }
  }

  return {
    ...startup,
    available: true,
    // The startup top-five was ranked at build time. Emergency derives every
    // ranking from the verified detail rows and the user's current clock.
    nationalForecast: null,
    zones,
    coastalParts: {
      ...details.coastalParts,
      zones: scoreZones,
      parts: projectedParts,
    },
    detailsAvailable: true,
    publicRuntimeAvailability: availability,
  };
}

export async function loadZones({ manifest = null } = {}) {
  assertManifest(manifest);
  const canonicalBinding = ravScoreModelBinding();
  if (!sameRavScoreModelBinding(manifest.ravScoreModelBinding, canonicalBinding)) {
    throw new Error('Appen og datamanifestet bruger forskellige RavScore-modelbundles.');
  }
  const coastalUrl = coastalPartsUrl(manifest);
  const zonesUrl = zoneRegistryUrl(manifest);
  if (contentAddressedCache(coastalUrl) !== 'force-cache'
    || contentAddressedCache(zonesUrl) !== 'force-cache') {
    throw new Error('Zoneregisteret eller kystdelspakken mangler en content-addressed dataset- og hashbinding.');
  }
  const [zoneRegistryDocument, coastalParts] = await Promise.all([
    fetchJson(zonesUrl, {
      ttlMs: 2 * 60 * 1000,
      cache: contentAddressedCache(zonesUrl),
      expectedSha256: manifest.zoneRegistrySha256,
      expectedBytes: manifest.zoneRegistryBytes,
    }),
    fetchJson(coastalUrl, {
      ttlMs: 2 * 60 * 1000,
      cache: contentAddressedCache(coastalUrl),
      expectedSha256: manifest.coastalPartsSha256,
      expectedBytes: manifest.coastalPartsBytes,
    }),
  ]);
  const registry = assertZoneRegistryDocument(zoneRegistryDocument, manifest);
  const modelZoneIds = new Set(Object.keys(coastalParts?.zones ?? {}));
  const zones = {
    ...registry.collection,
    features: registry.active.filter(feature => modelZoneIds.has(feature.properties.id)),
  };
  assertCoastalPartsDocument(coastalParts, manifest, zones);
  return { ...zones, coastalParts };
}

export async function loadDataManifest() {
  try {
    const manifest = await fetchJson(MANIFEST_URL, { cache: 'no-store' });
    return assertManifest(manifest);
  } catch (error) {
    console.warn('Datamanifest kunne ikke hentes eller valideres', error);
    return null;
  }
}

export async function loadConditions({ manifest = null, now = Date.now() } = {}) {
  try {
    assertManifest(manifest);
    const canonicalBinding = ravScoreModelBinding();
    if (!sameRavScoreModelBinding(manifest.ravScoreModelBinding, canonicalBinding)) {
      throw new Error('Appen og datamanifestet bruger forskellige RavScore-modelbundles.');
    }
    const url = publicConditionsUrl(manifest);
    const data = await fetchJson(url, {
      ttlMs: 2 * 60 * 1000,
      cache: contentAddressedCache(url),
      expectedSha256: manifest.publicConditionsSha256,
      expectedBytes: manifest.publicConditionsBytes,
    });
    await assertLoadedPayload(data, {
      kind: RAVSCORE_PUBLIC_STARTUP_KIND,
      descriptor: manifest.ravScoreRuntime.startup,
      datasetId: manifest.datasetId,
      productionReferenceAt: manifest.productionReferenceAt ?? null,
      modelBinding: manifest.ravScoreModelBinding,
      label: 'Startpakken',
    });
    assertStartupCoverage(data, manifest);
    const publicRuntimeAvailability = selectPublicRuntimeAvailability(manifest, {
      now,
      modelBinding: ravScoreModelBinding(),
    });
    if (publicRuntimeAvailability.mode === RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY) {
      // Emergency is not a second model or a partial fallback. Before one old
      // score is exposed, all four files named by this same manifest are fetched
      // and verified as one 210/673/118-hour package.
      const [_zones, details] = await Promise.all([
        loadZones({ manifest }),
        loadConditionDetails({ manifest, conditions: data }),
      ]);
      return projectEmergencyConditions(data, details, publicRuntimeAvailability, manifest);
    }
    return { ...data, available: true, publicRuntimeAvailability };
  } catch (error) {
    console.warn('Aktuelle forhold kunne ikke indlæses', error);
    return { available: false, generatedAt: null, zones: {} };
  }
}

export async function loadConditionDetails({ manifest = null, conditions = null } = {}) {
  assertManifest(manifest);
  const url = publicDetailsUrl(manifest);
  if (!url) throw new Error('Detaljedata mangler en gyldig sti.');
  const data = await fetchJson(url, {
    ttlMs: 2 * 60 * 1000,
    cache: contentAddressedCache(url),
    expectedSha256: manifest.publicConditionDetailsSha256,
    expectedBytes: manifest.publicConditionDetailsBytes,
  });
  await assertLoadedPayload(data, {
    kind: RAVSCORE_PUBLIC_DETAILS_KIND,
    descriptor: manifest.ravScoreRuntime.details,
    datasetId: manifest.datasetId,
    productionReferenceAt: manifest.productionReferenceAt ?? null,
    modelBinding: manifest.ravScoreModelBinding,
    label: 'Detaljepakken',
  });
  if (conditions) assertPublicVerifiedEvidenceTrust(conditions, 'Den indlæste startpakke');
  if (!sameRavScoreModelBinding(data.ravScoreRuntime.modelBinding, conditions?.ravScoreRuntime?.modelBinding)) {
    throw new Error('Detaljedata og startdata bruger ikke samme RavScore-modelbundle.');
  }
  assertDetailedCoverage(data, manifest);
  return data;
}

export async function reevaluatePublicConditions({
  manifest = null,
  conditions = null,
  now = Date.now(),
} = {}) {
  try {
    assertManifest(manifest);
    if (!conditions || conditions.available !== true) {
      throw new Error('Den indlæste offentlige runtime er ikke tilgængelig.');
    }
    assertPublicRuntimeEnvelope(conditions, {
      kind: RAVSCORE_PUBLIC_STARTUP_KIND,
      datasetId: manifest.datasetId,
      productionReferenceAt: manifest.productionReferenceAt ?? null,
      payloadBodySha256: manifest.ravScoreRuntime.startup.payloadBodySha256,
      modelBinding: manifest.ravScoreModelBinding,
      label: 'Den indlæste startpakke',
    });
    assertPublicVerifiedEvidenceTrust(conditions, 'Den indlæste startpakke');
    if (conditions.detailsAvailable === true) assertDetailedCoverage(conditions, manifest);
    else assertStartupCoverage(conditions, manifest);
    const availability = selectPublicRuntimeAvailability(manifest, {
      now,
      modelBinding: ravScoreModelBinding(),
    });
    if (availability.mode !== RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY) {
      return { ...conditions, publicRuntimeAvailability: availability };
    }
    if (conditions.detailsAvailable === true) {
      assertDetailedCoverage(conditions, manifest);
      return projectEmergencyConditions(conditions, conditions, availability, manifest);
    }
    const [_zones, details] = await Promise.all([
      loadZones({ manifest }),
      loadConditionDetails({ manifest, conditions }),
    ]);
    return projectEmergencyConditions(conditions, details, availability, manifest);
  } catch (error) {
    console.warn('Den offentlige RavScore-runtime er udløbet eller kunne ikke genvalideres', error);
    return {
      available: false,
      generatedAt: conditions?.generatedAt ?? null,
      zones: {},
    };
  }
}

export function mergeConditionDetails(conditions, details) {
  assertPublicRuntimeEnvelope(conditions, { kind: RAVSCORE_PUBLIC_STARTUP_KIND, label: 'Startpakken' });
  assertPublicRuntimeEnvelope(details, { kind: RAVSCORE_PUBLIC_DETAILS_KIND, label: 'Detaljepakken' });
  assertPublicVerifiedEvidenceTrust(conditions, 'Startpakken');
  assertPublicVerifiedEvidenceTrust(details, 'Detaljepakken');
  if (conditions.datasetId !== details.datasetId) throw new Error('Vejrdetaljer kan ikke blandes mellem datasæt.');
  if ((conditions.productionReferenceAt ?? null) !== (details.productionReferenceAt ?? null)) {
    throw new Error('Vejrdetaljer og startdata bruger ikke samme produktionstidspunkt.');
  }
  if (conditions.generatedAt !== details.generatedAt) throw new Error('Vejrdetaljer og startdata er ikke bygget samtidigt.');
  if (!sameRavScoreModelBinding(conditions.ravScoreRuntime.modelBinding, details.ravScoreRuntime.modelBinding)) {
    throw new Error('Vejrdetaljer og startdata bruger ikke samme RavScore-modelbundle.');
  }
  const zones = Object.fromEntries(Object.entries(conditions.zones || {}).map(([zoneId, zone]) => [zoneId, {
    ...zone,
    forecast: details.zones?.[zoneId]?.forecast || zone.forecast,
  }]));
  return {
    ...conditions,
    productionReferenceAt: details.productionReferenceAt ?? conditions.productionReferenceAt ?? null,
    zones,
    coastalParts: details.coastalParts || conditions.coastalParts,
    detailsAvailable: true,
  };
}

export function clearDataMemoryCache() { memory.clear(); }
