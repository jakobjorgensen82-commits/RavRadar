import assert from 'node:assert/strict';
import { buildRuntimeDiagnosticsEnvelope } from './lib/runtime-diagnostics-envelope.mjs';
import { decodeRuntimeDiagnosticsEnvelope, hasProtectedRuntimeArchive } from '../js/services/runtime-diagnostics-archive.js';

const fixture = {
  schemaVersion: 7,
  generatedAt: '2026-08-19T10:00:00.000Z',
  version: '4.0.234',
  componentCoverage: { current: { completeZones: 210, providers: { dmi: 622, copernicus: 43, regional: 8 } } },
  acquisition: { attempts: Array.from({ length: 500 }, (_, index) => ({ index, status: 'ok', note: 'æøå' })) },
  zoneSamples: Array.from({ length: 673 }, (_, index) => ({ partId: `part-${index}`, values: Array(24).fill(index / 10) }))
};

const packed = buildRuntimeDiagnosticsEnvelope(fixture);
assert.deepEqual(
  buildRuntimeDiagnosticsEnvelope(fixture).payload,
  packed.payload,
  "Den beskyttede arkivpayload skal være deterministisk for samme input"
);
assert.equal(hasProtectedRuntimeArchive(packed.payload), true);
assert.deepEqual(packed.payload.componentCoverage, fixture.componentCoverage);
assert.ok(!('zoneSamples' in packed.payload), 'Store zonedata må ikke duplikeres uden for arkivet');
assert.ok(packed.storedBytes < packed.originalBytes * 0.35, 'Det tabsfrie Supabase-format skal være markant mindre end originalen');
assert.deepEqual(await decodeRuntimeDiagnosticsEnvelope(packed.payload), fixture);

const legacy = { generatedAt: fixture.generatedAt, zoneSamples: [{ partId: 'legacy' }] };
assert.equal(await decodeRuntimeDiagnosticsEnvelope(legacy), legacy, 'Ældre ukomprimerede dokumenter skal fortsat kunne downloades');

const corrupted = structuredClone(packed.payload);
corrupted.protectedRuntimeArchive.data = `${corrupted.protectedRuntimeArchive.data.slice(0, -4)}AAAA`;
await assert.rejects(() => decodeRuntimeDiagnosticsEnvelope(corrupted), /størrelse|fingeraftryk|arkiv/i);

console.log(`Runtime-diagnostik pakkes tabsfrit fra ${packed.originalBytes} til ${packed.storedBytes} byte og kan verificeres ved download.`);
