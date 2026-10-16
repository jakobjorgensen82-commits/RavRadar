"""Own synthetic NetCDF fixture data, not a SOURCE/owner/provenance issuer.

Reuse the existing real test NetCDF/cache/receipt constructors with a selected
normal central point and the fixture's old S reference. No product code changes.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]

def prepare(request):
    import numpy as np
    request_path=Path(request).resolve(strict=True)
    payload=json.loads(request_path.read_text('utf-8'))
    if set(payload)!={'kind','part','reference','output'} or payload['kind']!='SOURCE19_SYNTHETIC_NATIVE_UNION_DATA':
        raise ValueError('FIXTURE_INPUT_INVALID')
    target=payload['part']
    if set(target)!={'partId','parentZoneId','waterPoint'} or not isinstance(target['waterPoint'],list) or len(target['waterPoint'])!=2:
        raise ValueError('FIXTURE_TARGET_INVALID')
    reference=datetime.fromisoformat(payload['reference'].replace('Z','+00:00'))
    if reference.tzinfo is None or reference.utcoffset()!=timedelta(0) or any((reference.minute,reference.second,reference.microsecond)):
        raise ValueError('FIXTURE_REFERENCE_INVALID')
    requested_output=Path(payload['output']).absolute()
    if requested_output.parent.resolve(strict=True)!=request_path.parent or requested_output.name!='union-cp-originals' or requested_output.exists() or requested_output.is_symlink():
        raise ValueError('FIXTURE_OUTPUT_NOT_OWN_ABSENT')
    output=request_path.parent/requested_output.name
    sys.path.insert(0,str(ROOT/'scripts'))
    source=ROOT/'scripts/test-copernicus-component-production.py'
    spec=importlib.util.spec_from_file_location('source19_actual_native_test_data',source)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    # Only the existing TEST DATA factory's inputs are changed. Neither its
    # actual product RUNNER nor an owner/cohort/ACK/receipt validator is patched.
    original_dynamic,original_static=module.dynamic_fixture,module.static_fixture
    times=[(reference+timedelta(hours=index)).astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z') for index in range(3)]
    module.TARGET=target;module.TIMES=times
    def dynamic(key):
        dataset=original_dynamic(key)
        dataset.coords['longitude']=('longitude',[target['waterPoint'][0]],dict(dataset.longitude.attrs))
        dataset.coords['latitude']=('latitude',[target['waterPoint'][1]],dict(dataset.latitude.attrs))
        if 'time' not in dataset.coords or dataset.sizes['time']!=3:
            raise ValueError('EXISTING_NETCDF_FIXTURE_TIME_SHAPE_CHANGED')
        dataset.coords['time']=('time',np.array([value.removesuffix('Z') for value in times],dtype='datetime64[ns]'),dict(dataset.time.attrs))
        allowed=module.CONTRACTS[key].run_hours
        runs=[reference.replace(hour=hour) for hour in allowed if hour<=reference.hour]
        run=max(runs) if runs else (reference-timedelta(days=1)).replace(hour=max(allowed))
        dataset['forecast_reference_time'].values=np.datetime64(iso(run).removesuffix('Z'),'ns')
        dataset['forecast_period'].values=np.array([(reference+timedelta(hours=index)-run).total_seconds()/3600 for index in range(3)])
        return dataset
    def static(key='nws-wave'):
        dataset=original_static(key)
        dataset.coords['longitude']=('longitude',[target['waterPoint'][0]],dict(dataset.longitude.attrs))
        dataset.coords['latitude']=('latitude',[target['waterPoint'][1]],dict(dataset.latitude.attrs))
        return dataset
    output.mkdir()
    cache=module.ComponentSubsetCache(output/'cache')
    iso=lambda value:value.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
    needs=[{'partId':target['partId'],'component':'wave','purpose':'GAP','validTime':value} for value in times]
    raw={'parts':[target],'productionReferenceAt':times[0],'needs':needs,
        'retentionStartAt':iso(reference-timedelta(days=2)),'retentionEndAt':iso(reference+timedelta(days=5))}
    routing=module.RUNNER['pinned_plan'](raw)['routingPolicy']
    from lib.copernicus_weather_component_bank import build_component_plan
    plan=build_component_plan(targets=[target],production_reference_at=raw['productionReferenceAt'],needs=needs,
        product_routes={target['partId']:{'wave':['nws-wave']}},routing_policy=routing,
        retention_start_at=raw['retentionStartAt'],retention_end_at=raw['retentionEndAt'])
    static_path=output/'static.nc';static().to_netcdf(static_path,engine='h5netcdf')
    cache.store(module.static_request('nws-wave',target),static_path)
    receipt=None
    def acquire(request):
        nonlocal receipt
        dataset=dynamic(request['contractKey']);dataset['VTPK'].values[1]=np.nan
        destination=output/'dynamic.nc';dataset.to_netcdf(destination,engine='h5netcdf')
        destination,receipt=cache.store(request,destination)
        return destination
    produced=module.produce_component_bank(plan,module.empty_component_bank([target]),acquire_subset=acquire,
        acquisition_at=lambda:receipt['acquisitionAt'],checkpoint=lambda *args:None)
    bank=produced['bank']

    # Same existing two-generation fixture pattern: B retains one qualified
    # old hour, S a different qualified hour from a different actual NC file.
    # Both model/time/receipt proofs still come from the normal byte readers.
    def retain(value,time):
        return module._sealed({**{key:row for key,row in value.items() if key!='bankSha256'},
            'records':[entry for entry in value['records'] if entry['native']['validTime']==time]},'bankSha256')
    complete_bank=retain(bank,times[0])
    progress=output/'progress';progress.mkdir()
    progress_cache=module.ComponentSubsetCache(progress/'cache')
    progress_static=progress/'static.nc';static().to_netcdf(progress_static,engine='h5netcdf')
    progress_cache.store(module.static_request('nws-wave',target),progress_static)
    request=bank['requests'][0]
    changed=dynamic('nws-wave');changed['VHM0'].values[:]=2.0;changed['VTPK'].values[1]=np.nan
    progress_dynamic=progress/'dynamic.nc';changed.to_netcdf(progress_dynamic,engine='h5netcdf')
    progress_dynamic,progress_receipt=progress_cache.store(request,progress_dynamic)
    read=module.read_component_subset(progress_dynamic,contract_key='nws-wave',target=target,expected_times=request['expectedTimes'])
    progress_bank=module.merge_component_read(module.empty_component_bank([target]),plan=plan,request=request,read=read,
        acquisition_at=progress_receipt['acquisitionAt'])
    progress_bank=retain(progress_bank,times[2])
    module.save_component_bank(progress/'bank.json',progress_bank,targets=[target])
    old_inventory=module.RUNNER['storage_inventory'](complete_bank,cache)
    progress_inventory=module.RUNNER['storage_inventory'](progress_bank,progress_cache)
    dynamic_hash=progress_bank['records'][0]['native']['subsetSha256'].removeprefix('sha256:')
    old_names={row['relativePath'] for row in old_inventory['files']}
    new_files=[{**row,'relativePath':'.cache/copernicus-components/'+row['relativePath'],
        'sha256':row['sha256'].removeprefix('sha256:')} for row in progress_inventory['files']
        if row['relativePath'] not in old_names and (row['relativePath']=='objects/'+dynamic_hash+'.nc'
            or row['relativePath'].startswith('receipts/') and row['relativePath'].endswith('-'+dynamic_hash+'.json'))]
    if len(complete_bank['records'])!=1 or len(progress_bank['records'])!=1 or len(new_files)!=2:
        raise ValueError('GENUINE_S_ONLY_CP_ORIGINAL_NOT_CREATED')
    module.atomic_json(output/'native-union-profile.json',{'kind':'SOURCE19_REAL_SYNTHETIC_S_ONLY_CP_INPUTS',
        'baselineRecords':1,'progressRecords':1,'cpSourceOnlyFiles':new_files})
    bank=complete_bank
    module.atomic_json(output/'plan.json',plan);module.atomic_json(output/'input.json',raw)
    module.save_component_bank(output/'bank.json',bank,targets=[target])
    if bank['targets']!=[target] or not bank['records']:
        raise ValueError('ACTUAL_NATIVE_DATA_NOT_CREATED')
    print(json.dumps({'kind':payload['kind'],'nativeRecords':len(bank['records']),
        'nativeOriginalFiles':len(list((output/'cache').rglob('*.nc'))),'progressNativeRecords':len(progress_bank['records']),'newSOnlyFiles':len(new_files),
        'syntheticProviderBytes':True,'productIssuerPatched':False,'upstreamNetwork':0}))

if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('FIXTURE_ARGUMENTS_INVALID')
    prepare(sys.argv[1])
