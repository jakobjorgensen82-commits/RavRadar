import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const about=await fs.readFile('about.html','utf8');
assert.match(about,/class="back-link" href="\.\/"/,'Om-knappen skal bruge den cachevenlige, direkte forsideadresse.');
assert.doesNotMatch(about,/return=about|nonce=/,'Returknappen må ikke tvinge en unik navigation.');

const aboutJs=await fs.readFile('js/ui/about.js','utf8');
assert.doesNotMatch(aboutJs,/back-link|preventDefault|location\.(?:assign|replace|reload)|nonce/,'Om-siden må ikke overtage den almindelige retur-navigation.');

const bootstrap=await fs.readFile('bootstrap.js','utf8');
assert.match(bootstrap,/if \(event\.persisted && !appImported\) location\.reload\(\)/,'Kun en halvfærdig bfcache-opstart må genindlæses.');
assert.doesNotMatch(bootstrap,/createPublicPageReturnWatchdog|shouldReloadImmediately|max-width: 900px|ravradarResume/,'En færdig mobilforside må ikke tvinges gennem en kold genindlæsning.');

const resume=await fs.readFile('js/core/public-page-resume.js','utf8');
assert.doesNotMatch(resume,/createPublicPageReturnWatchdog|isViewHealthy/,'Genoptagelsen må ikke have et separat reload-watchdog.');

const app=await fs.readFile('app.js','utf8');
assert.match(app,/addEventListener\('pageshow',event=>\{if\(event\.persisted\)void handlePublicPageShow\(event\);\}\)/);
assert.match(app,/async function resumePublicView\(\)[\s\S]*map\.invalidateSize\(\{pan:false\}\)[\s\S]*refreshZoneStyles[\s\S]*renderRanking\(\);renderSelectedZone\(\);[\s\S]*await renderNationalForecast\(\)[\s\S]*state\.flowArrows\?\.refresh\?\.\(\)[\s\S]*map\.invalidateSize\(\{pan:false\}\)/);
assert.doesNotMatch(app,/publicViewHealthy|ravradarResume/);

console.log('OK: Om RavRadar vender tilbage via den beviste cachevenlige mobilvej og genoptegner kort og prognoser uden tvungen reload.');
