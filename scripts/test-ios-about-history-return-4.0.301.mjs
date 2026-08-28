import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { cameFromPublicHome, installAboutHomeReturn } from '../js/core/about-home-return.js';

assert.equal(cameFromPublicHome({
  referrer:'https://example.test/RavRadar/?verify=1',
  homeHref:'https://example.test/RavRadar/',
  currentHref:'https://example.test/RavRadar/about.html',
}),true);
assert.equal(cameFromPublicHome({
  referrer:'https://example.test/RavRadar/index.html',
  homeHref:'./',
  currentHref:'https://example.test/RavRadar/about.html',
}),true);
assert.equal(cameFromPublicHome({
  referrer:'https://foreign.test/',
  homeHref:'./',
  currentHref:'https://example.test/RavRadar/about.html',
}),false);
assert.equal(cameFromPublicHome({referrer:'',homeHref:'./',currentHref:'https://example.test/RavRadar/about.html'}),false);

function harness(referrer) {
  let handler=null,backCalls=0,prevented=0;
  const link={
    href:'https://example.test/RavRadar/',
    addEventListener:(name,value)=>{assert.equal(name,'click');handler=value;},
    removeEventListener:()=>{},
  };
  installAboutHomeReturn({
    link,
    historyObject:{back:()=>{backCalls+=1;}},
    locationObject:{href:'https://example.test/RavRadar/about.html'},
    documentObject:{referrer},
  });
  const click=overrides=>handler({
    defaultPrevented:false,button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,
    preventDefault:()=>{prevented+=1;},
    ...overrides,
  });
  return {click,counts:()=>({backCalls,prevented})};
}

{
  const test=harness('https://example.test/RavRadar/');
  test.click();
  assert.deepEqual(test.counts(),{backCalls:1,prevented:1});
}
{
  const test=harness('');
  test.click();
  assert.deepEqual(test.counts(),{backCalls:0,prevented:0});
}
{
  const test=harness('https://example.test/RavRadar/');
  test.click({metaKey:true});
  assert.deepEqual(test.counts(),{backCalls:0,prevented:0});
}

const about=await fs.readFile('about.html','utf8');
assert.match(about,/class="back-link" href="\.\/"/,'Det statiske link skal forblive fallback ved direkte åbnet Om-side.');
const aboutJs=await fs.readFile('js/ui/about.js','utf8');
assert.match(aboutJs,/installAboutHomeReturn/);
assert.doesNotMatch(aboutJs,/location\.(?:assign|replace|reload)|nonce/);

const app=await fs.readFile('app.js','utf8');
assert.match(app,/addEventListener\('pageshow',event=>\{if\(event\.persisted\)void handlePublicPageShow\(event\);\}\)/,'Historikreturen skal ramme den eksisterende fulde redraw.');

console.log('OK: RavRadar-knappen bruger rigtig historikretur fra forsiden og beholder statisk fallback ved direkte åbnet Om-side.');
