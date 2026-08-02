import fs from 'node:fs/promises';
const source=await fs.readFile('scripts/enrich-current-provenance.mjs','utf8');
const failures=[];
if(!/row\.currentSpeedMps=round\(Math\.hypot\(raw\.u,raw\.v\),2\)/.test(source))failures.push('Berigelsen genberegner ikke hastighed fra verificeret u/v.');
if(!/row\.currentDirectionDeg=round\(directionFromComponents\(raw\.u,raw\.v\),0\)/.test(source))failures.push('Berigelsen genberegner ikke retning fra verificeret u/v.');
if(failures.length)throw new Error(failures.join('\n'));
console.log('OK: strømproveniens gør u/v autoritativ og genberegner vist hastighed og retning.');
