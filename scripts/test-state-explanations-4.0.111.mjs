import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildStateExplanation, evaluateTransportEvent } from '../js/core/coastal-process-model.js?v=4.0.111';

const inbound=buildStateExplanation({stateModelMode:'shadow-v1',eventPhase:'efterstorm/indtransport',strongEventDurationHours:7,hoursSinceStrongEventEnd:6,inboundCurrentDurationHours:5.5,inboundCurrentMomentum:61,outboundCurrentDurationHours:0,outboundCurrentPressure:0,currentDirectionStability:.86,mobilisationPotential:78,nearshorePotential:72});
assert.equal(inbound.phase,'efterstorm/indtransport');
assert.match(inbound.summary,/indadgående strøm/i);
assert.ok(inbound.facts.some(x=>/5,5 timer/i.test(x)));

const persistent=buildStateExplanation({stateModelMode:'shadow-v1',eventPhase:'vedvarende nærkystpotentiale',inboundCurrentDurationHours:3,inboundCurrentMomentum:48,outboundCurrentDurationHours:0,outboundCurrentPressure:0,mobilisationPotential:67,nearshorePotential:64});
assert.match(persistent.summary,/fortsat et nærkystpotentiale/i);

const outbound=buildStateExplanation({stateModelMode:'shadow-v1',eventPhase:'udtransport/nedbrydning',inboundCurrentDurationHours:0,inboundCurrentMomentum:0,outboundCurrentDurationHours:4,outboundCurrentPressure:58,mobilisationPotential:41,nearshorePotential:16});
assert.match(outbound.summary,/ført materiale væk fra kysten/i);

const event=evaluateTransportEvent({zone:{coastType:'east'},weather:{currentSpeedMps:.2,waveHeightM:.4,waterLevelTrendCm3h:2},history:{stateModelMode:'shadow-v1',eventPhase:'indtransport opbygges',inboundCurrentDurationHours:2,inboundCurrentMomentum:22,outboundCurrentDurationHours:0,outboundCurrentPressure:0,mobilisationPotential:35,nearshorePotential:30}});
assert.equal(event.stateExplanation.phase,'indtransport opbygges');

const ui=fs.readFileSync('js/ui/info-panel.js','utf8');
assert.match(ui,/Historisk tilstand/);
assert.match(ui,/ændrer endnu ikke den numeriske RavScore/);
const assistant=fs.readFileSync('js/services/rav-assistant.js','utf8');
assert.match(assistant,/Historisk tilstand:/);
console.log('✓ Historiske tilstandsforklaringer er aktive uden at ændre point');
