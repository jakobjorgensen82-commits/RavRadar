import assert from 'node:assert/strict';
import test from 'node:test';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { NATIVE_IDENTITY_PREDECESSOR } from './lib/native-sampling-identity-successor-source.mjs';
import { CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY as ffc,
  CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY as delivered,
  CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY as selected }
  from './lib/bounded-conditions-predecessor-transition.mjs';
import { currentGridEdgePublicationRequired, assertCurrentGridEdgeGeneration,
  assertCurrentGridEdgeArtifact } from './lib/production-workflow-sources.mjs';

test('actual native-identity normal route defers all known originals, never a current or unknown binding', async () => {
  const current = { model: 'integrated', status: 'INTEGRATED_ACTIVE', pending: false,
    datasetId: 'synthetic-old', productionReferenceAt: '2026-10-13T18:00:00.000Z' };
  const binding = ravScoreModelBinding();
  assert.equal(await currentGridEdgePublicationRequired({ ...current, modelBinding: binding }, 'integrated'), false);
  for (const original of [ffc.sourceModelBinding, delivered.sourceModelBinding, selected.sourceModelBinding,
    { ...binding, modelBundleSha256: NATIVE_IDENTITY_PREDECESSOR.integrated }]) {
    const before = { ...current, modelBinding: original };
    assert.equal(await currentGridEdgePublicationRequired(before, 'integrated-historical-maintenance'), true);
    for (const patch of [{ pending: true }, { model: 'candidate' }, { status: 'PENDING' }])
      await assert.rejects(currentGridEdgePublicationRequired({ ...before, ...patch }, 'integrated-historical-maintenance'), /normal active historical route/);
    await assert.rejects(currentGridEdgePublicationRequired(before, 'integrated'), /normal active historical route/);
    const target = '2026-10-15T16:00:00.000Z';
    const manifest = { ravScoreModelBinding: binding, datasetId: 'synthetic-new', productionReferenceAt: target };
    await assertCurrentGridEdgeGeneration(before, manifest, target);
    await assert.rejects(assertCurrentGridEdgeGeneration(before, { ...manifest, productionReferenceAt: before.productionReferenceAt }, before.productionReferenceAt));
    await assert.rejects(assertCurrentGridEdgeGeneration(before, { ...manifest, datasetId: before.datasetId }, target));
    await assert.rejects(assertCurrentGridEdgeGeneration(before, { ...manifest, ravScoreModelBinding: original }, target));
    // This supplemental route never replaces the actual uploaded artifact seal.
    await assert.rejects(assertCurrentGridEdgeArtifact(before, manifest, target, null, null, { modelBinding: binding }));
  }
  await assert.rejects(currentGridEdgePublicationRequired({ ...current,
    modelBinding: { ...binding, modelBundleSha256: 'a'.repeat(64) } }, 'integrated-historical-maintenance'), /unknown public original binding/);
});
