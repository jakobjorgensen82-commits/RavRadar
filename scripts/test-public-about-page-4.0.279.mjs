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

function jpegDimensions(relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  assert.equal(bytes[0], 0xff, `${relativePath} er ikke en JPEG-fil`);
  assert.equal(bytes[1], 0xd8, `${relativePath} er ikke en JPEG-fil`);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const segmentLength = bytes.readUInt16BE(offset + 2);
    assert.ok(segmentLength >= 2, `${relativePath} har et ugyldigt JPEG-segment`);
    offset += segmentLength + 2;
  }
  throw new Error(`${relativePath} mangler billeddimensioner`);
}

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
assert.match(about, /srcset="[^"]*ravjagt-med-boern-720\.jpg[^"]*ravjagt-med-boern-1800\.jpg/);
assert.match(about, /width="1350" height="1800"/);
assert.match(aboutCss, /@media \(max-width: 860px\)/);
assert.match(aboutCss, /@media \(max-width: 600px\)/);
assert.match(aboutCss, /\.family-photo\s*\{[^}]*grid-template-columns:\s*minmax\(300px,\s*\.82fr\)\s*minmax\(0,\s*1\.18fr\)/s);
assert.match(aboutCss, /@media \(max-width: 860px\)[\s\S]*?\.family-photo\s*\{\s*grid-template-columns:\s*1fr;/);
assert.match(style, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.ok(worker.includes('"./about.html"') && worker.includes('`./about.css?v=${APP_VERSION}`'), 'Om-siden skal være del af app-skallen');

for (const asset of [
  'assets/about/jakob-480.webp',
  'assets/about/jakob-900.webp',
  'assets/about/ravjagt-med-boern-720.jpg',
  'assets/about/ravjagt-med-boern-1200.jpg',
  'assets/about/ravjagt-med-boern-1800.jpg',
  'assets/about/qrcode.min.js',
  'assets/about/QRCODEJS-LICENSE.txt'
]) assert.ok(fs.statSync(path.join(root, asset)).size > 1000, `Manglende eller tomt aktiv: ${asset}`);

assert.deepEqual(jpegDimensions('assets/about/ravjagt-med-boern-720.jpg'), { width: 540, height: 720 });
assert.deepEqual(jpegDimensions('assets/about/ravjagt-med-boern-1200.jpg'), { width: 900, height: 1200 });
assert.deepEqual(jpegDimensions('assets/about/ravjagt-med-boern-1800.jpg'), { width: 1350, height: 1800 });
assert.equal(about.includes('ravjagt-med-boern-1200.webp'), false, 'Om-siden må ikke bruge den tidligere sidevendte billedvariant');
assert.equal(worker.includes('ravjagt-med-boern-1200.webp'), false, 'Offline-appskallen må ikke cache den tidligere sidevendte billedvariant');

console.log('Om RavRadar: indhold, topmenu, MobilePay og responsivt layout er kontraktkontrolleret.');
