"""Verify cached public attributes against the original pinned DBF records."""
import argparse
import hashlib
import json
from pathlib import Path
import shapefile

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda:stream.read(1048576),b''):h.update(block)
    return h.hexdigest()

parser=argparse.ArgumentParser()
parser.add_argument('--source-dir',type=Path,required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
audit=json.loads((root/'docs/research/jordrav/public-geodata-audit-2026-10-04.json').read_text())
report={'scope':'Public GEUS source and normalized cache; read-only verification','layers':[]}
for key,name,encoding in [('soil','Jordart_25000_v7_1.shp','utf-8'),('older_soil','jordart_200000.shp','cp1252'),('geomorphology','Geomorfologi.shp','utf-8')]:
    original=list(args.source_dir.rglob(name))
    assert len(original)==1
    original=original[0]
    source=audit['layers'][key]
    assert sha(original)==source['shp_sha256']
    assert sha(original.with_suffix('.dbf'))==source['dbf_sha256']
    stem=source['shp_sha256'][:16]+'-cm-grid-v1'
    meta=args.source_dir/'.jordrav-prototype-cache'/f'{stem}.json'
    binary=meta.with_suffix('.wkb')
    cached=json.loads(meta.read_text(encoding='utf-8'))
    assert sha(binary)==cached['wkbSha256']
    records={source_id:attrs for attrs,source_id,_ in cached['attributes']}
    omitted={item['id'] for item in cached['evidence']['collapsedSourceSlivers']}
    verified=0
    with shapefile.Reader(dbf=str(original.with_suffix('.dbf')),encoding=encoding) as reader:
        for index,record in enumerate(reader.iterRecords()):
            if index in omitted:continue
            canonical=json.loads(json.dumps(record.as_dict(),default=lambda value:value.isoformat()))
            assert canonical==records[index],(key,index)
            verified+=1
    assert verified==len(records)
    report['layers'].append({'source':key,'dbfSha256':source['dbf_sha256'],'shpSha256':source['shp_sha256'],
        'cacheMetadataSha256':sha(meta),'cacheGeometrySha256':cached['wkbSha256'],
        'attributesVerifiedAgainstOriginal':verified,'auditedCollapsedRecords':len(omitted)})
report['status']='PASS'
(root/'docs/research/jordrav/prototype-source-cache-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','attributesVerified':sum(v['attributesVerifiedAgainstOriginal'] for v in report['layers'])}))
