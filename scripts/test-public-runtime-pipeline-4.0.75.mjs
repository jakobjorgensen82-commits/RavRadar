import fs from 'node:fs/promises';
import { buildPublicConditions, compactJson, sha256Text } from './public-conditions-lib.mjs';

const full=JSON.parse(await fs.readFile('data/live/conditions.json','utf8'));
const publicText=await fs.readFile('data/live/public-conditions.json','utf8');
const manifest=JSON.parse(await fs.readFile('data/live/manifest.json','utf8'));
const expectedText=compactJson(buildPublicConditions(full));
if(publicText!==expectedText) throw new Error('Den publicerede runtime er ikke byte-identisk med den fælles deterministiske projektion.');
if(manifest.datasetId!==full.datasetId) throw new Error('Manifest og fuld conditions har forskelligt datasetId.');
if(manifest.publicConditionsSha256!==sha256Text(publicText)) throw new Error('Manifestets SHA-256 for public-conditions er forkert.');
if(manifest.publicConditionsBytes!==Buffer.byteLength(publicText)) throw new Error('Manifestets byteantal for public-conditions er forkert.');
if(manifest.conditionsPath!=='./public-conditions.json') throw new Error('Manifestet peger ikke på public runtime.');
const workflow=await fs.readFile('.github/workflows/update-and-deploy.yml','utf8');
const occurrences=(workflow.match(/node scripts\/generate-public-conditions\.mjs/g)||[]).length;
if(occurrences<2) throw new Error('Workflowet genopbygger ikke public runtime både efter hydrering og før deploy.');
const updater=await fs.readFile('scripts/update-weather.mjs','utf8');
if(!updater.includes('writePublicRuntimeFromFull(output)')) throw new Error('Vejropdateringen bruger ikke den fælles runtime-writer.');
if(updater.includes('buildPublicConditions(output)')) throw new Error('Vejropdateringen har stadig en separat projektionsvej.');
console.log('OK: én deterministisk kilde styrer public runtime, manifest, workflow og vejrupdate.');
