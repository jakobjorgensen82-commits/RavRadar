// Exhaustive read-only diagnosis of the bound national dataset, no ranking.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {DATA_BASE,MANIFEST_SHA256,MODEL_VERSION} from '../js/jordrav/dataset-binding.js';
import {evidenceChain,EVIDENCE_CHAIN_VERSION} from '../js/jordrav/evidence-chain.js';
import {PROFILE_BINDING} from '../js/jordrav/profile-examples.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const codeSha=async file=>sha((await fs.readFile(new URL(file,import.meta.url),'utf8')).replace(/\r\n/g,'\n'));
const manifestRaw=await fs.readFile(new URL('manifest.json',DATA_BASE));assert.equal(sha(manifestRaw),MANIFEST_SHA256);
const manifest=JSON.parse(manifestRaw);let files=1,fragments=0;
async function readBound(d){const b=await fs.readFile(new URL(d.file,DATA_BASE));assert.equal(sha(b),d.sha256);assert.equal(b.length,d.bytes);
  const raw=d.file.endsWith('.gz')?gunzipSync(b):b;assert.equal(raw.length,d.decodedBytes);files++;return JSON.parse(raw);}
const entries=(await readBound(manifest.catalog)).entries,chains=entries.map(evidenceChain),priorities={},states={};
await readBound(manifest.rules);await readBound(manifest.overview);
const inc=(bucket,key,field)=>{bucket[key]??={catalogueEntries:0,detailFragments:0};bucket[key][field]++;};
for(const c of chains){assert.equal(c.source,'unverified');assert.equal(c.access,'unknown');inc(priorities,c.priority,'catalogueEntries');
  for(const key of ['source','transport','receiver','preservation','access'])inc(states,`${key}:${c[key]}`,'catalogueEntries');}
for(const tile of manifest.tiles){const body=await readBound(tile);assert.equal(body.modelVersion,MODEL_VERSION);
  for(const f of body.features){const c=chains[f.properties.i];assert.ok(c);fragments++;inc(priorities,c.priority,'detailFragments');
    for(const key of ['source','transport','receiver','preservation','access'])inc(states,`${key}:${c[key]}`,'detailFragments');}}
assert.equal(files,196);assert.equal(fragments,505834);assert.equal(entries.length,4652);
const raw=await fs.readFile(PROFILE_BINDING.url);assert.equal(sha(raw),PROFILE_BINDING.sha256);assert.equal(raw.length,PROFILE_BINDING.bytes);
const profiles=JSON.parse(raw).profiles,sourceRaw=await fs.readFile(new URL('../docs/research/jordrav/public-context-sources-2026-10-06.json',import.meta.url)),source=JSON.parse(sourceRaw);
assert.equal(source.status,'PASS');assert.equal(profiles.length,16);
for(const profile of profiles){const bound=source.results.find(r=>r.profile?.dgu===profile.dgu);assert.ok(bound);assert.deepEqual(bound.profile,profile);
  assert.equal(profile.sourceHtmlSha256,bound.profileBinding.sha256);
  for(const interval of profile.intervals){for(const value of [interval.top_m,interval.bottom_m])assert.ok(value===null||(Number.isFinite(value)&&value>=0));}}
const report={date:'2026-10-06',status:'PASS',modelVersion:MODEL_VERSION,evidenceChainVersion:EVIDENCE_CHAIN_VERSION,
  manifestSha256:MANIFEST_SHA256,checkedFiles:files,catalogueEntries:entries.length,detailFragments:fragments,
  scope:'All bound national material/landform entries and display fragments, not fields, amber finds, areas or calibrated probabilities',
  interpretation:'Priorities order the next investigation; geological potential colours and unknown surface huntability remain unchanged',
  excluded:'Automatic current bare/ploughed/rain-washed ground detection excluded by owner; no such input, classifier or completion dependency',
  priorities,states,publicChecks:source.results.length,profileDataSha256:PROFILE_BINDING.sha256,
  profilesWithGeology:profiles.filter(p=>p.intervals.length).length,profilesWithoutGeology:profiles.filter(p=>!p.intervals.length).length,
  intervals:profiles.reduce((n,p)=>n+p.intervals.length,0),incompleteIntervals:profiles.flatMap(p=>p.intervals).filter(i=>i.missingBounds).length,
  publicSourcesReceiptSha256:sha(sourceRaw),codeBindingLF:{
    'evidence-chain.js':await codeSha('../js/jordrav/evidence-chain.js'),'public-context.js':await codeSha('../js/jordrav/public-context.js'),
    'profile-examples.js':await codeSha('../js/jordrav/profile-examples.js'),producer:await codeSha('./audit-jordrav-evidence-chain.mjs')},
  unchanged:'No model-0.2 dataset bytes, source priority, geometry, geological classification, RavScore or weather data modified'};
await fs.writeFile(new URL('../docs/research/jordrav/national-evidence-chain-2026-10-06.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,files,fragments,priorities,profiles:profiles.length,intervals:report.intervals,missing:report.incompleteIntervals}));
