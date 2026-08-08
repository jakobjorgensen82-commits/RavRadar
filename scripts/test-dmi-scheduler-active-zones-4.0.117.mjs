import assert from 'node:assert/strict';
import fs from 'node:fs';
const bulk=fs.readFileSync('scripts/update-dmi-bulk.py','utf8');
assert.match(bulk,/def collection_schedule\(previous: dict\[str, Any\], active_zones_config: list\[dict\[str, Any\]\]\)/);
assert.match(bulk,/coverageDenominator": "current-active-zone-registry"/);
assert.match(bulk,/active_zones = \{zone_id: \(previous\.get\("zones"\) or \{\}\)\.get\(zone_id, \{\}\) for zone_id in active_ids\}/);
assert.match(bulk,/missing_marine_zone_ids = \[/);
assert.match(bulk,/preferred_marine_demand = \{collection: 0 for collection in MARINE_COLLECTIONS\}/);
assert.match(bulk,/marine_demand_rank = -preferred_wind_tail_demand\.get\(collection, 0\)/);
assert.match(bulk,/"preferredMarineDemand": preferred_marine_demand/);
assert.match(bulk,/"preferredWindTailDemand": preferred_wind_tail_demand/);
assert.match(bulk,/family = COLLECTION_FAMILY\[collection\]/);
assert.match(bulk,/missing96\.get\(family, 0\)/);
assert.doesNotMatch(bulk,/"atmosphere": int\(\(horizon_coverage\.get\("wind"\)/);
assert.match(bulk,/marine_foundation_missing/);
assert.match(bulk,/balanced_foundation_recovery/);
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
assert diag['preferredWindTailDemand']['dkss_lf']==3, diag
assert diag['preferredWindTailDemand']['dkss_nsbs']==1, diag
assert diag['preferredWindTailDemand']['dkss_idw']==1, diag

# Once marine coverage is broadly established, a few persistent gaps must not
# block a completely missing atmosphere model from both productive slots.
active=[{'id':f'E{i}','coastType':'east'} for i in range(208)]
future='2099-01-01T00:00:00Z'
marine_hour={'sea-mean-deviation':0.1,'current-u':0.2,'current-v':0.3}
zones={zone['id']:{'hourly':{future:marine_hour.copy()}} for zone in active[:203]}
for zone in active[:175]:
    zones.setdefault(zone['id'],{'hourly':{}})['hourly'].setdefault(future,{}).update({'significant-wave-height':0.5})
previous={'zones':zones,'collectionState':{
 'dkss_nsbs':{'lastAttemptAt':'2026-01-01T00:00:00Z'},
 'dkss_idw':{'lastAttemptAt':'2026-01-02T00:00:00Z'},
 'dkss_lf':{'lastAttemptAt':'2026-01-03T00:00:00Z'},
}}
scheduled,diag=module.collection_schedule(previous,active)
assert scheduled[:2]==['dkss_idw','harmonie_dini_sf'], scheduled
assert diag['balancedFoundationRecovery'] is True, diag
assert diag['atmosphereDeferredDuringMarineRecovery'] is False, diag
assert diag['marineFoundationRatio'] >= 0.95, diag

# A zone's established marine selection is authoritative for wind-tail demand,
# so completed collections fall out and the scheduler rotates to the next gap.
for zone in active:
    zones.setdefault(zone['id'],{'hourly':{future:{}}})['marineSelection']={'collection':'dkss_nsbs'}
for zone in active[:40]:
    zones[zone['id']]['hourly'][future].update({'wind-tail-u-10m':1.0,'wind-tail-v-10m':2.0})
scheduled,diag=module.collection_schedule({'zones':zones,'collectionState':previous['collectionState']},active)
assert diag['preferredWindTailDemand']['dkss_nsbs']==168, diag
assert scheduled[0]=='dkss_nsbs', scheduled

# Producer-local DKSS ids override misleading generic ecCodes metadata. This
# reproduces production #1828, where id 34 was exposed as SST and got dropped.
module.field_signature=lambda gid:{'paramId':34,'indicatorOfParameter':34,'shortName':'sst','name':'Sea surface temperature'}
assert module.classify_parameter(1,'dkss_lf')=='wind-tail-v-10m'
module.field_signature=lambda gid:{'paramId':33,'indicatorOfParameter':33,'shortName':'rsn','name':'Snow density'}
assert module.classify_parameter(1,'dkss_lf')=='wind-tail-u-10m'

# HARMONIE's native horizon is about 60 hours. A progressive run with at
# least 48 future hours is retained even when a newer generation is partial.
def row(valid): return {'valid':valid}
runs={
 '2026-01-01T18:00:00Z':[row('2026-01-06T18:00:00Z')],
 '2026-01-01T21:00:00Z':[row('2026-01-02T09:00:00Z')],
}
selected,run_diag=module.select_forecast_run(runs,'2026-01-01T18:00:00Z',module.epoch('2026-01-03T18:00:00Z'),48)
assert selected=='2026-01-01T18:00:00Z', run_diag
assert run_diag['incompleteLatestRunDeferred'] is True, run_diag
assert run_diag['preferredProgressiveRunRetained'] is True, run_diag
assert run_diag['runRetentionHorizonHours']==48, run_diag
`;
const result=spawnSync(process.env.PYTHON || 'python',['-c',behavioral],{encoding:'utf8'});
assert.equal(result.status,0,`Schedulerens adfærdstest fejlede:\n${result.stdout}\n${result.stderr}`);

console.log('OK: scheduler bruger aktive zoner, wind-familien og prioriterer DKSS efter reelt geografisk datagab.');
