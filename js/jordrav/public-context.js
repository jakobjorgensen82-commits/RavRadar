// Public, opt-in context. Coordinates are deliberate map clicks/viewports,
// never device GPS. Only the declared public attributes are requested/kept.
export const SOIL_CONTEXT = Object.freeze({
  url:'https://geodata.fvm.dk/geoserver/ows',
  layer:'Jordbunds_og_terraenforhold:Jordbundskort_2024', year:2024,
  source:'https://dca.au.dk/forskning/den-danske-jordklassificering/'
});
export const BORE_CONTEXT = Object.freeze({
  url:'https://jupiter.geus.dk/geusmap/ows/4326.jsp',layer:'jupiter_boringer_ws',
  source:'https://jupiter.geus.dk/geusmap/', minZoom:13, limit:200
});
export const TERRAIN_CONTEXT = Object.freeze({
  url:'https://data.geus.dk/arcgis/rest/services/Denmark/DHM_2007_hillshading/MapServer/export',
  source:'https://data.geus.dk/arcgis/rest/services/Denmark/DHM_2007_hillshading/MapServer?f=pjson',
  measured:'2005–2007', cellM:10
});
const url=(base,params)=>`${base}?${new URLSearchParams(params)}`;
const pointOK=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=54&&lat<=58&&lon>=7&&lon<=16;
export function soilPointURL(latitude,longitude) {
  if(!pointOK(latitude,longitude))throw Error('Point outside Danish context');
  // 1.1.1 specifies longitude/latitude for EPSG:4326. One centre pixel;
  // small query footprint is not a claim of source positional precision.
  const d=.00001;
  return url(SOIL_CONTEXT.url,{service:'WMS',version:'1.1.1',request:'GetFeatureInfo',
    layers:SOIL_CONTEXT.layer,query_layers:SOIL_CONTEXT.layer,styles:'',srs:'EPSG:4326',
    bbox:[longitude-d,latitude-d,longitude+d,latitude+d].join(','),width:101,height:101,x:50,y:50,
    info_format:'application/json',feature_count:8,propertyName:'JB_kode,Jordtype'});
}
export function parseSoilPoint(body) {
  if(body?.type!=='FeatureCollection'||!Array.isArray(body.features)||body.features.length>8)throw Error('Invalid soil response');
  const rows=new Map();
  for(const feature of body.features){
    const code=feature.properties?.JB_kode,name=feature.properties?.Jordtype;
    if(!Number.isInteger(code)||code<1||code>99||typeof name!=='string'||!name.trim()||name.length>160)throw Error('Invalid soil class');
    rows.set(`${code}:${name}`,{code,name});
  }
  // More than one class is kept as ambiguous, never selected by response order.
  return {rows:[...rows.values()],ambiguous:rows.size>1,truncated:body.features.length===8};
}
export function boreViewportURL(bounds) {
  const [w,s,e,n]=bounds;
  if(!pointOK(s,w)||!pointOK(n,e)||w>=e||s>=n||e-w>.3||n-s>.2)throw Error('Borehole viewport too wide');
  return url(BORE_CONTEXT.url,{SERVICE:'WFS',VERSION:'1.0.0',REQUEST:'GetFeature',
    LAYERS:BORE_CONTEXT.layer,TYPENAME:BORE_CONTEXT.layer,BBOX:bounds.join(','),
    MAXFEATURES:BORE_CONTEXT.limit+1,OUTPUTFORMAT:'geojson',PROPERTYNAME:'msGeometry,dgunr,dybde_num,dato'});
}
export function boreProfileURL(dgu) {
  if(!/^\d{1,3}\.\d{1,6}[A-Z]?$/.test(dgu))throw Error('Invalid public borehole id');
  return url('https://data.geus.dk/JupiterWWW/borerapport.jsp',{dgunr:dgu});
}
export function publicBoreDate(value) {
  if(value===null||value===undefined||value==='')return null;
  if(typeof value!=='string')throw Error('Invalid borehole date');
  // Current MapServer GeoJSON uses yyyy/mm/dd 00:00:00 despite xsd:date.
  const match=/^(\d{4})[/-](\d{2})[/-](\d{2})(?: 00:00:00)?$/.exec(value);
  if(!match)throw Error('Invalid borehole date');
  const date=`${match[1]}-${match[2]}-${match[3]}`,time=Date.parse(date);
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==date)throw Error('Invalid borehole date');
  return date;
}
export function parseBoreholes(body) {
  if(body?.type!=='FeatureCollection'||!Array.isArray(body.features)||body.features.length>BORE_CONTEXT.limit+1)throw Error('Invalid borehole response');
  const rows=[],seen=new Set();
  for(const f of body.features){
    const p=f.properties||{},c=f.geometry?.coordinates;
    if(f.geometry?.type!=='Point'||!Array.isArray(c)||c.length!==2||!pointOK(c[1],c[0]))throw Error('Invalid borehole location');
    const dgu=String(p.dgunr||'').replace(/\s/g,'');boreProfileURL(dgu);
    const depth=p.dybde_num;
    if(depth!==null&&depth!==undefined&&(!Number.isFinite(depth)||depth<0||depth>10000))throw Error('Invalid total depth');
    const date=publicBoreDate(p.dato);
    const id=`${dgu}:${c.join(',')}`;if(seen.has(id))continue;seen.add(id);
    rows.push({dgu,longitude:c[0],latitude:c[1],depth:depth??null,date:date??null});
  }
  return {rows:rows.slice(0,BORE_CONTEXT.limit),truncated:body.features.length===BORE_CONTEXT.limit+1};
}
export function terrainTileURL({x,y,z}) {
  if(!Number.isInteger(z)||z<6||z>17||!Number.isInteger(x)||!Number.isInteger(y)||y<0||y>=2**z)throw Error('Invalid terrain tile');
  const edge=20037508.342789244,size=2*edge/2**z,nx=((x%2**z)+2**z)%2**z;
  const bbox=[-edge+nx*size,edge-(y+1)*size,-edge+(nx+1)*size,edge-y*size];
  return url(TERRAIN_CONTEXT.url,{f:'image',bbox:bbox.join(','),bboxSR:3857,imageSR:3857,size:'256,256',format:'png',transparent:'true'});
}
export async function fetchPublicJSON(target,signal,fetcher=fetch) {
  const response=await fetcher(target,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('Public context unavailable');
  // SGAV declares ISO-8859-1. Fetch json() assumes UTF-8 and damages names.
  const charset=/charset=([^;\s]+)/i.exec(response.headers.get('content-type')||'')?.[1]||'utf-8';
  const reader=response.body?.getReader();
  if(!reader)throw Error('Missing public response stream');
  const chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>250000)throw Error('Public context response too large');chunks.push(value);}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder(charset,{fatal:true}).decode(bytes));
}

export function initialiseContextRaster(map,checkbox,status,tr,leaflet,type) {
  const terrain=type==='terrain',prefix=terrain?'terrain':'soil';
  const pane=map.createPane(`jordrav-${prefix}`);pane.style.zIndex=terrain?'230':'240';pane.style.pointerEvents='none';
  const Terrain=terrain?leaflet.TileLayer.extend({getTileUrl:terrainTileURL}):null;
  const layer=terrain?new Terrain('',{pane:`jordrav-${prefix}`,minZoom:9,maxZoom:17,opacity:.45,keepBuffer:0,updateWhenIdle:true,
    attribution:'DHM 2007 · 10 m © SDFI / GEUS'}):leaflet.tileLayer.wms(SOIL_CONTEXT.url,{
      layers:SOIL_CONTEXT.layer,styles:'',version:'1.1.1',format:'image/png',transparent:true,
      pane:`jordrav-${prefix}`,minZoom:12,maxZoom:17,opacity:.35,keepBuffer:0,updateWhenIdle:true,attribution:'JB 2024 © AU / SGAV'});
  let loading=false,failed=false;
  const sync=()=>{const near=map.getZoom()>=(terrain?9:12),enabled=checkbox.checked;
    if(enabled&&near)layer.addTo(map);else layer.remove();
    status.hidden=!enabled;status.textContent=tr(`${prefix}${!near?'Zoom':failed?'Failed':loading?'Loading':'Ready'}`);
    status.classList.toggle('jordrav-error',enabled&&near&&failed);};
  layer.on('loading',()=>{failed=false;loading=true;sync();});layer.on('tileerror',()=>{failed=true;sync();});layer.on('load',()=>{loading=false;sync();});
  checkbox.addEventListener('change',sync);map.on('moveend',sync);sync();return layer;
}

export function initialiseBoreContext(map,checkbox,status,tr,leaflet,onSelect) {
  const group=leaflet.layerGroup();let controller,timer,generation=0;
  async function refresh(){
    const run=++generation;controller?.abort();group.clearLayers();group.remove();
    status.hidden=!checkbox.checked;if(!checkbox.checked)return;
    status.classList.remove('jordrav-error');
    const b=map.getBounds(),bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];let target;
    try{if(map.getZoom()<BORE_CONTEXT.minZoom)throw Error();target=boreViewportURL(bounds);}catch{status.textContent=tr('boresZoom');return;}
    status.textContent=tr('boresLoading');controller=new AbortController();const active=controller;
    const timeout=setTimeout(()=>active.abort(),12000);
    try{
      const result=parseBoreholes(await fetchPublicJSON(target,active.signal));if(run!==generation)return;
      for(const row of result.rows){const title=`${tr('borePoint')} · DGU ${row.dgu}`;
        const marker=leaflet.marker([row.latitude,row.longitude],{title,alt:title,keyboard:true,
          icon:leaflet.divIcon({className:'jordrav-bore-marker',html:'<span aria-hidden="true">○</span>',iconSize:[24,24],iconAnchor:[12,12]})});
        marker.on('click',()=>onSelect(row));group.addLayer(marker);}
      group.addTo(map);status.textContent=tr(result.truncated?'boresPartial':result.rows.length?'boresReady':'boresEmpty');
    }catch{if(run!==generation)return;status.textContent=tr('boresFailed');status.classList.add('jordrav-error');}
    finally{clearTimeout(timeout);}
  }
  const schedule=()=>{++generation;controller?.abort();group.clearLayers();clearTimeout(timer);timer=setTimeout(refresh,250);};
  checkbox.addEventListener('change',()=>{clearTimeout(timer);void refresh();});map.on('moveend',schedule);void refresh();return group;
}
