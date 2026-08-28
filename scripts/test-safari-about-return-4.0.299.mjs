import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const about=await fs.readFile('about.html','utf8');
assert.match(about,/href="\.\/\?return=about&amp;v=4\.0\.299"/);

const aboutJs=await fs.readFile('js/ui/about.js','utf8');
assert.match(aboutJs,/target\.searchParams\.set\('nonce'/);
assert.match(aboutJs,/location\.assign\(target\.href\)/);

const index=await fs.readFile('index.html','utf8');
assert.doesNotMatch(index,/public-home-return-guard/,'Forsiden må ikke blokere eller genstarte på et særskilt Om-returværn.');

const worker=await fs.readFile('service-worker.js','utf8');
assert.doesNotMatch(worker,/public-home-return-guard/,'Det forkastede returværn må ikke ligge i appskallens cache.');

const packageJson=JSON.parse(await fs.readFile('package.json','utf8'));
assert.match(packageJson.scripts['test:mobile-live-cache'],/test-safari-about-return-4\.0\.299\.mjs/);
assert.doesNotMatch(packageJson.scripts['test:mobile-live-cache'],/test-safari-about-return-4\.0\.298\.mjs/);

console.log('OK: Om RavRadar laver én unik Safari/PWA-navigation uden timer, tvungen reload eller ekstra head-script.');
