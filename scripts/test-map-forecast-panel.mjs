// Real normal panel renderer: a selected single hour is not a five-day summary.
import assert from 'node:assert/strict';
import test from 'node:test';
import {showZoneInfo} from '../js/ui/info-panel.js';
import '../js/ui/map-timeline-copy.js?v=4.0.579';
const time='2026-10-18T12:00:00.000Z';
const result={available:true,score:72,level:'fair',time,
  components:{huntability:60,transport:50,release:40},componentReasons:{},reasons:[]};
const zone={id:'synthetic-only',name:'Syntetisk område',region:'Lokal prøve'};
const weather={time,windSpeedMps:6,windDirectionDeg:90};
const forecast={hourly:[weather]};
test('selected-hour panel does not invent an unavailable five-day summary; normal view is preserved',()=>{
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
