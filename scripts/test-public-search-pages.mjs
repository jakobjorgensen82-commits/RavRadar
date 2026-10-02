import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const read = file => fs.readFile(file, 'utf8');
const version = JSON.parse(await read('package.json')).version;
const { t, MESSAGES } = await import(`../js/i18n.js?v=${version}`);
const originalMessages = JSON.stringify(MESSAGES);
await import(`../js/ui/site-search-copy.js?v=${version}`);
const pages = { da: 'ravjagt.html', de: 'bernsteinsuche.html', en: 'amber-hunting.html' };

test('discreet public footer is visible before credits and retains all requested Danish terms', async () => {
  const html = await read('index.html');
  const start = html.indexOf('<section class="footer-search"');
  const end = html.indexOf('</section>', start);
  assert.ok(start > html.indexOf('<footer>') && end < html.indexOf('<details class="source-credits">'));
  const footer = html.slice(start, end);
  assert.doesNotMatch(footer, /\bhidden\b|display\s*:\s*none|aria-hidden/);
  assert.ok(footer.includes(t('footer.searchDescription', {}, 'da')));
  for (const term of ['rav', 'ravkort', 'ravudsigten', 'ravprognose', 'ravjagt', 'ravjæger', 'kese', 'ravkese', 'ravlygte']) {
    assert.ok(footer.includes(term), `Missing public term ${term}`);
  }
  for (const [language, file] of Object.entries(pages)) {
    assert.ok(footer.includes(`href="./${file}" lang="${language}" hreflang="${language}"`));
  }
  assert.match(html, /<link rel="canonical" href="https:\/\/ravradar\.dk\/">/);
  assert.ok(html.includes('id="nationalForecast"'), 'Existing forecast section stays present');
});

test('actual extension supplies all three languages without changing the sealed message table', () => {
  for (const language of Object.keys(pages)) {
    for (const key of ['footer.searchTitle', 'footer.searchDescription', 'footer.searchLinks']) {
      assert.notEqual(t(key, {}, language), key);
      assert.equal(Object.hasOwn(MESSAGES[language], key), false);
    }
  }
  assert.match(t('footer.searchDescription', {}, 'de'), /Bernsteinkarte.*Bernsteinprognose/);
  assert.match(t('footer.searchDescription', {}, 'en'), /amber map.*amber forecast/);
  assert.equal(JSON.stringify(MESSAGES), originalMessages);
});

test('static language pages are crawlable without JavaScript and have reciprocal real alternates', async () => {
  for (const [language, file] of Object.entries(pages)) {
    const html = await read(file);
    assert.ok(html.includes(`<html lang="${language}">`));
    assert.ok(html.includes(`<link rel="canonical" href="https://ravradar.dk/${file}">`));
    for (const [alternate, alternateFile] of Object.entries(pages)) {
      assert.ok(html.includes(`<link rel="alternate" hreflang="${alternate}" href="https://ravradar.dk/${alternateFile}">`));
      assert.ok(html.includes(`href="./${alternateFile}" lang="${alternate}" hreflang="${alternate}"`));
    }
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    assert.match(html, /<h1>[^<]+<\/h1>/);
    assert.match(html, /<main class="search-guide">[\s\S]+<\/main>/);
    assert.doesNotMatch(html, /<script\b|http-equiv="refresh"|name="keywords"/i);
    assert.match(html, /script-src 'none'/);
    for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      const reference = match[1];
      if (/^https:\/\//.test(reference)) continue;
      await fs.access(path.resolve(reference.split('?')[0]));
    }
  }
});

test('sitemap contains only actual public pages and robots refers to the owned HTTPS domain', async () => {
  const sitemap = await read('sitemap.xml');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(locations).size, 6);
  assert.ok(locations.includes('https://ravradar.dk/'));
  for (const url of locations) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://ravradar.dk');
    await fs.access(parsed.pathname === '/' ? 'index.html' : parsed.pathname.slice(1));
  }
  assert.doesNotMatch(sitemap, /admin\.html|data\/|lastmod/);
  assert.match(await read('robots.txt'), /^Sitemap: https:\/\/ravradar\.dk\/sitemap\.xml$/m);
  const bootstrap = await read('bootstrap.js');
  assert.ok(bootstrap.indexOf('site-search-copy.js') < bootstrap.indexOf('initialiseI18n();'));
});
