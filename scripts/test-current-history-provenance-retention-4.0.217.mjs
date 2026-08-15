import assert from 'node:assert/strict';
import { attachVerifiedCurrentToSample, retainWeatherHistory } from './lib/weather-history-retention.mjs';

const at0='2026-08-15T12:00:00.000Z';
const at1='2026-08-15T12:15:00.000Z';
const old={at:'2026-08-15T11:45:00.000Z',currentSpeedMps:.1,currentDirectionDeg:80,currentVerified:false};
const current={at:at0,currentSpeedMps:.2,currentDirectionDeg:170,currentVerified:false};
const verified={currentSpeedMps:.23,currentDirectionDeg:184,currentProvenance:{status:'verified'}};

const initial=retainWeatherHistory({samples72h:[old]},current,at0);
const samples24h=attachVerifiedCurrentToSample(initial.samples24h,verified,at0);
const samples72h=attachVerifiedCurrentToSample(initial.samples72h,verified,at0);
assert.equal(samples24h.at(-1).currentVerified,true,'24-timersvinduet mistede den aktuelle verifikation');
assert.equal(samples72h.at(-1).currentVerified,true,'72-timersvinduet mistede den aktuelle verifikation');
assert.equal(samples72h[0].currentVerified,false,'ældre uverificeret fortid blev omskrevet');

const next=retainWeatherHistory({samples24h,samples72h},{at:at1,currentSpeedMps:.3,currentDirectionDeg:190,currentVerified:false},at1);
assert.equal(next.samples72h.find(row=>row.at===at0)?.currentVerified,true,'verifikationen overlevede ikke næste 72-timersmerge');
const nextVerified=attachVerifiedCurrentToSample(next.samples72h,{currentSpeedMps:.31,currentDirectionDeg:191,currentProvenance:{status:'verified'}},at1);
assert.equal(nextVerified.filter(row=>row.currentVerified===true).length,2,'successive verificerede produktionsprøver akkumuleres ikke');

const rejected=attachVerifiedCurrentToSample(next.samples72h,{currentSpeedMps:.3,currentDirectionDeg:190,currentProvenance:{status:'unverified'}},at1);
assert.equal(rejected.find(row=>row.at===at1)?.currentVerified,false,'uverificeret strøm blev fejlagtigt godkendt');
console.log('OK: Verificeret DMI-strøm bevares i både 24- og 72-timershistorikken på tværs af successive kørsler.');
