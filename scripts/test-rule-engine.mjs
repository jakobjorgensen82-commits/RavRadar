import assert from 'node:assert/strict';
import { evaluateRules } from '../js/core/rule-engine.js';
const rules=[{id:'bonus',version:1,name:'Bonus',status:'active',kind:'bonus',knowledgeClass:'expert',confidence:'mellem',priority:1,geography:{scope:'zone',zoneIds:['z1']},conditions:{huntModes:['beach'],maxWindSpeedMps:10},effect:{scoreAdjustment:8,explanation:'Ekspertbonus'}}];
const result=evaluateRules({rules,zone:{id:'z1',coastType:'east'},mode:'beach',weather:{windSpeedMps:7},history:{},baseScore:71});
assert.equal(result.score,79);assert.equal(result.adjustment,8);assert.equal(result.matches.length,1);
const miss=evaluateRules({rules,zone:{id:'z2'},mode:'beach',weather:{windSpeedMps:7},history:{},baseScore:71});assert.equal(miss.score,71);
console.log('Rule engine bestået.');
