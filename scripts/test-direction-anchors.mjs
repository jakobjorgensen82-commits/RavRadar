import assert from 'node:assert/strict';
import { evaluateDirectionAnchors, buildCoastTransportExplanation } from '../js/core/direction-anchors.js';
import { calculateRavScore } from '../js/core/score-engine.js';

const zone={id:'TEST-BUGT',name:'Testbugt',coastType:'east',directionAnchors:[
 {id:'west',name:'Vestlige kystdel',onshoreDirectionDeg:270,weight:1,dataPoint:[10,56],pinPoint:[9.99,56]},
 {id:'south',name:'Sydlige kystdel',onshoreDirectionDeg:0,weight:1,dataPoint:[10,56],pinPoint:[10,56.01]}
]};
let evaluation=evaluateDirectionAnchors(zone,270);
assert.equal(evaluation.primaryAnchor.id,'west');
assert.ok(evaluation.effectiveAlignment>.8);
let text=buildCoastTransportExplanation(evaluation);
assert.match(text.summary,/Vestlige kystdel/);

evaluation=evaluateDirectionAnchors(zone,135);
assert.ok(evaluation.effectiveAlignment<=-.35,'strøm væk fra begge kystdele skal være negativ');
const score=calculateRavScore({mode:'beach',zone,weather:{windSpeedMps:2,waveHeightM:.2,currentSpeedMps:.3,currentDirectionDeg:135,windDirectionDeg:0,waterLevelTrendCm3h:0},history:{maxWind24hMps:4,maxWave24hM:.3,hoursSinceHighEnergy:72}});
assert.ok(score.components.transport<=42,'udgående strøm ved alle ankre skal begrænse transporten');
assert.equal(score.explanation.transportDiagnostics.directionAnchors.length,2);
console.log('Retningsankre og forklaring: bestået.');
