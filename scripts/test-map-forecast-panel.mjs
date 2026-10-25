// Real normal panel renderer: a selected single hour is not a five-day summary.
import assert from 'node:assert/strict';
import test from 'node:test';
import {showZoneInfo} from '../js/ui/info-panel.js';
import '../js/ui/map-timeline-copy.js?v=4.0.579';
import { exactForecastShareSelection, readForecastShare, forecastShareUrl, forecastShareDate,
  forecastShareScoreText, forecastShareCopy } from '../js/services/forecast-share-contract.js';
import { mountForecastShareControl } from '../js/ui/forecast-share.js';
const time='2026-10-18T12:00:00.000Z';
const result={available:true,score:72,level:'fair',time,
  components:{huntability:60,transport:50,release:40},componentReasons:{},reasons:[]};
const zone={id:'synthetic-only',name:'Syntetisk område',region:'Lokal prøve'};
const weather={time,windSpeedMps:6,windDirectionDeg:90};
const forecast={hourly:[weather]};
test('selected-hour panel does not invent an unavailable five-day summary; normal view is preserved',t=>{
  // The synthetic forecast must belong to the test's date, not the CI host's
  // moving Danish day. Keep the normal renderer's real expiry rule unchanged.
  t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-18T10:00:00.000Z')});
  for(const mode of ['waders','beach']){
    const current={innerHTML:''};showZoneInfo(current,zone,result,weather,mode,{forecast});
    assert.match(current.innerHTML,/data-forecast-section/);assert.match(current.innerHTML,/data-tide-section/);
    const selected={innerHTML:''};showZoneInfo(selected,zone,result,weather,mode,{forecast,mapForecastTime:time});
    assert.match(selected.innerHTML,/>72</);assert.doesNotMatch(selected.innerHTML,/data-forecast-section|data-tide-section/);
    assert.match(selected.innerHTML,/map-timeline-zone-scope/);
    const invalid={innerHTML:''};showZoneInfo(invalid,zone,result,weather,mode,{forecast,mapForecastTime:'2026-10-18T13:00:00.000Z'});
    assert.match(invalid.innerHTML,/data-forecast-section/,'An unrelated time flag must not suppress normal functions');
  }
});

test('normal panel expires the same synthetic forecast after Danish midnight',t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-18T22:01:00.000Z')});
  for(const mode of ['waders','beach']){
    const current={innerHTML:''};showZoneInfo(current,zone,result,weather,mode,{forecast});
    assert.match(current.innerHTML,/class="forecast-section"/);
    assert.match(current.innerHTML,/class="tide-section"/);
    assert.doesNotMatch(current.innerHTML,/data-forecast-section|data-tide-section/,
      'Expired prior-day data must not become a selectable normal forecast');
    assert.doesNotMatch(current.innerHTML,/map-timeline-zone-scope/);
  }
});


test('forecast share keeps exact UTC, safe URL selection, zero score and suffix-free DA/DE/EN DST labels',()=>{
  const repeated=['2026-10-25T00:00:00.000Z','2026-10-25T01:00:00.000Z'];
  for(const language of ['da','de','en'])for(const mode of ['waders','beach']){
    const selections=repeated.map(time=>({zoneId:zone.id,time,mode,language}));
    const links=selections.map(selection=>forecastShareUrl('https://ravradar.invalid/?score=100&account=private#access_token=private',selection));
    assert.notEqual(links[0],links[1]);
    for(let i=0;i<links.length;i++){
      const url=new URL(links[i]);
      assert.equal(url.hash,'');assert.deepEqual([...url.searchParams.keys()],['share','zone','time','mode','lang']);
      assert.deepEqual(readForecastShare(links[i]),{status:'valid',selection:selections[i]});
      assert.deepEqual(readForecastShare(links[i]+'&fbclid=ignored').selection,selections[i]);
      assert.equal(readForecastShare(links[i]+'&score=100').status,'invalid');
      assert.equal(readForecastShare(links[i]+'&time='+encodeURIComponent(repeated[0])).status,'invalid');
      const label=forecastShareDate(repeated[i],language);
      assert.match(label,language==='da'?/02\.00/:/02:00/);
      assert.doesNotMatch(label,/\b(?:CET|CEST|UTC|GMT)\b/);
    }
    assert.equal(forecastShareDate(repeated[0],language),forecastShareDate(repeated[1],language),
      'Only the new share label omits the repeated-hour suffix; its links remain distinct');
    assert.match(forecastShareScoreText({...result,score:0},language),/0\/100/);
    for(const value of [null,NaN,-1,101,'0']){
      assert.equal(forecastShareScoreText({...result,score:value},language),forecastShareCopy(language).unavailable);
    }
    assert.equal(forecastShareScoreText({...result,available:false,score:0},language),forecastShareCopy(language).unavailable);
    const qualified=forecastShareScoreText({...result,scoreQuality:'HISTORY_INCOMPLETE',localCoverage:{status:'partial-zone'}},language);
    assert.ok(qualified.includes(forecastShareCopy(language).partial));assert.ok(qualified.includes(forecastShareCopy(language).history));
  }
  const selection={zoneId:zone.id,time:repeated[0],mode:'waders',language:'da'};
  for(const invalid of ['2026-10-25T02:00:00+02:00','2026-10-25T00:30:00.000Z','2026-02-30T00:00:00.000Z']){
    assert.equal(exactForecastShareSelection({...selection,time:invalid}),null);
  }
  assert.equal(exactForecastShareSelection({...selection,mode:'other'}),null);
  assert.equal(exactForecastShareSelection({...selection,language:'other'}),null);
  assert.equal(readForecastShare('https://ravradar.invalid/').status,'absent');
});

test('real share control uses committed time and URL only; native abort never copies, explicit fallback remains usable',async t=>{
  const savedDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  const savedNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  t.after(()=>{
    for(const [key,descriptor] of [['document',savedDocument],['navigator',savedNavigator]]){
      if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
    }
  });
  class ShareElement{
    constructor(tag){this.tag=tag;this.children=[];this.listeners=new Map();this.attributes={};this.hidden=false;this.isConnected=true;}
    append(...nodes){this.children.push(...nodes);}
    setAttribute(key,value){this.attributes[key]=value;}
    addEventListener(key,listener){this.listeners.set(key,listener);}
    emit(key){return this.listeners.get(key)?.({target:this});}
    showModal(){this.open=true;}
    close(){this.open=false;this.emit('close');}
    remove(){this.isConnected=false;}
    focus(){this.focused=true;}
    select(){this.selected=true;}
  }
  const body=new ShareElement('body');
  Object.defineProperty(globalThis,'document',{configurable:true,value:{body,createElement:tag=>new ShareElement(tag)}});
  const setNavigator=value=>Object.defineProperty(globalThis,'navigator',{configurable:true,value});
  const selection={zoneId:zone.id,time,mode:'beach',language:'da'};
  let selectionCurrent=true;
  function mount(value={...result,score:0}){
    const buttons=[],header={insertAdjacentElement:(where,node)=>{assert.equal(where,'afterend');buttons.push(node);}};
    buttons.dispose=mountForecastShareControl({querySelector:selector=>selector==='.zone-header'?header:null},
      {selection,zoneName:zone.name,result:value,pageUrl:'https://ravradar.invalid/',isSelectionCurrent:()=>selectionCurrent});
    return buttons;
  }
  assert.equal(mount({...result,time:'2026-10-18T13:00:00.000Z'}).length,0,
    'A pending/different score must not be labelled as the committed selection');
  function open(){
    selectionCurrent=true;
    const buttons=mount(),[button]=buttons;assert.ok(button);button.emit('click');
    const dialog=body.children.at(-1),content=dialog.children[1];
    const actions=content.children.find(node=>node.className==='button-row');
    assert.match(content.children.find(node=>node.className==='forecast-share-score').textContent,/0\/100/);
    assert.doesNotMatch(content.children.find(node=>node.className==='forecast-share-time').textContent,/\b(?:CET|CEST)\b/);
    return{button,dialog,dispose:buttons.dispose,share:actions.children[0],copy:actions.children[1],
      status:content.children.find(node=>node.attributes.role==='status'),field:content.children.find(node=>node.tag==='input')};
  }
  let nativeCalls=0,clipboardCalls=0;
  setNavigator({canShare:()=>true,share:async payload=>{
    nativeCalls++;assert.deepEqual(Object.keys(payload),['url']);
    assert.deepEqual(readForecastShare(payload.url).selection,selection);
    throw Object.assign(new Error('cancelled'),{name:'AbortError'});
  },clipboard:{writeText:async()=>{clipboardCalls++;}}});
  const aborted=open();await aborted.share.emit('click');
  assert.equal(nativeCalls,1);assert.equal(clipboardCalls,0);assert.equal(aborted.field.hidden,true);
  assert.equal(aborted.share.disabled,false);aborted.dialog.close();
  assert.equal(aborted.dialog.isConnected,false);assert.equal(aborted.button.focused,true);
  setNavigator({share:async()=>{nativeCalls++;},canShare:()=>false,clipboard:{writeText:async url=>{
    clipboardCalls++;assert.deepEqual(readForecastShare(url).selection,selection);
  }}});
  const copied=open();await copied.share.emit('click');
  assert.equal(nativeCalls,1);assert.equal(clipboardCalls,1);
  assert.equal(copied.status.textContent,forecastShareCopy('da').copied);assert.equal(copied.field.hidden,true);
  for(const navigatorValue of [{},{clipboard:{writeText:async()=>{throw Error('DENIED');}}}]){
    setNavigator(navigatorValue);const manual=open();await manual.copy.emit('click');
    assert.equal(manual.status.textContent,forecastShareCopy('da').manual);
    assert.equal(manual.field.hidden,false);assert.equal(manual.field.selected,true);
    assert.deepEqual(readForecastShare(manual.field.value).selection,selection);
  }
  setNavigator({});const unsupported=open();await unsupported.share.emit('click');
  assert.equal(unsupported.field.hidden,false);assert.equal(unsupported.field.selected,true);
  setNavigator({share:async payload=>{nativeCalls++;assert.deepEqual(Object.keys(payload),['url']);}});
  const shared=open();await shared.share.emit('click');assert.equal(nativeCalls,2);
  const replaced=open();replaced.dispose();assert.equal(replaced.dialog.isConnected,false);
  await replaced.share.emit('click');assert.equal(nativeCalls,2,'Disposed UI cannot launch native sharing');
  setNavigator({share:async()=>{nativeCalls++;},clipboard:{writeText:async()=>{clipboardCalls++;}}});
  for(const action of ['share','copy']){
    const expired=open(),before=[nativeCalls,clipboardCalls];selectionCurrent=false;
    await expired[action].emit('click');assert.equal(expired.dialog.isConnected,false);
    assert.deepEqual([nativeCalls,clipboardCalls],before,'Fresh rejection stops both native and clipboard calls');
  }
});
