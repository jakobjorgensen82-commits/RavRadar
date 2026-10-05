// Local URL state only. No account, server storage, GPS or external query.
export const TRACE_CLASSES = Object.freeze(['enhanced','coastal','basin','reworked','covered']);
const keys=new Set(['v','map','base','trace','mode','opacity','focus','show','fields','deep','dataset','feature','point']);
const number=value=> /^-?\d+(?:\.\d+)?$/.test(value||'') ? Number(value) : NaN;
const validBounds=b=>b.length===4&&b.every(Number.isFinite)&&b[0]>=-180&&b[2]<=180&&b[1]>=-90&&b[3]<=90&&b[0]<=b[2]&&b[1]<=b[3];
const flag=value=>value==='1'?true:value==='0'?false:undefined;

export function featureReference(feature) {
  if(!feature?.bbox||!validBounds(feature.bbox)||!/^[\w:.?+-]{1,100}$/.test(feature.properties?.o||''))return null;
  return `${feature.properties.o}~${feature.bbox.map(value=>value.toFixed(8)).join(',')}`;
}
export function parseView(hash) {
  if(!hash||!hash.startsWith('#v='))return {state:null,error:false};
  if(hash.length>1200)return {state:null,error:true};
  const params=new URLSearchParams(hash.slice(1));
  const fail=()=>({state:null,error:true});
  if([...params.keys()].some(key=>!keys.has(key)||params.getAll(key).length!==1)||params.get('v')!=='1')return fail();
  const position=(params.get('map')||'').split(',').map(number);
  if(position.length!==3||!position.every(Number.isFinite)||Math.abs(position[0])>85||Math.abs(position[1])>180||!Number.isInteger(position[2])||position[2]<6||position[2]>17)return fail();
  const base=params.get('base'),trace=params.get('trace'),mode=params.get('mode'),opacity=number(params.get('opacity'));
  if(!['street','aerial'].includes(base)||!['all',...TRACE_CLASSES].includes(trace)||!['potential','access'].includes(mode)||opacity<15||opacity>75||!Number.isFinite(opacity))return fail();
  const state={latitude:position[0],longitude:position[1],zoom:position[2],base,trace,mode,opacity};
  for(const key of ['focus','show','fields','deep']){state[key]=flag(params.get(key));if(state[key]===undefined)return fail();}
  state.dataset=params.get('dataset');if(!/^[a-f0-9]{64}$/.test(state.dataset||''))return fail();
  state.feature=params.get('feature');state.point=params.get('point');
  if(state.feature){
    const [origin,bounds,...extra]=state.feature.split('~');
    if(extra.length||!/^[\w:.?+-]{1,100}$/.test(origin)||!validBounds((bounds||'').split(',').map(number)))return fail();
  }
  if(state.point&&!/^[\w-]{1,60}$/.test(state.point))return fail();
  if(state.feature&&state.point)return fail();
  return {state,error:false};
}
export function encodeView(state) {
  const params=new URLSearchParams({v:'1',map:`${state.latitude.toFixed(7)},${state.longitude.toFixed(7)},${state.zoom}`,
    base:state.base,trace:state.trace,mode:state.mode,opacity:String(state.opacity),dataset:state.dataset});
  for(const key of ['focus','show','fields','deep'])params.set(key,state[key]?'1':'0');
  if(state.feature)params.set('feature',state.feature);
  if(state.point)params.set('point',state.point);
  const hash=`#${params}`;
  if(parseView(hash).error)throw new Error('Invalid local map state');
  return hash;
}
export function acceptsPotential(potential,trace='all',focus=false) {
  return trace==='all'?(!focus||TRACE_CLASSES.includes(potential)):trace===potential;
}
