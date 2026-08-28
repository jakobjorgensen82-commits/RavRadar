import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

await import(`../js/core/public-home-return-guard.js?test=${Date.now()}`);
const {createPublicHomeReturnGuard}=globalThis.RavRadarPublicHomeReturn;

function harness({search='?return=about',healthy=false}={}){
  let currentHealthy=healthy;
  let currentTime=0;
  let callback=null;
  const navigations=[];
  const marks=[];
  const guard=createPublicHomeReturnGuard({
    search,
    isHealthy:()=>currentHealthy,
    replace:value=>navigations.push(value),
    mark:value=>marks.push(value),
    now:()=>currentTime,
    schedule:value=>{callback=value;return 1;},
    timeoutMs:6000,
  });
  return {
    guard,
    makeHealthy:()=>{currentHealthy=true;},
    expire:()=>{currentTime=6001;callback?.();},
    tick:()=>callback?.(),
    result:()=>({navigations,marks}),
  };
}

{
  const test=harness();
  assert.equal(test.guard.start(),'watching');
  test.makeHealthy();
  test.tick();
  assert.deepEqual(test.result(),{navigations:[],marks:['pending','ready']});
}

{
  const test=harness();
  test.guard.start();
  test.expire();
  assert.deepEqual(test.result().navigations,[{source:'about',retry:1}]);
  assert.deepEqual(test.result().marks,['pending','retrying']);
}

{
  const test=harness({search:'?return=about&retry=1'});
  test.guard.start();
  test.expire();
  assert.deepEqual(test.result().navigations,[]);
  assert.deepEqual(test.result().marks,['pending','failed']);
}

{
  const test=harness({search:''});
  assert.equal(test.guard.start(),'ignored');
  assert.deepEqual(test.result(),{navigations:[],marks:['ignored']});
}

const index=await fs.readFile('index.html','utf8');
const guardIndex=index.indexOf('public-home-return-guard.js');
assert.ok(guardIndex>=0&&guardIndex<index.indexOf('leaflet.js'),'Returværnet skal være installeret før Leaflet og bootstrap.');

const guardSource=await fs.readFile('js/core/public-home-return-guard.js','utf8');
assert.match(guardSource,/leaflet-overlay-pane path\.leaflet-interactive/,'Sund retur skal kræve faktisk tegnet kortgeometri, ikke kun en tom Leaflet-pane.');

const about=await fs.readFile('about.html','utf8');
assert.match(about,/href="\.\/\?return=about&amp;v=4\.0\.298"/);

const aboutJs=await fs.readFile('js/ui/about.js','utf8');
assert.match(aboutJs,/target\.searchParams\.set\('nonce'/);
assert.match(aboutJs,/location\.assign\(target\.href\)/);

const worker=await fs.readFile('service-worker.js','utf8');
assert.match(worker,/public-home-return-guard\.js\?v=\$\{APP_VERSION\}/);

console.log('OK: Om RavRadar-linket laver en entydig Safari/PWA-navigation med én loop-sikret sundhedsgenindlæsning.');
