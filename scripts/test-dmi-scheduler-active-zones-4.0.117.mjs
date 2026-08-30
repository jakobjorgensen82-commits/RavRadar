import assert from 'node:assert/strict';
import fs from 'node:fs';
const bulk=fs.readFileSync('scripts/update-dmi-bulk.py','utf8');
assert.match(bulk,/def collection_schedule\(previous: dict\[str, Any\], active_zones_config: list\[dict\[str, Any\]\]\)/);
assert.match(bulk,/coverageDenominator": "current-active-zone-and-coastal-part-registry"/);
assert.match(
  bulk,
  /active_zones_config = \[\s*zone for zone in zones\s*if not zone\.get\("waterSource"\) and not zone\.get\("researchCurrent"\) and not zone\.get\("privateStage"\)\s*\]/,
  'Lokale aktive kystdele skal indgå i schedulerens reelle DMI-dækningsnævner, mens vandkilder, forskningspunkter og private punktkandidater holdes udenfor.',
);
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
from datetime import datetime, timezone, timedelta
sys.path.insert(0, 'scripts')
class DummySession:
    def __init__(self): self.headers={}
    def mount(self,*args,**kwargs): pass
class DummyDependency:
    def __init__(self,*args,**kwargs): pass
requests=types.ModuleType('requests')
requests.Session=DummySession
requests_adapters=types.ModuleType('requests.adapters')
requests_adapters.HTTPAdapter=DummyDependency
urllib3=types.ModuleType('urllib3')
urllib3_util=types.ModuleType('urllib3.util')
urllib3_retry=types.ModuleType('urllib3.util.retry')
urllib3_retry.Retry=DummyDependency
sys.modules['requests']=requests
sys.modules['requests.adapters']=requests_adapters
sys.modules['urllib3']=urllib3
sys.modules['urllib3.util']=urllib3_util
sys.modules['urllib3.util.retry']=urllib3_retry
eccodes=types.ModuleType('eccodes')
for name in ('codes_get','codes_get_array','codes_get_elements','codes_grib_find_nearest','codes_grib_new_from_file','codes_release'):
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
marine_hour={'sea-mean-deviation':0.1,'current-u':0.2,'current-v':0.3}
start=datetime.now(timezone.utc).replace(minute=0,second=0,microsecond=0)
future=[(start+timedelta(hours=hour)).isoformat().replace('+00:00','Z') for hour in range(0,100,3)]
zones={zone['id']:{'hourly':{valid:marine_hour.copy() for valid in future}} for zone in active[:203]}
for zone in active[:175]:
    for valid in future:
        zones.setdefault(zone['id'],{'hourly':{}})['hourly'].setdefault(valid,{}).update({'significant-wave-height':0.5})
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
    zones.setdefault(zone['id'],{'hourly':{valid:{} for valid in future}})['marineSelection']={'collection':'dkss_nsbs'}
for zone in active[:40]:
    for valid in future:
        zones[zone['id']]['hourly'][valid].update({'wind-tail-u-10m':1.0,'wind-tail-v-10m':2.0})
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

# Schedule facts are inferred from the exact STAC response. Missing created
# stays unknown; no publication timestamp is fabricated.
catalog={
 '2026-01-01T00:00:00Z':[{'itemCreatedAt':'2026-01-01T01:00:00Z'}],
 '2026-01-01T03:00:00Z':[{'itemCreatedAt':'2026-01-01T04:00:00Z'}],
 '2026-01-01T06:00:00Z':[{'itemCreatedAt':'2026-01-01T07:00:00Z'}],
}
assert module.observed_run_cadence_hours(catalog)==3.0
assert module.observed_publication_lag_hours(catalog)==1.0
assert module.observed_publication_lag_hours({'2026-01-01T00:00:00Z':[{}]}) is None
assert module.item_run({'id':'20260101T00-guess','properties':{
 'created':'2026-01-01T01:00:00Z','datetime':'2026-01-01T03:00:00Z',
}}) is None, 'publication/valid timestamps and ids must not be guessed into model-run identity'

def stac_item(run,created,valid,suffix):
 return {
  'id':f'item-{suffix}',
  'properties':{'forecast:reference_datetime':run,'datetime':valid,'created':created},
  'assets':{'data':{'href':f'https://example.test/{suffix}.grib','type':'application/x-grib'}},
 }
stac_items=[
 stac_item('2026-01-01T00:00:00Z','2026-01-01T01:00:00Z','2026-01-06T00:00:00Z','a'),
 stac_item('2026-01-01T03:00:00Z','2026-01-01T04:00:00Z','2026-01-06T03:00:00Z','b'),
 stac_item('2026-01-01T06:00:00Z','2026-01-01T07:00:00Z','2026-01-06T06:00:00Z','c'),
]
module.request_json=lambda *args,**kwargs:{'features':stac_items}
real_time=module.time.time
module.time.time=lambda:module.epoch('2026-01-01T20:00:00Z')
stale_run,stale_assets,stale_diag=module.list_latest_assets('wam_dw')
assert stale_run is None and stale_assets==[] and stale_diag['rejectedStaleRun'] is True, stale_diag
module.time.time=lambda:module.epoch('2026-01-01T09:00:00Z')
fresh_run,fresh_assets,fresh_diag=module.list_latest_assets('wam_dw')
assert fresh_run=='2026-01-01T06:00:00Z' and len(fresh_assets)==1, fresh_diag
assert fresh_assets[0]['id']=='item-c' and fresh_assets[0]['itemCreatedAt']=='2026-01-01T07:00:00Z'
module.time.time=real_time

# Exact part identity and one shared grid definition/cell are mandatory. The
# wave direction is deliberately absent from the required score tuple.
cell='a'*64
other='b'*64
def candidate(definition,lat,lon,distance,value):
 return {'gridDefinitionSha256':definition,'latitude':lat,'longitude':lon,'distanceKm':distance,'value':value}
height=candidate(cell,1,2,0.0,1.2)
period=candidate(cell,1,2,0.0,6.0)
direction=candidate(other,1,2,0.0,270.0)
selected=module.select_common_grid_tuple({
 'significant-wave-height':[height],
 'dominant-wave-period':[period],
 'mean-wave-dir':[direction],
},('significant-wave-height','dominant-wave-period'))
assert selected is not None
assert module.candidate_cell_key(selected['significant-wave-height'])==module.candidate_cell_key(selected['dominant-wave-period'])
assert module.candidate_cell_key(direction)!=module.candidate_cell_key(height)
assert module.select_common_grid_tuple({
 'significant-wave-height':[height],
 'dominant-wave-period':[candidate(other,1,2,0.0,6.0)],
},('significant-wave-height','dominant-wave-period')) is None

zone={'id':'PART::TEST','parentZoneId':'ZONE-TEST','coastalPart':True,'coastType':'limfjord','lon':2.0,'lat':1.0}
capture={'itemId':'item-1','assetIdentitySha256':'c'*64,'acquiredAt':'2026-01-01T02:00:00Z'}
source=module.native_component_source(
 'wam_dw','2026-01-01T00:00:00Z','2026-01-01T03:00:00Z',
 component='wave',zone=zone,grid_candidate=height,capture=capture,
 spatial_selection='nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation',
)
assert source['entityId']=='PART::TEST'
assert source['parentZoneId']=='ZONE-TEST'
assert source['componentKind']=='wave-mobilisation-tuple'
assert source['fieldSet']==['significant-wave-height','dominant-wave-period']
assert source['leadTimeHours']==3.0
assert source['fallback'] is False
assert module.native_component_source(
 'dkss_idw','2026-01-01T00:00:00Z','2026-01-01T03:00:00Z',
 component='wave',zone=zone,grid_candidate=height,capture=capture,
 spatial_selection='x',
) is None
assert module.native_component_source(
 'wam_dw','2026-01-01T00:00:00Z','2026-01-01T03:00:00Z',
 component='wave',zone=zone,grid_candidate=height,capture=None,
 spatial_selection='x',
) is None
assert module.native_component_source(
 'wam_dw','2026-01-01T00:00:00Z','2026-01-01T03:00:00Z',
 component='wave',zone=zone,grid_candidate=height,capture=capture,
 spatial_selection='wrong-spatial-contract',
) is None
invalid_created=dict(capture,itemCreatedAt='not-a-time')
assert module.native_component_source(
 'wam_dw','2026-01-01T00:00:00Z','2026-01-01T03:00:00Z',
 component='wave',zone=zone,grid_candidate=height,capture=invalid_created,
 spatial_selection='nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation',
) is None

# The private bulk cache retains the already captured replay bridge beyond 54h,
# prunes older rows, and invalidates legacy rows without exact capture identity.
now_iso='2026-01-04T00:00:00Z'
retained_iso='2026-01-01T17:00:00Z'  # 55 hours old
expired_iso='2026-01-01T11:00:00Z'   # 61 hours old
missing_capture_iso='2026-01-03T23:00:00Z'
water_candidate=candidate(cell,1,2,0.0,0.1)
def water_source(valid):
 return module.native_component_source(
  'dkss_lf',valid,valid,component='waterLevel',zone=zone,
  grid_candidate=water_candidate,capture=capture,
  spatial_selection='nearest-valid-grid-cell-no-spatial-interpolation',
 )
retained_source=water_source(retained_iso)
expired_source=water_source(expired_iso)
invalid_source=dict(water_source(missing_capture_iso))
invalid_source.pop('itemId')
document={
 'generatedAt':now_iso,
 'zones':{'PART::TEST':{
  'entityId':'PART::TEST','parentZoneId':'ZONE-TEST','entityType':'coastal-part',
  'samplingContext':'coastal-part-water-point','samplingPoint':[2.0,1.0],
  'gridPoints':{}, 'collections':{},
  'hourly':{
   retained_iso:{'time':retained_iso,'sea-mean-deviation':0.1,'sources':{'waterLevel':retained_source}},
   expired_iso:{'time':expired_iso,'sea-mean-deviation':0.1,'sources':{'waterLevel':expired_source}},
   missing_capture_iso:{'time':missing_capture_iso,'sea-mean-deviation':0.1,'sources':{'waterLevel':invalid_source}},
  },
 }},
 'diagnostics':{},
}
module.time.time=lambda:module.epoch(now_iso)
module.clean_and_summarize(document,set(),{'bytes':0})
assert retained_iso in document['zones']['PART::TEST']['hourly']
assert expired_iso not in document['zones']['PART::TEST']['hourly']
assert 'sea-mean-deviation' not in document['zones']['PART::TEST']['hourly'][missing_capture_iso]
assert document['diagnostics']['privateReplayRetentionHours']>=54
module.time.time=real_time

# End-to-end producer isolation with synthetic ecCodes handles: a Limfjord part
# samples its own WAM_DW cell, height+period are written atomically, and a
# direction from another grid definition is discarded rather than borrowed.
import pathlib, tempfile
with tempfile.TemporaryDirectory() as temporary:
 module.RAW_DIR=pathlib.Path(temporary)
 asset_path=module.RAW_DIR/'fixture.grib'
 asset_path.write_bytes(b'fixture')
 module.register_raw_cache_asset(
  asset_path,'https://example.test/local-wave.grib','wam_dw',
  '2026-01-01T00:00:00Z','2026-01-01T03:00:00Z',
  item_id='local-wave-item',item_created_at='2026-01-01T01:00:00Z',
 )
 assert module.raw_cache_source_capture(
  asset_path,'wam_dw','2026-01-01T00:00:00Z','2026-01-01T03:00:00Z',
 ) is None, 'register/last-use time must never be stamped as acquisition time'
 module.register_raw_cache_asset(
  asset_path,'https://example.test/local-wave.grib','wam_dw',
  '2026-01-01T00:00:00Z','2026-01-01T03:00:00Z',
  item_id='local-wave-item',item_created_at='2026-01-01T01:00:00Z',
  acquired_at='2026-01-01T02:00:00Z',
 )
 gids=iter([1,2,3,None])
 module.codes_grib_new_from_file=lambda handle:next(gids)
 module.codes_release=lambda gid:None
 parameters={1:'significant-wave-height',2:'dominant-wave-period',3:'mean-wave-dir'}
 module.classify_parameter=lambda gid,collection:parameters[gid]
 module.valid_candidates_batch=lambda gid,collection,wanted:{
  'PART::TEST':[candidate(cell if gid in (1,2) else other,1,2,0.0,{1:1.2,2:6.0,3:270.0}[gid])]
 }
 module.should_stop_work=lambda:False
 producer_output={
  'generatedAt':'2026-01-01T02:00:00Z',
  'zones':{'PART::TEST':{'samplingPoint':[2.0,1.0],'hourly':{},'gridPoints':{},'collections':{}}},
 }
 found,touched,interrupted,messages,lookups=module.process_grib(
  asset_path,'wam_dw','2026-01-01T00:00:00Z','2026-01-01T03:00:00Z',
  [zone],producer_output,{},
 )
 produced=producer_output['zones']['PART::TEST']['hourly']['2026-01-01T03:00:00Z']
 assert produced['significant-wave-height']==1.2 and produced['dominant-wave-period']==6.0
 assert 'mean-wave-dir' not in produced
 assert produced['sources']['wave']['entityId']=='PART::TEST'
 assert produced['sources']['wave']['parentZoneId']=='ZONE-TEST'
 assert produced['sources']['wave']['collection']=='wam_dw'
 assert produced['sources']['wave']['optionalFieldSet']==[]
 assert touched=={'PART::TEST'} and not interrupted and messages==3
`;
const result=spawnSync(process.env.PYTHON || 'python',['-c',behavioral],{encoding:'utf8'});
assert.equal(result.status,0,`Schedulerens adfærdstest fejlede:\n${result.stdout}\n${result.stderr}`);

console.log('OK: scheduler bruger aktive zoner, wind-familien og prioriterer DKSS efter reelt geografisk datagab.');
