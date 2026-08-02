import fs from 'node:fs/promises';
import { buildPublicConditions, compactJson } from './public-conditions-lib.mjs';
const input=JSON.parse(await fs.readFile('data/live/conditions.json','utf8'));
const output=buildPublicConditions(input);
await fs.writeFile('data/live/public-conditions.json',compactJson(output));
console.log(`Skrev public-conditions.json med ${Object.keys(output.zones).length} zoner.`);
