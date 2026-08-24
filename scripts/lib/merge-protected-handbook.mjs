import crypto from 'node:crypto';

const stable=value=>Array.isArray(value)
  ?value.map(stable)
  :value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]))
    :value;

export const stableHandbookDigest=value=>{
  const encoded=JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(encoded===undefined?'__undefined__':encoded).digest('hex');
};

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

