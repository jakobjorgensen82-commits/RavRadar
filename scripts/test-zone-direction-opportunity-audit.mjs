import assert from 'node:assert/strict';
import { analyzeZoneDirections, buildDirectionOpportunityReport } from './audit-zone-direction-opportunity.mjs';

const single = analyzeZoneDirections([0]);
const duplicate = analyzeZoneDirections([0, 0, 360]);
const fourDirections = analyzeZoneDirections([0, 90, 180, 270]);

assert.equal(single.strictCaptureShare, 51 / 360);
assert.equal(single.usefulCaptureShare, 111 / 360);
assert.deepEqual(duplicate, single, 'Duplicate directions must not create an artificial advantage.');
assert.equal(fourDirections.uniqueDirectionCount, 4);
assert.equal(fourDirections.strictCaptureShare, 204 / 360);
assert.equal(fourDirections.usefulCaptureShare, 1);
assert.ok(fourDirections.meanPositiveAlignment > single.meanPositiveAlignment);

const report = buildDirectionOpportunityReport(
  {
    datasetVersion: 'test',
    zones: {
      A: [{ onshoreDirectionDeg: 0 }],
      B: [0, 90, 180, 270].map((onshoreDirectionDeg) => ({ onshoreDirectionDeg })),
    },
  },
  {
    features: [
      { properties: { id: 'A', name: 'Single' } },
      { properties: { id: 'B', name: 'Four' } },
    ],
  },
);

assert.equal(report.zoneCount, 2);
assert.equal(report.partCount, 5);
assert.equal(report.scoreImpact, false);
assert.ok(report.zones.find((zone) => zone.zoneId === 'B').opportunityIndex > 1);

console.log('Zone direction opportunity audit self-test: passed');
