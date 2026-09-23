import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildCurrentSupplyMemory } from '../js/core/ravscore-current-supply-memory.js';

const migration = await fs.readFile(
  'supabase/migrations/20260923140000_checkpoint_native_hold_null_evidence.sql',
  'utf8',
);
assert.equal((migration.match(/create or replace function public\./g) ?? []).length, 2);
for (const functionName of [
  'ravradar_ravscore_checkpoint_integrated_state_valid',
  'ravradar_ravscore_checkpoint_integrated_state_reason',
]) assert.ok(migration.includes(`create or replace function public.${functionName}(`));
assert.equal((migration.match(/An exact regional native hold can retain later MISSING rows/g) ?? []).length, 2);
assert.equal((migration.match(/\(ordered\.value ->> 'time'\)::timestamptz > v_state_time/g) ?? []).length, 2);
assert.equal((migration.match(/and jsonb_typeof\(ordered\.value -> 'strength'\) is distinct from 'null'/g) ?? []).length, 2);
assert.doesNotMatch(migration,
  /or \(ordered\.value ->> 'time'\)::timestamptz > v_current_reference\s*\n\s*\)/,
  'The old unconditional bound would reject honest later MISSING rows');
assert.doesNotMatch(migration, /\b(?:insert|update|delete|truncate|drop)\s+(?:into\s+|from\s+)?public\./i);
assert.equal((migration.match(/extract\(epoch from \(v_state_time - v_current_reference\)\) \/ 3600 > 3/g) ?? []).length, 2,
  'The maximum three-hour hold must remain in both SQL functions');
assert.equal((migration.match(/v_authorization ->> 'collection' is distinct from 'dkss_lf'/g) ?? []).length, 2,
  'A lagged reference must still require the exact regional collection');
assert.equal((migration.match(/v_authorization ->> 'distanceKm'\)::numeric not between 0 and 15/g) ?? []).length, 2,
  'The regional spatial authorization must remain bounded');

const currentReference = '2026-09-23T04:00:00.000Z';
const requestedReference = '2026-09-23T05:00:00.000Z';
const evidence = [
  { time: '2026-09-23T03:00:00.000Z', strength: 0.2 },
  { time: currentReference, strength: 0.3 },
  { time: requestedReference, strength: null },
];
const held = buildCurrentSupplyMemory(evidence, {
  referenceTime: requestedReference,
  nativeHold: true,
  nativeHoldReferenceTime: currentReference,
});
assert.equal(held.status, 'WINDOW_HAS_MISSING_EVIDENCE');
assert.equal(held.memoryReady, false);
assert.equal(held.referenceTime, currentReference);
assert.deepEqual(held.evidence, evidence);
const threeHour = buildCurrentSupplyMemory([
  evidence[0], evidence[1],
  { time: requestedReference, strength: null },
  { time: '2026-09-23T06:00:00.000Z', strength: null },
  { time: '2026-09-23T07:00:00.000Z', strength: null },
], {
  referenceTime: '2026-09-23T07:00:00.000Z',
  nativeHold: true,
  nativeHoldReferenceTime: currentReference,
});
assert.equal(threeHour.referenceTime, currentReference);
assert.equal(threeHour.status, 'WINDOW_HAS_MISSING_EVIDENCE');
assert.equal(threeHour.memoryReady, false);
assert.throws(() => buildCurrentSupplyMemory(threeHour.evidence, {
  referenceTime: '2026-09-23T08:00:00.000Z',
  nativeHold: true,
  nativeHoldReferenceTime: currentReference,
}), /contradicts signed evidence/,
'The fourth held hour must remain forbidden');
assert.throws(() => buildCurrentSupplyMemory(
  evidence.map(item => item.time === requestedReference
    ? { ...item, strength: 0.4 } : item),
  { referenceTime: requestedReference, nativeHold: true,
    nativeHoldReferenceTime: currentReference },
), /contradicts signed evidence/,
'A native hold must never turn a later unknown hour into signed transport');
console.log('Native-hold null-evidence successor preserves honest missing and rejects invented transport.');
