// Maintenance-only builder. Never called by weather acquisition or the website.
// The browser uses the checked-in regional extract, not an external GIS service.
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createInflateRaw, gzipSync, gunzipSync, crc32 } from 'node:zlib';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SOURCE = 'https://osmdata.openstreetmap.de/download/land-polygons-split-4326.zip';
export const COVERAGE = [7.7, 54.4, 15.6, 57.9];
const MAX_ZIP_BYTES = 1_200_000_000;
const MAX_RECORD_BYTES = 32 * 1024 * 1024;
const MAX_MASK_BYTES = 32 * 1024 * 1024;

export function packRing(ring) {
  let previous=[0,0];const bytes=[];
  for(const point of ring) {
    const next=point.map(value=>Math.round(value*1e7));
    for(let axis=0;axis<2;axis++) {
      const delta=next[axis]-previous[axis];let value=delta<0?-delta*2-1:delta*2;
      while(value>=128) {bytes.push(value%128+128);value=Math.floor(value/128);}
      bytes.push(value);
    }
    previous=next;
  }
  return Buffer.from(bytes).toString('base64');
}

async function writeMask(original) {
  const {source}=original;
  if(original.schemaVersion!==1||!Array.isArray(original.coverage)
      ||original.coverage[0]>COVERAGE[0]||original.coverage[1]>COVERAGE[1]
      ||original.coverage[2]<COVERAGE[2]||original.coverage[3]<COVERAGE[3]
      ||source?.url!==SOURCE||!/^[a-f0-9]{64}$/.test(source.compressedShpSha256)) throw new Error('Original coverage/source mismatch');
  const polygons=original.polygons.filter(({bbox})=>bbox[2]>=COVERAGE[0]&&bbox[0]<=COVERAGE[2]&&bbox[3]>=COVERAGE[1]&&bbox[1]<=COVERAGE[3]);
  const encoded=polygons.map(({bbox,rings})=>({bbox,rings:rings.map(packRing)}));
  const mask={schemaVersion:1,encoding:'zigzag-varint-e7',coverage:COVERAGE,source,polygons:encoded};
  const output=JSON.stringify(mask)+'\n';
  console.log(JSON.stringify({polygons:polygons.length,points:polygons.reduce((sum,p)=>sum+p.rings.reduce((n,r)=>n+r.length,0),0),browserBytes:Buffer.byteLength(output),gzipBytes:gzipSync(output).length}));
  if(Buffer.byteLength(output)>MAX_MASK_BYTES) throw new Error('Regional mask exceeds browser asset budget');
  // Maintenance creates a separate candidate. Never replace the currently
  // approved public mask after an expensive source download or on --build.
  await fs.mkdir('.cache/current-arrow-land-mask',{recursive:true});
  await fs.writeFile('.cache/current-arrow-land-mask/candidate.json',output,{flag:'wx'});
  console.log(JSON.stringify({sha256:createHash('sha256').update(output).digest('hex')}));
}

export function polygonRecord(bytes) {
  if (bytes.length < 44 || bytes.readInt32LE(0) !== 5) throw new Error('Expected a Polygon shapefile record');
  const bbox = Array.from({length:4}, (_,i)=>bytes.readDoubleLE(4+i*8));
  const partCount = bytes.readInt32LE(36), pointCount = bytes.readInt32LE(40);
  if (partCount < 1 || pointCount < 4 || partCount > pointCount/4
      || bytes.length !== 44 + partCount*4 + pointCount*16
      || bbox.some(x=>!Number.isFinite(x))) throw new Error('Invalid polygon record bounds');
  const offsets = Array.from({length:partCount},(_,i)=>bytes.readInt32LE(44+i*4));
  if (offsets[0] !== 0 || offsets.some((x,i)=>x<0||x>=pointCount||(i>0&&x-offsets[i-1]<4))) throw new Error('Invalid polygon ring offsets');
  const rings = offsets.map((start,i)=>{
    const end = offsets[i+1] ?? pointCount;
    if (end-start<4) throw new Error('Incomplete polygon ring');
    const ring = [];
    for(let p=start;p<end;p++) {
      const offset = 44+partCount*4+p*16;
      const x = bytes.readDoubleLE(offset), y = bytes.readDoubleLE(offset+8);
      if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>180||Math.abs(y)>90
          ||x<bbox[0]||x>bbox[2]||y<bbox[1]||y>bbox[3]) throw new Error('Invalid polygon coordinate');
      ring.push([x,y]);
    }
    if(ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1]) throw new Error('Unclosed polygon ring');
    return ring;
  });
  return {bbox,rings};
}

export async function extractPolygons(chunks) {
  let buffer = Buffer.alloc(0), header = false, expectedRecord = 1, consumed = 0, declaredBytes = null;
  const polygons = [];
  for await(const chunk of chunks) {
    buffer = Buffer.concat([buffer,chunk]);
    if(!header && buffer.length>=100) {
      if(buffer.readInt32BE(0)!==9994||buffer.readInt32LE(28)!==1000||buffer.readInt32LE(32)!==5) throw new Error('Invalid Polygon shapefile header');
      declaredBytes = buffer.readUInt32BE(24)*2;
      buffer=buffer.subarray(100); consumed=100; header=true;
    }
    while(header && buffer.length>=8) {
      const length = buffer.readUInt32BE(4)*2;
      if(length<44||length>MAX_RECORD_BYTES||buffer.readUInt32BE(0)!==expectedRecord) throw new Error('Invalid shapefile record envelope');
      if(buffer.length<8+length) break;
      const record = buffer.subarray(8,8+length);
      // Validate every record, including those outside the regional coverage.
      const polygon = polygonRecord(record);
      const [west,south,east,north] = polygon.bbox;
      if(east>=COVERAGE[0]&&west<=COVERAGE[2]&&north>=COVERAGE[1]&&south<=COVERAGE[3]) polygons.push(polygon);
      buffer=buffer.subarray(8+length); consumed+=8+length; expectedRecord++;
    }
    if(buffer.length>MAX_RECORD_BYTES+8) throw new Error('Shapefile record buffer exceeded');
  }
  if(!header||buffer.length||consumed!==declaredBytes||!polygons.length) throw new Error('Incomplete regional coastline extract');
  return polygons;
}

async function build() {
  try {await fs.access('.cache/current-arrow-land-mask/candidate.json');throw new Error('Candidate already preserved: inspect it; do not replace it or repeat the source download');}
  catch(error) {if(error.code!=='ENOENT') throw error;}
  if(process.argv[2]==='--from-original') {
    const original=JSON.parse(gunzipSync(await fs.readFile('.cache/current-arrow-land-mask/original.json.gz'),{maxOutputLength:256*1024*1024}).toString('utf8'));
    await writeMask(original);return;
  }
  if(process.argv[2]!=='--build') throw new Error('Explicit --build required; this downloads the official coastline once');
  try {await fs.access('.cache/current-arrow-land-mask/original.json.gz');throw new Error('Original already preserved: use --from-original; do not repeat the source download');}
  catch(error) {if(error.code!=='ENOENT') throw error;}
  const head = await fetch(SOURCE,{method:'HEAD',redirect:'error'});
  const bytes = Number(head.headers.get('content-length')), modified = head.headers.get('last-modified');
  if(!head.ok||!Number.isSafeInteger(bytes)||bytes<100||bytes>MAX_ZIP_BYTES||!modified) throw new Error('Unbounded or unversioned source archive');
  const range = async(start,end)=>{
    const response = await fetch(SOURCE,{redirect:'error',headers:{Range:`bytes=${start}-${end}`,'If-Unmodified-Since':modified}});
    if(response.status!==206||response.headers.get('content-range')!==`bytes ${start}-${end}/${bytes}`) throw new Error('Source changed or range request not honored');
    return response;
  };
  const tailStart=Math.max(0,bytes-65557),tail=Buffer.from(await(await range(tailStart,bytes-1)).arrayBuffer());
  let eocd=-1;
  for(let i=tail.length-22;i>=0;i--) if(tail.readUInt32LE(i)===0x06054b50&&i+22+tail.readUInt16LE(i+20)===tail.length) {eocd=i;break;}
  if(eocd<0||tail.readUInt16LE(eocd+4)!==0||tail.readUInt16LE(eocd+6)!==0) throw new Error('Unsupported ZIP directory');
  const count=tail.readUInt16LE(eocd+10),size=tail.readUInt32LE(eocd+12),offset=tail.readUInt32LE(eocd+16);
  if(count<1||count>20||size>65536||offset+size>bytes-22) throw new Error('Unbounded ZIP directory');
  const directory=Buffer.from(await(await range(offset,offset+size-1)).arrayBuffer());
  let shp=null,p=0;
  for(let i=0;i<count;i++) {
    if(p+46>directory.length||directory.readUInt32LE(p)!==0x02014b50) throw new Error('Invalid ZIP member');
    const nameSize=directory.readUInt16LE(p+28),extra=directory.readUInt16LE(p+30),comment=directory.readUInt16LE(p+32);
    const name=directory.subarray(p+46,p+46+nameSize).toString('utf8');
    if(name.endsWith('/land_polygons.shp')||name==='land_polygons.shp') {
      if(shp||directory.readUInt16LE(p+10)!==8||directory.readUInt16LE(p+8)&1) throw new Error('Unsupported Polygon ZIP member');
      shp={offset:directory.readUInt32LE(p+42),compressedBytes:directory.readUInt32LE(p+20),rawBytes:directory.readUInt32LE(p+24),crc:directory.readUInt32LE(p+16)};
    }
    p+=46+nameSize+extra+comment;
  }
  if(!shp||p!==directory.length||shp.compressedBytes>MAX_ZIP_BYTES||shp.rawBytes>4_000_000_000) throw new Error('Polygon ZIP member unavailable');
  const local=Buffer.from(await(await range(shp.offset,shp.offset+29)).arrayBuffer());
  if(local.readUInt32LE(0)!==0x04034b50) throw new Error('Invalid ZIP local header');
  const start=shp.offset+30+local.readUInt16LE(26)+local.readUInt16LE(28),end=start+shp.compressedBytes-1;
  if(end>=offset) throw new Error('Invalid ZIP payload bounds');
  console.log(`Reading official coastline: ${shp.compressedBytes} compressed bytes; modified ${modified}`);
  const response=await range(start,end),hash=createHash('sha256');
  let received=0,lastReport=Date.now();
  async function* counted() {
    for await(const chunk of Readable.fromWeb(response.body)) {
      received+=chunk.length; hash.update(chunk);
      if(Date.now()-lastReport>15000) {console.log(`Coastline read ${Math.floor(received/shp.compressedBytes*100)}%`);lastReport=Date.now();}
      yield chunk;
    }
    if(received!==shp.compressedBytes) throw new Error('Incomplete ZIP payload');
  }
  const input=Readable.from(counted()),inflater=createInflateRaw();
  input.on('error',error=>inflater.destroy(error));
  inflater.on('close',()=>input.destroy());
  let rawBytes=0,rawCrc=0;
  async function* checkedRaw() {
    for await(const chunk of input.pipe(inflater)) {rawBytes+=chunk.length;rawCrc=crc32(chunk,rawCrc);yield chunk;}
    if(rawBytes!==shp.rawBytes||rawCrc!==shp.crc) throw new Error('Shapefile ZIP integrity mismatch');
  }
  const polygons=await extractPolygons(checkedRaw());
  const source={url:SOURCE,modified,zipBytes:bytes,compressedShpSha256:hash.digest('hex'),license:'ODbL-1.0',attribution:'© OpenStreetMap contributors'};
  // Preserve the regional original before applying a browser representation
  // budget, so a failed representation never requires another planet read.
  await fs.mkdir('.cache/current-arrow-land-mask',{recursive:true});
  const original=JSON.stringify({schemaVersion:1,coverage:COVERAGE,source,polygons});
  if(Buffer.byteLength(original)>256*1024*1024) throw new Error('Regional original exceeds maintenance budget');
  await fs.writeFile('.cache/current-arrow-land-mask/original.json.gz',gzipSync(original),{flag:'wx'});
  await writeMask({schemaVersion:1,coverage:COVERAGE,source,polygons});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await build();
