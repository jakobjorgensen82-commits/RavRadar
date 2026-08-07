import assert from 'node:assert/strict';
import fs from 'node:fs';
const bulk=fs.readFileSync('scripts/update-dmi-bulk.py','utf8');
assert.match(bulk,/def collection_schedule\(previous: dict\[str, Any\], active_zones_config: list\[dict\[str, Any\]\]\)/);
assert.match(bulk,/coverageDenominator": "current-active-zone-registry"/);
assert.match(bulk,/active_zones = \{zone_id: \(previous\.get\("zones"\) or \{\}\)\.get\(zone_id, \{\}\) for zone_id in active_ids\}/);
assert.match(bulk,/missing_marine_zone_ids = \[/);
assert.match(bulk,/preferred_marine_demand = \{collection: 0 for collection in MARINE_COLLECTIONS\}/);
assert.match(bulk,/marine_demand_rank = -preferred_marine_demand\.get\(collection, 0\)/);
assert.match(bulk,/"preferredMarineDemand": preferred_marine_demand/);
assert.match(bulk,/family = COLLECTION_FAMILY\[collection\]/);
assert.match(bulk,/missing96\.get\(family, 0\)/);
assert.doesNotMatch(bulk,/"atmosphere": int\(\(horizon_coverage\.get\("wind"\)/);
assert.match(bulk,/marine_foundation_missing/);
assert.match(bulk,/elif any_data\.get\(family, 0\) == 0/);


import {spawnSync} from 'node:child_process';
const behavioral=`
import importlib.util, sys, types
sys.path.insert(0, 'scripts')
eccodes=types.ModuleType('eccodes')
for name in ('codes_get','codes_get_elements','codes_grib_find_nearest','codes_grib_new_from_file','codes_release'):
    setattr(eccodes,name,lambda *a,**k: None)
sys.modules['eccodes']=eccodes
spec=importlib.util.spec_from_file_location('bulk','scripts/update-dmi-bulk.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
active=[
 {'id':'L1','coastType':'limfjord'}, {'id':'L2','coastType':'limfjord'}, {'id':'L3','coastType':'limfjord'},
 {'id':'W1','coastType':'west'}, {'id':'E1','coastType':'east'},
]
previous={'zones':{},'collectionState':{
 'dkss_nsbs':{'lastAttemptAt':'2026-01-01T00:00:00Z'},
 'dkss_idw':{'lastAttemptAt':'2026-01-02T00:00:00Z'},
 'dkss_lf':{'lastAttemptAt':'2026-01-03T00:00:00Z'},
}}
scheduled,diag=module.collection_schedule(previous,active)
assert scheduled[0]=='dkss_lf', scheduled
assert diag['preferredMarineDemand']['dkss_lf']==3, diag
assert diag['preferredMarineDemand']['dkss_nsbs']==1, diag
assert diag['preferredMarineDemand']['dkss_idw']==1, diag
`;
const result=spawnSync('python',['-c',behavioral],{encoding:'utf8'});
assert.equal(result.status,0,`Schedulerens adfærdstest fejlede:\n${result.stdout}\n${result.stderr}`);

console.log('OK: scheduler bruger aktive zoner, wind-familien og prioriterer DKSS efter reelt geografisk datagab.');
