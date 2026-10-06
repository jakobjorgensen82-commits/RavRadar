"""Bounded public-source review. No owner fields, GPS, weather or private data.

Geographically spread service checks are not a representative soil/amber
sample. Profile selection is the nearest returned boring inside each small
query window, independent of amber and lithology; capped answers stay partial.
Original HTML remains in temp. Only its public geology table is retained.
"""
import argparse, concurrent.futures, datetime, gzip, hashlib, json, math, re
from pathlib import Path
import urllib.parse, urllib.request
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]
DATE='2026-10-06'
POINTS=[('Asaa',57.156,10.395),('Jerup',57.526,10.405),('Thy',56.969,8.730),
        ('Skive',56.564,9.031),('Varde',55.612,8.446),('Aabenraa',55.042,9.401),
        ('Stenstrup',55.119,10.490),('Nordfyn',55.494,10.245),('Langeland',54.930,10.745),
        ('Lammefjord',55.801,11.502),('Allerød',55.871,12.350),('Sorø',55.432,11.543),
        ('Rødby',54.698,11.382),('Falster',54.850,11.878),('Møn',54.989,12.342),('Bornholm',55.113,14.903)]
def url(base,params):return base+'?'+urllib.parse.urlencode(params)
def sha(raw):return hashlib.sha256(raw).hexdigest()
def get(target,temp,key,limit=500000):
    req=urllib.request.Request(target,headers={'Origin':'https://ravradar.dk','User-Agent':'RavRadar-public-context-review/1.0'})
    with urllib.request.urlopen(req,timeout=20) as r:
        raw=r.read(limit+1)
        if len(raw)>limit:raise ValueError('Public response exceeds bound')
        info={'url':r.url,'status':r.status,'contentType':r.headers.get('content-type'),
              'cors':r.headers.get('access-control-allow-origin'),'bytes':len(raw),'sha256':sha(raw),
              'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
        charset=r.headers.get_content_charset() or 'utf-8'
    (temp/(key+'.source')).write_bytes(raw)
    return raw.decode(charset,errors='strict'),info
class GeologyTable(HTMLParser):
    def __init__(self):
        super().__init__();self.heading=None;self.ready=False;self.table=False;self.finished=False
        self.cell=None;self.row=[];self.rows=[];self.headers=[]
    def handle_starttag(self,tag,attrs):
        if tag=='h4':
            if self.ready and not self.table and not self.finished:self.finished=True
            self.heading=[]
        if tag=='table' and self.ready and not self.finished:self.table=True
        if self.table and tag=='tr':self.row=[]
        if self.table and tag in ('th','td'):self.cell=(tag,[])
    def handle_data(self,data):
        if self.heading is not None:self.heading.append(data)
        if self.cell is not None:self.cell[1].append(data)
    def handle_endtag(self,tag):
        if tag=='h4' and self.heading is not None:
            if ''.join(self.heading).strip()=='Geologi':self.ready=True
            self.heading=None
        if self.table and tag in ('th','td') and self.cell is not None:
            value=' '.join(''.join(self.cell[1]).split())
            if tag=='th':self.headers.append(value)
            else:self.row.append(value)
            self.cell=None
        if self.table and tag=='tr' and self.row:self.rows.append(self.row)
        if self.table and tag=='table':self.table=False;self.finished=True
def geology(html):
    table=GeologyTable();table.feed(html)
    if not table.headers:return []
    headers=table.headers
    if headers!=['Top*','Bund*','Top**','Bund**','DGU-symbol','Beskrivelse']:raise ValueError('Geology table schema changed')
    rows=[]
    for cells in table.rows:
        if not cells:continue
        if len(cells)!=6:raise ValueError('Malformed geology row')
        top,bottom=(float(v.replace(',','.')) if v.strip() not in ('','-') else None for v in cells[:2])
        if any(v is not None and (not math.isfinite(v) or v<0 or v>10000) for v in (top,bottom)):raise ValueError('Invalid recorded depth')
        if top is not None and bottom is not None and bottom<=top:raise ValueError('Invalid recorded interval')
        # Code is scoped to this Jupiter description, not the surface legend.
        parts=cells[4].rsplit(' - ',1)
        rows.append({'top_m':top,'bottom_m':bottom,'description':parts[0][:240],
                     'code':parts[1] if len(parts)==2 else None,'missingBounds':top is None or bottom is None})
    return rows
def review(point,temp):
    name,lat,lon=point;key=name.lower().replace('ø','o').replace('æ','ae');d=.00001
    soil=url('https://geodata.fvm.dk/geoserver/ows',dict(service='WMS',version='1.1.1',request='GetFeatureInfo',
      layers='Jordbunds_og_terraenforhold:Jordbundskort_2024',query_layers='Jordbunds_og_terraenforhold:Jordbundskort_2024',
      styles='',srs='EPSG:4326',bbox=f'{lon-d},{lat-d},{lon+d},{lat+d}',width=101,height=101,x=50,y=50,
      info_format='application/json',feature_count=8,propertyName='JB_kode,Jordtype'))
    text,sbinding=get(soil,temp,key+'-soil');sj=json.loads(text)
    rows=[{k:f['properties'][k] for k in ('JB_kode','Jordtype')} for f in sj['features']]
    bores=url('https://jupiter.geus.dk/geusmap/ows/4326.jsp',dict(SERVICE='WFS',VERSION='1.0.0',REQUEST='GetFeature',
      LAYERS='jupiter_boringer_ws',TYPENAME='jupiter_boringer_ws',BBOX=f'{lon-.015},{lat-.01},{lon+.015},{lat+.01}',
      MAXFEATURES=51,OUTPUTFORMAT='geojson',PROPERTYNAME='msGeometry,dgunr,dybde_num,dato'))
    text,bbinding=get(bores,temp,key+'-bores');bj=json.loads(text)
    features=bj['features'];profile=None
    if features:
        selected=min(features,key=lambda f:((f['geometry']['coordinates'][0]-lon)*math.cos(math.radians(lat)))**2+(f['geometry']['coordinates'][1]-lat)**2)
        p=selected['properties'];dgu=str(p['dgunr']).replace(' ','')
        if not re.fullmatch(r'\d{1,3}\.\d{1,6}[A-Z]?',dgu):raise ValueError('Unexpected DGU number')
        target=url('https://data.geus.dk/JupiterWWW/borerapport.jsp',{'dgunr':dgu})
        html,pbinding=get(target,temp,key+'-profile');intervals=geology(html)
        # Check profile's own published WGS84 location against WFS point.
        match=re.search(r'wkt=POINT\(([-\d.]+)\+([-\d.]+)\)',html)
        coordinates=selected['geometry']['coordinates']
        verified=bool(match and max(abs(float(match.group(i+1))-coordinates[i]) for i in range(2))<.00001)
        if not verified:raise ValueError('Profile location does not match WFS point')
        profile={'id':key,'region':name,'dgu':dgu,'longitude':coordinates[0],'latitude':coordinates[1],
          'totalDepth_m':p.get('dybde_num'),'drilledOn':p.get('dato'),'intervals':intervals,
          'source':target,'sourceHtmlSha256':pbinding['sha256'],'observedAt':pbinding['observedAt']}
    return {'region':name,'click':[lat,lon],'soilClasses':rows,'soilBinding':sbinding,
            'boringsReturned':len(features),'boringsCapped':len(features)==51,'boreBinding':bbinding,
            'profile':profile,'profileBinding':pbinding if profile else None}
def main():
    p=argparse.ArgumentParser();p.add_argument('--temp',type=Path,required=True);args=p.parse_args();args.temp.mkdir(parents=True,exist_ok=True)
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs={pool.submit(review,point,args.temp):point[0] for point in POINTS}
        for job in concurrent.futures.as_completed(jobs):
            try:result=job.result();print(json.dumps({'region':result['region'],'soil':result['soilClasses'],'bores':result['boringsReturned'],'profile':result['profile']['dgu'] if result['profile'] else None,'intervals':len(result['profile']['intervals']) if result['profile'] else 0},ensure_ascii=False));results.append(result)
            except Exception as e:results.append({'region':jobs[job],'error':str(e)});print(json.dumps({'region':jobs[job],'error':str(e)},ensure_ascii=False))
    order={x[0]:i for i,x in enumerate(POINTS)};results.sort(key=lambda r:order[r['region']])
    out=ROOT/'docs/research/jordrav/public-context-sources-2026-10-06.json'
    profiles=[r['profile'] for r in results if r.get('profile')]
    report={'date':DATE,'status':'PASS' if all('error' not in r for r in results) else 'INCOMPLETE',
      'scope':'16 geographically spread public service checks, not representative samples, amber finds or national absence evidence',
      'selection':'Nearest returned borehole in each capped small window, independent of amber or sediment; no inferred lateral layer extent',
      'depthReference':'Metres below the borehole terrain at recording; present exposure and plough connection unknown',
      'retained':'Public WFS coordinates/identifier/depth/date and original geology table intervals only; source HTML stays in temp',
      'results':results}
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # App-side selected geological observations, separately versioned from model 0.2.
    product=ROOT/'data/jordrav/context-20261006';product.mkdir(exist_ok=True)
    raw=(json.dumps({'version':'2026-10-06','profiles':profiles},ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
    (product/'profiles.json').write_bytes(raw)
    print(json.dumps({'report':str(out),'profiles':len(profiles),'profileBytes':len(raw),'sha256':sha(raw)}))
if __name__=='__main__':main()
