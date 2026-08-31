import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('js/services/data-service.js', 'utf8');

assert.match(
  source,
  /'recoveryFallback' in manifest[\s\S]{0,80}'emergencyFallback' in manifest/,
  'Den offentlige data-service skal eksplicit afvise gamle fallbackbeskrivelser.',
);
assert.doesNotMatch(source, /function recoveryFallbackUrl|active-last-verified|last-verified-public/,
  'Den offentlige data-service må ikke have en gammel fallbackvælger.');
assert.match(
  source,
  /const url = publicConditionsUrl\(manifest\);[\s\S]*expectedSha256: manifest\.publicConditionsSha256/,
  'Startpakken skal vælges direkte fra schema-4-manifestets primære, hashbundne sti.',
);
assert.match(
  source,
  /const url = publicDetailsUrl\(manifest\);[\s\S]*expectedSha256: manifest\.publicConditionDetailsSha256/,
  'Detaljepakken skal vælges direkte fra samme schema-4-manifest.',
);
assert.match(
  source,
  /Detaljedata og startdata bruger ikke samme RavScore-modelbundle/,
  'Startup og detaljer skal fortsat afvises ved blandet modelbundle.',
);

console.log('Public data-service: gammel public recovery er pensioneret; kun schema-4-manifestets atomiske modelbundle kan vælges.');
