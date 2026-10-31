import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planSourceImpact as plan} from './source-impact-plan.mjs';
import {buildSourceValidationPlan,expandSourceCommands} from './validate-source-once.mjs';
const scripts=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).scripts;
const normal=buildSourceValidationPlan(scripts);
const full=[...normal.preflight,...normal.remaining,normal.gate];
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const row=(path,before,after)=>({path,before,after,beforeMode:'100644',afterMode:'100644'});
const about=read('js/ui/about-i18n.js'),article=read('js/ui/about-explainer-i18n.js');
const learn=read('js/ui/learn-i18n-en.js');
const learnDa=read('js/ui/learn-i18n.js'),learnDe=read('js/ui/learn-i18n-de.js');
const currentI18nImport=/from '(\.\.\/i18n\.js\?v=4\.0\.\d+)';/.exec(about)?.[1];
assert.equal(typeof currentI18nImport,'string','The negative import fixture must bind the actual current import');
assert.equal(about.split(currentI18nImport).length,2,'Exactly one current main i18n import');
let count=0;
function targeted(rows,expected){
  const p=plan(rows);assert.equal(p.selection,'TARGETED');assert.deepEqual(p.profiles,expected);
  assert.equal(p.database.status,'NOT_APPLICABLE');assert.equal(p.database.executed,false);
  assert.equal(p.authority,'PLANNING_ONLY');assert.equal(p.completeGitDiffVerified,false);
  assert.equal(p.qualifiedBaselineVerified,false);assert(p.commands.length<full.length);
  assert.equal(p.ordinaryWeatherMutatedByPlanner,false);
  assert(!Object.hasOwn(p,'ordinaryWeatherChanged'),'Planning must not claim the candidate leaves weather unchanged');
  assert(p.commands.includes(expandSourceCommands(scripts,'validate:release-version')[0]));
  assert.equal(new Set(p.commands).size,p.commands.length);count++;return p;
}
function fallback(rows){const p=plan(rows);assert.equal(p.selection,'FULL');assert.deepEqual(p.commands,full);
  assert.equal(p.ordinaryWeatherMutatedByPlanner,false);assert(!Object.hasOwn(p,'ordinaryWeatherChanged'));
  assert.equal(p.database.status,'REQUIRED');assert.equal(p.database.executed,false);count++;}
targeted([row('js/ui/about-i18n.js',about,about.replace("'about.header':'Om projektet'","'about.header':'Om RavRadar'"))],['about-text']);
const secondText=about.replace("'about.header':'Om projektet'","'about.header':'Om RavRadar'");
targeted([row('js/ui/about-i18n.js',secondText,secondText.replace("'about.header':'Om RavRadar'","'about.header':'Sådan arbejder RavRadar'"))],['about-text']);
targeted([row('js/ui/about-explainer-i18n.js',article,article.replace('Wo sind die Bedingungen','Wo sind heute die Bedingungen'))],['about-text']);
targeted([row('js/ui/learn-i18n-en.js',learn,learn.replace('Learn amber hunting – RavRadar','Learn amber hunting with RavRadar'))],['learning-text']);
targeted([row('js/ui/learn-i18n.js',learnDa,learnDa.replace("'learn.header':'Grundbog i ravjagt'","'learn.header':'Ravjagtens grundbog'"))],['learning-text']);
targeted([row('js/ui/learn-i18n-de.js',learnDe,learnDe.replace("'learn.header':'Handbuch der Bernsteinsuche'","'learn.header':'Grundwissen zur Bernsteinsuche'"))],['learning-text']);
// The two exact reviewed release frames remain independent. These fixtures
// exercise genuine593 shapes verified against34cf during pin derivation;
// the planner never strips versions or approves a current release generically.
for(const [path,current,oldText,newText,profile]of [
  ['js/ui/about-i18n.js',about,"'about.header':'Om projektet'","'about.header':'Om RavRadar'",'about-text'],
  ['js/ui/about-explainer-i18n.js',article,'Wo sind die Bedingungen','Wo sind heute die Bedingungen','about-text'],
  ['js/ui/learn-i18n.js',learnDa,"'learn.header':'Grundbog i ravjagt'","'learn.header':'Ravjagtens grundbog'",'learning-text'],
  ['js/ui/learn-i18n-de.js',learnDe,"'learn.header':'Handbuch der Bernsteinsuche'","'learn.header':'Grundwissen zur Bernsteinsuche'",'learning-text'],
  ['js/ui/learn-i18n-en.js',learn,'Learn amber hunting – RavRadar','Learn amber hunting with RavRadar','learning-text'],
]){
  const previous=current.replaceAll('?v=4.0.594','?v=4.0.593');
  assert.notEqual(previous,current,'The known594-to593 fixture must change actual imports');
  const previousCopy=previous.replace(oldText,newText),currentCopy=current.replace(oldText,newText);
  assert.notEqual(previousCopy,previous);assert.notEqual(currentCopy,current);
  targeted([row(path,previous,previousCopy)],[profile]);
  fallback([row(path,previous,currentCopy)]);
  const unknown=current.replaceAll('?v=4.0.594','?v=4.0.999');
  assert.notEqual(unknown,current);fallback([row(path,unknown,unknown.replace(oldText,newText))]);
  if(current.split('?v=4.0.594').length>2){
    const mixed=current.replace('?v=4.0.594','?v=4.0.593');
    assert.notEqual(mixed,current);assert.notEqual(mixed,previous);
    fallback([row(path,mixed,mixed.replace(oldText,newText))]);
  }
}
const docs=row('docs/rdks/90_INDEX/CURRENT_TRUTH.md','# Old\n','# New\n');
targeted([docs],['documentation']);
targeted([docs,row('js/ui/learn-i18n-en.js',learn,learn.replace('Learn amber hunting – RavRadar','Amber hunting – RavRadar'))],['documentation','learning-text']);
for(const path of ['supabase/migrations/20261030105202_x.sql','supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
  'js/core/ravscore-current-supply-memory.js','scripts/assistant-later-h0-runtime-transition.mjs',
  'scripts/lib/checkpoint-cas-native-postgres.mjs','data/current-source-policy.json','package.json',
  '.github/workflows/validate-pull-request.yml','js/i18n.js','style.css','app.js','unknown.txt',
  'docs/runtime-generated.md','docs/rdks/unknown.md']){
  fallback([docs,row(path,'old','new')]);
}
for(const after of [
  about.replace(currentI18nImport,currentI18nImport.replace('../i18n.js','../other.js')),
  about.replace('initialiseI18n();','initialiseI18n();fetch("/other");'),
  about.replace('initialiseI18n();','initialiseI18n("#other-selector");'),
  about.replace("'about.header'","'about.other'"),
  about.replace("'about.header':'Om projektet'","'about.header':'<script>run()</script>'"),
  about.replace("'about.header':'Om projektet'","'about.header':'\\x3cscript>run()'"),
  about.replace("'about.header':'Om projektet'","'about.header':'https://other.example/'"),
]){assert.notEqual(after,about,'Each negative changes the actual source');fallback([row('js/ui/about-i18n.js',about,after)]);}
fallback([row('js/ui/about-explainer-i18n.js',article,article.replace('class="rr-intro"','class="rr-intro" onclick="run()"'))]);
fallback([row('js/ui/about-explainer-i18n.js',article,article.replace('Wo sind die Bedingungen','${run()} Wo sind die Bedingungen'))]);
fallback([row('js/ui/about-explainer-i18n.js',article,article.replace('id="rr-explainer-title"','id="other-title"'))]);
fallback([row('js/ui/about-explainer-i18n.js',article.replace('id="rr-explainer-title"','id="unreviewed-title"'),
  article.replace('id="rr-explainer-title"','id="unreviewed-title"').replace('Wo sind die Bedingungen','Wo sind heute die Bedingungen'))]);
fallback([row('js/ui/about-i18n.js',about+'\n',about+'\nchanged')]);
fallback([{...docs,afterMode:'120000'}]);fallback([{...docs,before:null,beforeMode:'000000'}]);
fallback([{...docs,after:null,afterMode:'000000'}]);fallback([]);
fallback([{...docs,after:'binary\0content'}]);
for(const path of ['../supabase/a.sql','/tmp/a.md','docs/../x.md','docs//x.md','C:/x.md','docs/a.md\n']){
  assert.throws(()=>plan([{...docs,path}]));count++;
}
assert.throws(()=>plan([docs,docs]));count++;
assert.throws(()=>plan([docs],{skipDatabase:true}));count++;
assert.throws(()=>plan([{...docs,skipDatabase:true}]));count++;
console.log(JSON.stringify({kind:'PRIVATE_IMPACT_PLANNER_TARGET',cases:count,passed:count,failed:0,
  actualNormalSourceCommands:full.length,sourceCommandsExecuted:0,nativeSqlExecuted:false,
  completeGitDiffIntegration:false,qualifiedBaselineIntegration:false,production:false}));
