// Display-only coastline mask. It never selects, moves or modifies model data.
export const CURRENT_ARROW_LAND_MASK_SHA256 = '27ad5fe81a31ca56f51586404f2400a52109cc34b130d95af68157bfa73e22dc';
const COVERAGE = [7.7,54.4,15.6,57.9];
const MAX_BYTES = 32 * 1024 * 1024;
let loading = null;

function finitePoint(point) {
  return Array.isArray(point) && point.length === 2
    && typeof point[0] === 'number' && Number.isFinite(point[0]) && Math.abs(point[0]) <= 180
    && typeof point[1] === 'number' && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90;
}
function includes(bbox, point) {
  return point[0]>=bbox[0]&&point[0]<=bbox[2]&&point[1]>=bbox[1]&&point[1]<=bbox[3];
}
function ringLocation(ring, point, epsilon) {
  let inside=false;
  const [x,y]=point;
  for(let i=2;i<ring.length;i+=2) {
    const ax=ring[i-2],ay=ring[i-1],bx=ring[i],by=ring[i+1];
    const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
    // The exact coastline and numerical/packing boundary remain unknown,
    // not claimed as sea. No offset or coastal buffer is applied to model points.
    if(length>0&&Math.abs(dx*(y-ay)-dy*(x-ax))<=epsilon*length
        &&x>=Math.min(ax,bx)-epsilon&&x<=Math.max(ax,bx)+epsilon
        &&y>=Math.min(ay,by)-epsilon&&y<=Math.max(ay,by)+epsilon) return 'boundary';
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
  }
  return inside?'inside':'outside';
}

function unpackRing(text) {
  if(typeof text!=='string'||text.length>16*1024*1024||text.length%4||/[^A-Za-z0-9+/=]/.test(text)) throw new Error('Invalid packed coastline');
  const bytes=atob(text),values=[];
  if(btoa(bytes)!==text) throw new Error('Noncanonical packed coastline');
  let value=0,factor=1,width=0;
  for(let i=0;i<bytes.length;i++) {
    const byte=bytes.charCodeAt(i);width++;
    if(width>5) throw new Error('Coastline varint overflow');
    value+=(byte&127)*factor;
    if(byte&128) factor*=128;
    else {
      if(width>1&&(byte&127)===0) throw new Error('Noncanonical coastline varint');
      values.push(value%2?-(value+1)/2:value/2);
      value=0;factor=1;width=0;
    }
  }
  if(width||values.length%2) throw new Error('Incomplete packed coastline');
  return values;
}

export function createCurrentArrowLandMask(document) {
  if(document?.schemaVersion!==1||JSON.stringify(document.coverage)!==JSON.stringify(COVERAGE)
      ||!Array.isArray(document.polygons)||!document.polygons.length
      ||document.polygons.length>50000
      ||(document.encoding!==undefined&&!['delta-e7','zigzag-varint-e7'].includes(document.encoding))) throw new Error('Invalid current-arrow land mask');
  const encoded=document.encoding!==undefined;
  // Integer packing affects only the display coastline by <=0.5e-7 degrees
  // per axis. Its full rounding uncertainty is kept unknown, never called sea.
  const epsilon=encoded?1e-7:1e-10;
  let points=0;
  const polygons=document.polygons.map(polygon=>{
    const bbox=polygon?.bbox;
    if(!Array.isArray(bbox)||bbox.length!==4||bbox.some(x=>typeof x!=='number'||!Number.isFinite(x))
        ||bbox[0]>bbox[2]||bbox[1]>bbox[3]||!Array.isArray(polygon.rings)||!polygon.rings.length) throw new Error('Invalid land polygon');
    const rings=polygon.rings.map(ring=>{
      if(document.encoding==='zigzag-varint-e7') ring=unpackRing(ring);
      if(!Array.isArray(ring)||(encoded&&ring.length%2)) throw new Error('Invalid land ring');
      const count=encoded?ring.length/2:ring.length;
      points+=count;
      if(count<4||points>2_000_000) throw new Error('Invalid land ring');
      const coordinates=new Float64Array(count*2);
      let x=0,y=0;
      for(let i=0;i<count;i++) {
        let point;
        if(encoded) {
          if(!Number.isSafeInteger(ring[i*2])||!Number.isSafeInteger(ring[i*2+1])) throw new Error('Invalid packed land ring');
          x+=ring[i*2];y+=ring[i*2+1];point=[x/1e7,y/1e7];
        } else point=ring[i];
        if(!finitePoint(point)||point[0]<bbox[0]-epsilon||point[0]>bbox[2]+epsilon
            ||point[1]<bbox[1]-epsilon||point[1]>bbox[3]+epsilon) throw new Error('Invalid land coordinate');
        coordinates[i*2]=point[0];coordinates[i*2+1]=point[1];
      }
      if(coordinates[0]!==coordinates.at(-2)||coordinates[1]!==coordinates.at(-1)) throw new Error('Unclosed land ring');
      return coordinates;
    });
    return {bbox:[bbox[0]-epsilon,bbox[1]-epsilon,bbox[2]+epsilon,bbox[3]+epsilon],rings};
  });
  const cache=new Map();
  return Object.freeze({classifyPoint(point) {
    if(!finitePoint(point)||!includes(COVERAGE,point)) return 'unknown';
    const key=point.join(',');
    if(cache.has(key)) return cache.get(key);
    let result='water';
    for(const polygon of polygons) {
      if(!includes(polygon.bbox,point)) continue;
      let land=false;
      for(const ring of polygon.rings) {
        const location=ringLocation(ring,point,epsilon);
        if(location==='boundary') {result='unknown';break;}
        if(location==='inside') land=!land;
      }
      if(result==='unknown') break;
      if(land) {result='land';break;}
    }
    if(cache.size>=10000) cache.clear();
    cache.set(key,result);
    return result;
  }});
}

export async function readCurrentArrowLandMaskResponse(response, expectedSha256, cryptoApi=globalThis.crypto) {
  if(!response?.ok||!/^[a-f0-9]{64}$/.test(expectedSha256)||!cryptoApi?.subtle) throw new Error('Land mask unavailable');
  const declared=Number(response.headers.get('content-length'));
  if(Number.isFinite(declared)&&declared>MAX_BYTES) throw new Error('Land mask too large');
  const reader=response.body?.getReader();
  if(!reader) throw new Error('Land mask body unavailable');
  const chunks=[];
  let length=0;
  try {
    while(true) {
      const row=await reader.read();
      if(row.done) break;
      length+=row.value.byteLength;
      if(length>MAX_BYTES) throw new Error('Land mask too large');
      chunks.push(row.value);
    }
  } catch(error) {await reader.cancel().catch(()=>{});throw error;}
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(length);
  let offset=0;
  for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const digest=Array.from(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==expectedSha256) throw new Error('Land mask integrity mismatch');
  return createCurrentArrowLandMask(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
}

export function loadCurrentArrowLandMask() {
  if(!loading) loading=(async()=>{
    const response=await fetch(new URL(`../../data/map/current-arrow-land-mask.json?sha256=${CURRENT_ARROW_LAND_MASK_SHA256}`,import.meta.url),
      {cache:'force-cache',redirect:'error',signal:AbortSignal.timeout(30000)});
    return readCurrentArrowLandMaskResponse(response,CURRENT_ARROW_LAND_MASK_SHA256);
  })();
  return loading;
}
