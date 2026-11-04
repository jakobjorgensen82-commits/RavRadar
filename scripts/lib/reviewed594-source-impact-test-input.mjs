// Test DATA only. Keep the five issued594 text frames while testing actual current readers.
// New/unqualified frames still require FULL; this never changes the production planner.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const REVIEW='84051e2d700595837ebf80426410dcbef8e08704';
const TEXT=Object.freeze({
  "js/ui/about-i18n.js": "6586ba3b2af47fe19e0dea3e475d16b4b5647d02eaa1d22aae994babb3804e21",
  "js/ui/about-explainer-i18n.js": "7d0e315e7d015787ae8068e16556fe3469243b208ecfd213ac7234e600549dab",
  "js/ui/learn-i18n.js": "d002ba4a0766b0b6d17632816a61c7b251a24a750b0d25c2b48431e6ebf3dd21",
  "js/ui/learn-i18n-de.js": "1fc66067568d8d4e14583047da483e4883156c8e316cfdfa7ede04cd7091523a",
  "js/ui/learn-i18n-en.js": "d2fc547025a210eda3c2c700ec76e19b861ce47cb076c0fcb64d0b1a1cb5fe26"
});
function readReviewedInput(relative,expected){
  const bytes=execFileSync('git',['-c','protocol.allow=never','-C',ROOT,'cat-file','blob',REVIEW+':'+relative],{
    timeout:10000,maxBuffer:1024*1024,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'},
  });
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected);
  return bytes;
}
export function readReviewed594ImpactFixture(relative){
  assert(Object.hasOwn(TEXT,relative),'Only the five reviewed text DATA leaves');
  return readReviewedInput(relative,TEXT[relative]);
}
export function readReviewed594ImpactPackage(){
  // The historical synthetic FULL receipt remains attached to its genuine issued package.
  // Current597 qualification has its own independent native receipt tests.
  return readReviewedInput('package.json','5d303a5f5b07198d74c681cbac93afed13417ed2ec88640d0a14666c0e0b8347');
}
export function readImpactFixtureInput(source,relative){
  return Object.hasOwn(TEXT,relative)?readReviewed594ImpactFixture(relative):fs.readFileSync(path.join(source,relative));
}
