"""Prove release-only changes to protected main code/data before commit."""
import argparse, hashlib, json, re, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def lf(raw):return raw.decode('utf-8').replace('\r\n','\n')
def sha(text):return hashlib.sha256(text.encode('utf-8')).hexdigest()
def main():
    p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--version',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    baseline=git('rev-parse',a.base).decode().strip();old=json.loads(git('show',baseline+':package.json'))['version'];records=[]
    for name in ['data/kystdata.json','data/zones.geojson']:
        before=lf(git('show',baseline+':'+name));after=lf((ROOT/name).read_bytes());b=json.loads(before);n=json.loads(after)
        if b['version']!=old or n['version']!=a.version:raise ValueError('Unexpected geodata release')
        b['version']=a.version
        if b!=n or before.replace('"version": "'+old+'"','"version": "'+a.version+'"',1)!=after:raise ValueError('Non-version geodata change: '+name)
        records.append({'path':name,'onlyChanged':'top-level version','beforeLFsha256':sha(before),'afterLFsha256':sha(after)})
    files=git('ls-tree','-r','--name-only',baseline,'--','js/core','scripts/lib','data/live','.github/workflows').decode().splitlines()
    checked=0;cache_changes=[]
    for name in files:
        before=git('show',baseline+':'+name);after=(ROOT/name).read_bytes()
        if before==after:checked+=1;continue
        b=lf(before);n=lf(after)
        if b==n:checked+=1;continue
        if name.startswith('data/live/'):raise ValueError('Tracked public weather changed: '+name)
        if name.startswith('js/core/'):
            expected=re.sub(r'([?&]v=)'+re.escape(old)+r'\b',lambda m:m[1]+a.version,b)
        elif name.startswith('.github/workflows/'):
            expected=b.replace('RavRadar/'+old,'RavRadar/'+a.version)
            for prefix,suffix in [('owner-approved ',' successor exception'),('One-time ',' handoff-only continuation'),('Check out current ',' main for handoff-only continuation')]:
                expected=expected.replace(prefix+old+suffix,prefix+a.version+suffix)
            expected=re.sub(r'(firstCutoverException\.releaseVersion\s*==\s*")'+re.escape(old)+r'("\s*)',lambda m:m[1]+a.version+m[2],expected)
            expected=re.sub(r"(require\('\./package\.json'\)\.version\"\)\" = \")"+re.escape(old)+r'(")',lambda m:m[1]+a.version+m[2],expected)
        else:expected=b
        if expected!=n:raise ValueError('Protected semantic source change: '+name)
        checked+=1
        if b!=n:cache_changes.append(name)
    report={'date':'2026-10-06','status':'PASS','baselineMain':baseline,'releaseVersion':a.version,
      'geodata':records,'protectedMainFilesChecked':checked,'onlyReleaseCacheOrUserAgentChanges':cache_changes,
      'scope':'Existing main Git text content (LF canonicalized): core, provider/scheduler helpers, tracked public weather and workflows; new Jordrav assets checked independently',
      'modelDataset':'0.2.0-prototype SHA-bound bytes unchanged; national-evidence-chain-2026-10-06.json',
      'limitations':'Source isolation is not a replacement for CI, artifact/privacy/deploy gates or runtime observations'}
    a.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'status':'PASS','protectedMainFiles':checked,'geodataOnly':'top-level version','releaseCacheChanges':len(cache_changes)}))
if __name__=='__main__':main()
