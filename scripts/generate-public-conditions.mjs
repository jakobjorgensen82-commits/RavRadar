import fs from 'node:fs/promises';
import { writePublicRuntimeFromFull } from './public-conditions-lib.mjs';
const input=JSON.parse(await fs.readFile('data/live/conditions.json','utf8'));
const {publicDocument,manifest}=await writePublicRuntimeFromFull(input);
console.log(`Skrev public-conditions.json med ${Object.keys(publicDocument.zones).length} zoner og manifest schema ${manifest.schemaVersion}.`);
