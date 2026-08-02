import fs from 'node:fs/promises';
const source=await fs.readFile('scripts/enrich-current-provenance.mjs','utf8');
const failures=[];
if(!/const storedU=round\(raw\.u,5\)/.test(source)||!/const storedV=round\(raw\.v,5\)/.test(source))failures.push('Berigelsen fastlægger ikke en kanonisk lagret u/v-vektor.');
if(!/row\.currentSpeedMps=round\(Math\.hypot\(storedU,storedV\),2\)/.test(source))failures.push('Berigelsen genberegner ikke hastighed fra den lagrede u/v-vektor.');
if(!/row\.currentDirectionDeg=round\(directionFromComponents\(storedU,storedV\),0\)/.test(source))failures.push('Berigelsen genberegner ikke retning fra den lagrede u/v-vektor.');
if(failures.length)throw new Error(failures.join('\n'));
console.log('OK: strømproveniens bruger én kanonisk lagret u/v-vektor til både hastighed og retning.');
