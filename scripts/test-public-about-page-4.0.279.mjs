import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const index = read('index.html');
const about = read('about.html');
const aboutCss = read('about.css');
const style = read('style.css');
const worker = read('service-worker.js');

const headerStart = index.indexOf('<header class="app-header">');
const headerEnd = index.indexOf('</header>', headerStart);
const header = index.slice(headerStart, headerEnd);
assert.ok(header.includes('href="./about.html"'), 'Topmenuen skal linke til Om RavRadar');
assert.ok(header.includes('id="accountButton"') && header.includes('id="tripButton"') && header.includes('id="assistantButton"'), 'Om-linket skal ligge i samme topområde som konto, tur og assistent');

for (const expected of [
  'Jakob Jørgensen',
  'jakob.jorgensen82@gmail.com',
  'MobilePay Box: 4214MX',
  '8f2b226a-fd43-43f2-8610-1fa0df857c63',
  'når de en sjælden gang har lyst',
  'Limfjorden',
  'Sæby',
  'bevidst forenkling'
]) assert.ok(about.includes(expected), `Om-siden mangler: ${expected}`);

assert.equal(about.includes('RavRadar viser beregnede vurderinger. Forholdene på stedet kan være anderledes.'), false, 'Den fravalgte bundtekst må ikke vises på Om-siden');
assert.match(about, /srcset="[^"]*jakob-480\.webp[^"]*jakob-900\.webp/);
assert.match(about, /srcset="[^"]*ravjagt-med-boern-720\.webp[^"]*ravjagt-med-boern-1800\.webp/);
assert.match(aboutCss, /@media \(max-width: 860px\)/);
assert.match(aboutCss, /@media \(max-width: 600px\)/);
assert.match(style, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.ok(worker.includes('"./about.html"') && worker.includes('`./about.css?v=${APP_VERSION}`'), 'Om-siden skal være del af app-skallen');

for (const asset of [
  'assets/about/jakob-480.webp',
  'assets/about/jakob-900.webp',
  'assets/about/ravjagt-med-boern-720.webp',
  'assets/about/ravjagt-med-boern-1200.webp',
  'assets/about/ravjagt-med-boern-1800.webp',
  'assets/about/qrcode.min.js',
  'assets/about/QRCODEJS-LICENSE.txt'
]) assert.ok(fs.statSync(path.join(root, asset)).size > 1000, `Manglende eller tomt aktiv: ${asset}`);

console.log('Om RavRadar: indhold, topmenu, MobilePay og responsivt layout er kontraktkontrolleret.');
