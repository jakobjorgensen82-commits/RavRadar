import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const source = await fs.readFile('js/map/map-view.js','utf8');
const failures=[];
const need=(ok,msg)=>{if(!ok)failures.push(msg)};
need(source.includes('map.on("zoomend", refreshZoomStyles)'), 'Zonestregerne lytter ikke på zoomend.');
need(source.includes('requestAnimationFrame(() =>'), 'Zoomopdateringen mangler efter-animation redraw.');
need(source.includes('pair.casing.redraw()') && source.includes('pair.visible.redraw()') && source.includes('pair.hit.redraw()'), 'SVG-zonelag redrawes ikke eksplicit efter zoom.');
need(source.includes('cancelAnimationFrame(zoomFrame)'), 'Ventende zoom-redraw ryddes ikke sikkert.');
if(failures.length){console.error('Zoom-refresh-test fejlede:\n- '+failures.join('\n- '));process.exit(1)}
console.log('OK: Zonestreger opdateres og redrawes automatisk efter zoomanimation.');

// Exercise the actual map factory, not a copied resize helper. Only i18n and
// the browser/Leaflet boundary are replaced; no production data are needed.
const factorySource=source.replace(/^import \{ t \} from "[^"\n]+";\r?\n/, 'const t=key=>key;\n');
assert.notEqual(factorySource,source,'Den afgrænsede i18n-testadapter skal matche.');
const savedGlobals=new Map(['L','localStorage','ResizeObserver','requestAnimationFrame','cancelAnimationFrame']
  .map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
try{
  const frames=new Map(),observers=[],maps=[];
  let nextFrame=0;
  globalThis.requestAnimationFrame=callback=>{const id=nextFrame++;frames.set(id,callback);return id;};
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback());};
  globalThis.ResizeObserver=class{
    constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}
    observe(container){this.container=container;}
    disconnect(){this.disconnected=true;}
  };
  globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
  globalThis.L={
    map:()=>{
      const container={clientWidth:527,clientHeight:390},handlers=new Map();
      const map={container,invalidations:[],size:{width:527,height:390},
        setView(){return this;},on(){return this;},
        once(event,callback){handlers.set(event,callback);return this;},
        getContainer:()=>container,
        invalidateSize(options){this.invalidations.push(options);this.size={width:container.clientWidth,height:container.clientHeight};},
        remove(){handlers.get('unload')?.();},
      };
      maps.push(map);return map;
    },
    tileLayer:()=>({addTo:()=>{}}),
    control:{layers:()=>({addTo(){return this;},getContainer:()=>null})},
  };
  const {createMap}=await import(`data:text/javascript;base64,${Buffer.from(factorySource).toString('base64')}`);
  const map=createMap('map');
  assert.equal(observers.length,1,'Det faktiske kortfelt skal observeres, ikke kun browservinduet.');
  const observer=observers[0];
  assert.equal(observer.container,map.container);
  map.container.clientHeight=653; // Ranking grows after asynchronous startup.
  observer.callback();observer.callback();
  assert.equal(frames.size,1,'Flere layoutændringer skal samles i én tegneframe.');
  assert.deepEqual(map.size,{width:527,height:390});
  flush();
  assert.deepEqual(map.size,{width:527,height:653},'Leaflets størrelse skal følge det voksede kortfelt.');
  assert.deepEqual(map.invalidations,[{pan:true,animate:false}],'Leaflet skal fastholde centrum uden en pan-animation eller ny fitBounds.');
  map.container.clientHeight=0;observer.callback();flush();
  assert.equal(map.invalidations.length,1,'Et skjult kort må ikke genberegnes som nulhøjde.');
  map.container.clientHeight=430;map.container.clientWidth=375;observer.callback();flush();
  assert.deepEqual(map.size,{width:375,height:430},'Mobil/layoutskift og krympning skal også følge feltet.');
  observer.callback();assert.equal(frames.size,1);map.remove();
  assert.equal(observer.disconnected,true);assert.equal(frames.size,0,'Unload skal afbryde ventende redraw.');
  observer.callback();flush();assert.equal(map.invalidations.length,2,'Ingen redraw efter kortets fjernelse.');
  delete globalThis.ResizeObserver;
  assert.doesNotThrow(()=>createMap('legacy-map'),'Leaflets eksisterende window-resize skal bevares uden ResizeObserver.');
  assert.equal(maps.length,2);
  console.log('OK: Faktisk createMap følger containerhøjde/bredde, samler redraw, bevarer udsnit og rydder observer/frame.');
}finally{
  for(const [key,descriptor] of savedGlobals){
    if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
}
