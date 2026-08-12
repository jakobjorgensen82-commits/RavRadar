import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {sharedMainZoneBoundaries} from '../js/map/map-view.js';

const ref=(lat,lon,bearing=90)=>({point:[lat,lon],bearing});
const rows=[
  {zoneId:'A',startReference:ref(57,10),endReference:ref(57,10.1)},
  {zoneId:'B',startReference:ref(57,10.1002),endReference:ref(57,10.2)},
  {zoneId:'C',startReference:ref(57,10.2002),endReference:ref(57,10.3)},
  // En intern beregningsdel i samme hovedzone må ikke skabe et ekstra skel.
  {zoneId:'B',startReference:ref(57,10.13),endReference:ref(57,10.14)}
];
const boundaries=sharedMainZoneBoundaries(rows);
assert.equal(boundaries.length,2,'Der skal være præcis ét skel ved hver overgang mellem hovedzoner.');
assert.deepEqual(boundaries.map(row=>[...row.zoneIds].sort()),[['A','B'],['B','C']]);

const source=await fs.readFile(new URL('../js/map/map-view.js',import.meta.url),'utf8');
assert.match(source,/zoom <= 6 \? 2\.5/,'Landsoversigten mangler små zoneskel.');
assert.doesNotMatch(source,/startTick|endTick/,'Gamle dobbelte ende-markører må ikke tegnes.');
const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
assert.match(app,/showOverview\?\.\(\)/,'Tilbage-knappen gendanner ikke Danmark-overblikket.');
console.log('OK: Kun delte hovedzonegrænser markeres, og oversigten gendannes.');
