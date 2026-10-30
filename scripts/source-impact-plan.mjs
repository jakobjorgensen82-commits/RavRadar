import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {buildSourceValidationPlan,expandSourceCommands} from './validate-source-once.mjs';

// Planning only. The caller cannot select a cheap mode or supply commands.
// Complete Git-diff acquisition and qualified-baseline proof are NOT issued here.
const scripts=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).scripts;
const normal=buildSourceValidationPlan(scripts);
const full=[...normal.preflight,...normal.remaining,normal.gate];
const common=['validate:release-version','test:module-version-closure','test:security-hardening'];
const aboutKeys=['about.header','about.meta.title','about.meta.description','about.portrait.alt',
  'about.family.alt','about.principles.aria','about.score.aria','about.explainer'];
const learnKeys=['learn.header','learn.meta.title','learn.meta.description','learn.illustration.aria',
  'learn.hero','learn.nav','learn.quick','learn.amber','learn.sea','learn.coast','learn.signs',
  'learn.hunt','learn.sequence','learn.score','learn.knowledge','learn.glossary','learn.finish'];
const textFiles=new Map([
  ['js/ui/about-i18n.js',['about-text', 'b48543519a8d1e853eea7044399c77d56ffa18c5e7285e3559cd671a02a1dc95',aboutKeys]],
  ['js/ui/about-explainer-i18n.js',['about-text','52e22388e3dec455b415480ee20aae6e279a1b14a7c903cefb126b794f12e99d',aboutKeys]],
  ['js/ui/learn-i18n.js',['learning-text','d7a117151f0342d71101668f073ebe3706f1077cc7dd6fc01617492b9f7cb485',learnKeys]],
  ['js/ui/learn-i18n-de.js',['learning-text','1d20d3c3e18ebf7291657e6250c81b9f758198bcfbbad429518558cc93db26ef',learnKeys]],
  ['js/ui/learn-i18n-en.js',['learning-text','a5f3f2c4bfcbce04cd7d0b8ef6ed12cd6ebc408102c781892a5b97292957e0d2',learnKeys]],
]);
const targets={
  documentation:['validate:rdks','test:handbook-plain-language','test:handbook-review-archive'],
  'about-text':['test:public-about','test:public-i18n-assistant'],
  'learning-text':['test:public-learning','test:public-i18n-assistant'],
};
const documents=new Set(['CHANGELOG.md','HANDBOOK-RAVRADAR.md','docs/ai/CODEX_START_HERE.md',
  'docs/rdks/00_READ_FIRST.md','docs/rdks/01_AI_OPERATING_RULES.md','docs/rdks/MASTER_LOG.md',
  'docs/rdks/90_INDEX/CURRENT_TRUTH.md','docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md',
  'docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md','docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md',
  'docs/rdks/10_DECISIONS/DEC-0045-COST-AWARE-TEST-MATRIX.md',
  'docs/rdks/10_DECISIONS/DEC-0301-NORMAL-CONDITIONS-READERS-PRODUCER-CAPACITY-593.md']);
export const SOURCE_IMPACT_KNOWN_TEXT_PATHS=Object.freeze([...textFiles.keys(),...documents].sort());
const normalize=text=>text.replace(/\r\n/g,'\n');
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');

// Only the listed message VALUE regions are replaceable. Everything else,
// including imports, keys, selectors, routes and JS bodies, stays byte-exact.
function regions(source,allowed){
  const pattern=/'([A-Za-z0-9_.:-]+)'\s*:\s*(['"`])/g,values=[];
  let shape='',cursor=0,match;
  while((match=pattern.exec(source))){
    if(!allowed.includes(match[1]))continue;
    const start=pattern.lastIndex,quote=match[2];let end=start;
    for(;end<source.length;end++){
      if(source[end]==='\\'){end++;continue;}
      if(source[end]===quote)break;
      if(quote!=='`'&&/[\r\n]/.test(source[end]))return null;
    }
    if(end===source.length)return null;
    const value=source.slice(start,end);
    if(value.includes('${'))return null;
    values.push(value);shape+=source.slice(cursor,start)+'<reviewed-message-text>';
    cursor=end;pattern.lastIndex=end+1;
  }
  return {shape:shape+source.slice(cursor),values};
}
function markup(value){
  const tags=[];let start=value.indexOf('<');
  while(start!==-1){
    let end=start+1,quote=null;
    if(value.startsWith('<!--',start)){
      end=value.indexOf('-->',start+4);if(end===-1)return null;end+=2;
    }else for(;end<value.length;end++){
      const char=value[end];
      if(quote){if(char===quote)quote=null;}
      else if(char==='"'||char==="'")quote=char;
      else if(char==='>')break;
    }
    if(end===value.length)return null;
    tags.push(value.slice(start,end+1));start=value.indexOf('<',end+1);
  }
  return tags;
}
function reviewedFrame(region){
  const security=value=>[markup(value),
    value.match(/(?:https?|mailto|javascript|data):[^\s<>"']*/gi)??[],
    value.match(/\\(?:u\{[a-fA-F0-9]+\}|u[a-fA-F0-9]{4}|x[a-fA-F0-9]{2}|[^\r\n])/g)??[]];
  return sha(JSON.stringify([region.shape,region.values.map(security)]));
}
function isReviewedTextChange(change,profile){
  const before=normalize(change.before),after=normalize(change.after);
  const a=regions(before,profile[2]),b=regions(after,profile[2]);
  if(!a||!b||a.shape!==b.shape||a.values.length!==b.values.length)return false;
  if(reviewedFrame(a)!==profile[1]||reviewedFrame(b)!==profile[1])return false;
  return a.values.every((old,index)=>{
    const next=b.values[index];if(old===next)return true;
    // No new JS escapes, interpolation or markup/attribute edits masquerading
    // as copy. Existing quote/escape-heavy regions require the full plan.
    if(old.includes('\\')||next.includes('\\'))return false;
    const urls=value=>value.match(/(?:https?|mailto|javascript|data):[^\s<>"']*/gi)??[];
    if(JSON.stringify(urls(old))!==JSON.stringify(urls(next)))return false;
    const oldTags=markup(old),newTags=markup(next);
    return oldTags!==null&&newTags!==null&&JSON.stringify(oldTags)===JSON.stringify(newTags);
  });
}
function result(kind,profiles,reasons){
  const selected=kind==='TARGETED'
    ? [...new Set([...common,...profiles.flatMap(profile=>targets[profile])]
      .flatMap(name=>expandSourceCommands(scripts,name)))]:[...full];
  return {schemaVersion:1,kind:'RAVRADAR_PRIVATE_SOURCE_IMPACT_PLAN_V1',selection:kind,
    profiles,commands:selected,reasons,
    database:{status:kind==='TARGETED'?'NOT_APPLICABLE':'REQUIRED',executed:false,
      reason:kind==='TARGETED'?'Only reviewed non-executable text regions changed; no database/model/state input selected.'
        :'Protected, shared, unsupported or unproven impact requires the normal deep database decision.'},
    national:{status:kind==='TARGETED'?'NOT_APPLICABLE':'REQUIRED',executed:false},
    authority:'PLANNING_ONLY',completeGitDiffVerified:false,qualifiedBaselineVerified:false,
    ordinaryWeatherChanged:false,normalFullSourceCommandCount:full.length};
}
export function planSourceImpact(changes){
  assert.equal(arguments.length,1,'No mode, command or dependency-omission override');
  assert(Array.isArray(changes),'Complete canonical change rows required');
  const seen=new Set(),profiles=new Set(),reasons=[];
  for(const row of changes){
    assert(row&&Object.getPrototypeOf(row)===Object.prototype,'Plain change row required');
    assert.deepEqual(Object.keys(row).sort(),['after','afterMode','before','beforeMode','path']);
    assert(typeof row.path==='string'&&/^[A-Za-z0-9_./-]+$/.test(row.path)
      &&!row.path.startsWith('/')&&!row.path.includes('//')
      &&!row.path.split('/').some(part=>part==='.'||part==='..'),'Canonical relative path required');
    assert(!seen.has(row.path),'Duplicate paths cannot hide changes');seen.add(row.path);
    for(const key of ['before','after'])assert(row[key]===null||typeof row[key]==='string');
    for(const key of ['beforeMode','afterMode'])assert(/^(?:100644|100755|120000|160000|000000)$/.test(row[key]));
    if(row.before===null||row.after===null||row.beforeMode!=='100644'||row.afterMode!=='100644'){
      reasons.push('new-deleted-unread-or-nonregular-mode:'+row.path);continue;
    }
    if(row.before.includes('\0')||row.after.includes('\0')){reasons.push('binary-or-unknown-content:'+row.path);continue;}
    if(row.before===row.after){reasons.push('unproven-changed-row:'+row.path);continue;}
    const text=textFiles.get(row.path);
    if(text){
      if(isReviewedTextChange(row,text))profiles.add(text[0]);
      else reasons.push('outside-reviewed-message-text:'+row.path);
    }else if(documents.has(row.path))profiles.add('documentation');
    else reasons.push('protected-shared-or-unsupported:'+row.path);
  }
  if(!changes.length)reasons.push('empty-list-does-not-prove-complete-diff');
  return result(reasons.length?'FULL':'TARGETED',[...profiles].sort(),reasons);
}
