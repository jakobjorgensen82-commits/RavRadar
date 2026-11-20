import crypto from 'node:crypto';

const stable=value=>Array.isArray(value)
  ?value.map(stable)
  :value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]))
    :value;

export const stableJsonDigest=value=>{
  const encoded=JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(encoded===undefined?'__undefined__':encoded).digest('hex');
};

export const stableHandbookDigest=stableJsonDigest;

export const handbookPayloadDigest=value=>crypto
  .createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex');

export async function fetchPreviousHandbookSource({url,expectedDigest,fetchImpl=globalThis.fetch}){
  if(!url||!expectedDigest)return null;
  if(typeof fetchImpl!=='function')throw new Error('Den tidligere versionsbundne håndbogskilde kan ikke hentes i denne runtime.');
  const response=await fetchImpl(url,{
    headers:{'user-agent':'RavRadar protected-handbook baseline'},
    signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)throw new Error(`Den tidligere versionsbundne håndbogskilde kunne ikke hentes (${response.status}).`);
  const payload=await response.json();
  if(handbookPayloadDigest(payload)!==expectedDigest){
    throw new Error('Den tidligere versionsbundne håndbogskilde matcher ikke det beskyttede manifest.');
  }
  return payload;
}

const same=(left,right)=>stableHandbookDigest(left)===stableHandbookDigest(right);

const handbookKey='handbook';
const baselineKey='handbook-source-baseline';
const handbookKeys=[handbookKey,baselineKey];
const identityFields='document_key,version,updated_at';

function handbookRowIdentity(row){
  if(!Number.isSafeInteger(row?.version)||row.version<1||typeof row.updated_at!=='string'
    ||!Number.isFinite(Date.parse(row.updated_at)))return null;
  return {version:row.version,updatedAt:row.updated_at};
}

async function readHandbookRows(request,{includePayload=false}={}){
  const query=new URLSearchParams({select:identityFields+(includePayload?',payload':''),
    document_key:`in.(${handbookKeys.join(',')})`,limit:'3'});
  const rows=await request(`?${query}`,{},'beskyttet håndbog: læs centrale rækker');
  if(!Array.isArray(rows)||rows.length>handbookKeys.length)throw new Error('Ugyldigt centralt håndbogssvar');
  const result=new Map();
  for(const row of rows){
    if(!handbookKeys.includes(row?.document_key)||result.has(row.document_key)
      ||(includePayload&&(!row.payload||typeof row.payload!=='object'||Array.isArray(row.payload)||!handbookRowIdentity(row)))){
      throw new Error('Ugyldig central håndbogsrække');
    }
    result.set(row.document_key,row);
  }
  return result;
}

function handbookRowIdentities(rows){
  const handbook=handbookRowIdentity(rows.get(handbookKey));
  const baseline=handbookRowIdentity(rows.get(baselineKey));
  return handbook&&baseline?{handbook,baseline}:null;
}

async function writeHandbookRow(request,key,payload,previous){
  const query=new URLSearchParams({select:identityFields});
  const headers={Prefer:'return=representation'};
  const body={payload,updated_by:null};
  let method='PATCH';
  if(previous){
    query.set('document_key',`eq.${key}`);
    query.set('version',`eq.${previous.version}`);
    query.set('updated_at',`eq.${previous.updated_at}`);
  }else{
    method='POST';
    query.set('on_conflict','document_key');
    headers.Prefer='resolution=ignore-duplicates,return=representation';
    body.document_key=key;
  }
  const rows=await request(`?${query}`,{method,headers,body:JSON.stringify(body)},`beskyttet håndbog: skriv ${key}`);
  if(!Array.isArray(rows)||rows.length!==1||rows[0]?.document_key!==key||!handbookRowIdentity(rows[0])){
    throw new Error('Den centrale håndbog blev ændret under synkroniseringen');
  }
  return rows[0];
}

export async function syncProtectedHandbook({request,source,previousManifest,previousSourceUrl,fetchImpl}){
  const sourceSha256=stableHandbookDigest(source);
  const previousAsset=previousManifest?.assets?.handbook;
  const previousReceipt=previousManifest?.handbookSync;
  if(previousManifest?.schemaVersion===1&&previousReceipt?.schemaVersion===1&&previousReceipt.sourceSha256===sourceSha256
    &&/^[a-f0-9]{64}$/.test(previousAsset?.sha256??'')&&Number.isSafeInteger(previousAsset.bytes)&&previousAsset.bytes>0){
    // The update trigger advances the version. The timestamp also detects a row replaced at the same version.
    const identities=handbookRowIdentities(await readHandbookRows(request));
    if(identities&&same(identities,previousReceipt.rows)){
      return {asset:previousAsset,receipt:previousReceipt,strategy:'unchanged-verified-rows'};
    }
  }

  const before=await readHandbookRows(request,{includePayload:true});
  const central=before.get(handbookKey)?.payload;
  const previousSourceHash=previousAsset?.sha256;
  let baseline=before.get(baselineKey)?.payload;
  if(!baseline&&central&&previousSourceHash){
    baseline=handbookPayloadDigest(central)===previousSourceHash?central:await fetchPreviousHandbookSource({
      url:previousSourceUrl,expectedDigest:previousSourceHash,fetchImpl,
    });
  }
  const merged=mergeProtectedHandbook({source,central,baseline});
  const expected=new Map(before);
  let written=false;
  for(const [key,payload] of [[handbookKey,merged.payload],[baselineKey,source]]){
    const row=before.get(key);
    if(row&&same(row.payload,payload))continue;
    expected.set(key,await writeHandbookRow(request,key,payload,row));
    written=true;
  }

  // A receipt may only describe both payloads from one central snapshot.
  const verified=written?await readHandbookRows(request,{includePayload:true}):before;
  const rows=handbookRowIdentities(verified);
  if(!rows||!same(rows,handbookRowIdentities(expected))||!same(verified.get(handbookKey).payload,merged.payload)
    ||!same(verified.get(baselineKey).payload,source)){
    throw new Error('Den centrale håndbog og dens kildebaseline kunne ikke verificeres efter synkronisering');
  }
  return {
    asset:{sha256:handbookPayloadDigest(merged.payload),bytes:Buffer.byteLength(JSON.stringify(merged.payload))},
    receipt:{schemaVersion:1,sourceSha256,rows},
    strategy:merged.strategy,
    preservedSectionIds:merged.preservedSectionIds,
  };
}

export function mergeProtectedHandbook({source,central,baseline}){
  if(!central)return {payload:source,strategy:'seed'};
  if(!baseline)throw new Error('Den centrale håndbog kan ikke flettes sikkert, fordi den tidligere kildebaseline mangler.');
  if(same(central,baseline))return {payload:source,strategy:'source-update'};

  const baseSections=new Map((baseline.sections??[]).map(section=>[section.id,section]));
  const centralSections=new Map((central.sections??[]).map(section=>[section.id,section]));
  const sourceIds=new Set((source.sections??[]).map(section=>section.id));
  const preserved=[];
  const sections=(source.sections??[]).map(section=>{
    const current=centralSections.get(section.id);
    const base=baseSections.get(section.id);
    if(current&&base&&!same(current,base)){
      preserved.push(section.id);
      return current;
    }
    if(current&&!base){
      preserved.push(section.id);
      return current;
    }
    return section;
  });

  for(const current of central.sections??[]){
    if(sourceIds.has(current.id))continue;
    const base=baseSections.get(current.id);
    if(!base||!same(current,base)){
      sections.push(current);
      preserved.push(current.id);
    }
  }

  const payload={...central,...source,sections};
  for(const [key,value] of Object.entries(central)){
    if(['sections','handbookVersion','updatedAt'].includes(key))continue;
    if(!(key in baseline)||!same(value,baseline[key]))payload[key]=value;
  }
  return {payload,strategy:'three-way-merge',preservedSectionIds:preserved};
}

