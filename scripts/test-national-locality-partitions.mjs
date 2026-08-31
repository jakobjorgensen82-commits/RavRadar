import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';
const source=await fs.readFile('scripts/build-national-locality-partitions.py','utf8');const validator=await fs.readFile('scripts/validate-national-locality-partitions.py','utf8');const workflow=await readProductionWorkflowSource('orchestrator');
assert.ok(source.includes('EXPECTED_ZONE_COUNT=210'),'Lokalitetsopdelingen skal følge den aktuelle nationale 210-zonepolitik');
for(const x of ['official-anchor-midpoint','maximum-length-safeguard','nearby-source-fragment-group','maximumFragmentGroupingGapM','substring','proposedName":None','inventedConnectionCount":0','sourcePartCount'])assert.ok(source.includes(x),`Lokalitetsbygger mangler ${x}`);
for(const x of ['len(report.get("sourceParts") or [])','difference(source[source_id].buffer(.5))','union.length-source[source_id].length','MultiLineString'])assert.ok(validator.includes(x),`Lokalitetsvalidator mangler ${x}`);
for(const x of ['build-national-locality-partitions.py','validate-national-locality-partitions.py','national-locality-partitions.json','national-locality-partitions.geojson'])assert.ok(workflow.includes(x),`Workflow mangler ${x}`);
console.log('National lokalitetsopdelingskontrakt: bestået.');
