import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { modelSourceRelativeModuleSpecifiers } from './lib/model-source-imports.mjs';
import * as currentImportContract from './lib/model-source-imports.mjs';
import { SOURCE599_CODE_SOURCE_PROVENANCE, SOURCE601_ORIGINAL_DATA_PROFILE } from './check-assistant-later-h0-predecessor-source.mjs';
import { exactRelativeModuleSpecifiers } from './lib/static-module-closure.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = source => crypto.createHash('sha256').update(source).digest('hex');
const normalized = source => source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const pins = [
  ['scripts/lib/established-native-current-origin.mjs', 'e4741332e9cc54523fccf8ded70ace9767047d97090306c00fafd43385235c42', 14],
  ['scripts/check-native-current-reanalysis-predecessor-source.mjs', '1c08778a28bc3931b42430eaa94d9659dd279f42528c5306631b971c4405928d', 0],
  ['scripts/protected-private-production-runtime.mjs', 'e41b0434e14dd181c5ca3f6313456274c4fa5fcc9e97029e49f300ae0d4e4762', 6],
  ['scripts/private-production-runtime-bundle.mjs', '2eeff25c6d6e769c7a5d9b414bfed574e0105e7cb24d0bd1578e7700781d5529', 3],
];

// Fixed input context of these already committed historical oracles. This is
// neither a current-head cohort nor runtime/source reuse authority.
const HISTORICAL_IMPORT_ORACLE_HEAD='7b467bbfc81b2ddf6aa682cf1fbee8ccbe778429';
const HISTORICAL_IMPORT_ORACLE_BLOBS=Object.freeze({
  "scripts/lib/established-native-current-origin.mjs": "1e2deef9d5e8a42f10c3e676ceabf13d6abffbc5",
  "scripts/check-native-current-reanalysis-predecessor-source.mjs": "b667aed90891a0677a0a7a40d99905fadffb2429",
  "scripts/protected-private-production-runtime.mjs": "60a9aa7c6db50a12d89b5071e7b782b817a5f65b",
  "scripts/private-production-runtime-bundle.mjs": "2b704bb13e11a8cea511f1c6c15e72042ac14a51",
  "scripts/lib/model-source-imports.mjs": "5eb753b281a812b6afc2fafe875a8b7f87773f69",
  "scripts/lib/static-module-closure.mjs": "45461ab7495ec41dfa4fd601d0ce27b8a914075b"
});
const historicalImportBytesCache=new Map();
function historicalImportBytes(file){
  assert(Object.hasOwn(HISTORICAL_IMPORT_ORACLE_BLOBS,file));
  if(!historicalImportBytesCache.has(file)){
    const raw=execFileSync('git',['-C',ROOT,'cat-file','blob',HISTORICAL_IMPORT_ORACLE_HEAD+':'+file],{
      encoding:null,timeout:30000,maxBuffer:2*1024*1024,
      env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'},
    });
    const blob=crypto.createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');
    assert.equal(blob,HISTORICAL_IMPORT_ORACLE_BLOBS[file],'Whole original Git blob');
    historicalImportBytesCache.set(file,raw);
  }
  return historicalImportBytesCache.get(file);
}
let historicalImportOraclePromise;
async function historicalImportOracle(){
  return historicalImportOraclePromise??=(async()=>{
    const lexer=historicalImportBytes('scripts/lib/static-module-closure.mjs');
    const lexerUrl='data:text/javascript;base64,'+lexer.toString('base64');
    const raw=historicalImportBytes('scripts/lib/model-source-imports.mjs');
    const original=raw.toString('utf8');assert.deepEqual(Buffer.from(original),raw);
    const declaration="import { exactRelativeModuleSpecifiers } from './static-module-closure.mjs';";
    assert.equal(original.split(declaration).length,2);
    const replacement='import { exactRelativeModuleSpecifiers } from '+JSON.stringify(lexerUrl)+';';
    const executable=original.replace(declaration,()=>replacement);
    assert.deepEqual(Buffer.from(executable.replace(replacement,()=>declaration)),raw,'Whole original reader import inverse');
    const reader=await import('data:text/javascript;base64,'+Buffer.from(executable).toString('base64'));
    const scanner=await import(lexerUrl);
    return Object.freeze({modelSourceRelativeModuleSpecifiers:reader.modelSourceRelativeModuleSpecifiers,
      exactRelativeModuleSpecifiers:scanner.exactRelativeModuleSpecifiers,
      source:file=>historicalImportBytes(file).toString('utf8')});
  })();
}

test('only complete reviewed model leaves use their exact frozen inventories', async () => {
  const oracle=await historicalImportOracle();
  const {modelSourceRelativeModuleSpecifiers}=oracle;
  for (const [file, pin, count] of pins) {
    const source = normalized(oracle.source(file));
    assert.equal(sha(source), pin);
    const imports = modelSourceRelativeModuleSpecifiers(source, file);
    assert.equal(imports.length, count); assert(Object.isFrozen(imports));
    assert.equal(new Set(imports).size, count);
    assert(imports.every(value => value.startsWith('./') || value.startsWith('../')));
    assert.deepEqual(modelSourceRelativeModuleSpecifiers('\uFEFF' + source.replaceAll('\n', '\r\n'), file), imports);
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source + '\n// changed byte\n', file), /Whole reviewed model import source changed/);
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source + "\nimport './hidden.mjs';\n", file), /Whole reviewed model import source changed/);
  }
});

test('reviewed origin inventory is the whole static graph plus its fixed historical read', async () => {
  const oracle=await historicalImportOracle();
  const {modelSourceRelativeModuleSpecifiers,exactRelativeModuleSpecifiers}=oracle;
  const file = pins[0][0], source = normalized(oracle.source(file));
  const dynamic = 'import(pathToFileURL(path.join(sourceRoot, file)).href)';
  assert.equal(source.split(dynamic).length, 2);
  // Remove ONLY the reviewed immutable-root import to let the UNCHANGED
  // lexer independently enumerate every ordinary relative import.
  const ordinary = exactRelativeModuleSpecifiers(source.replace(dynamic, "import('node:fs')"), file);
  assert.deepEqual([...modelSourceRelativeModuleSpecifiers(source, file)].sort(), [...ordinary].sort());
  assert.throws(() => modelSourceRelativeModuleSpecifiers(source, 'scripts/lib/not-the-reviewed-origin.mjs'),
    /non-literal or unparsed dynamic import/);
});

test('unknown modules retain every exact lexer positive and rejection', () => {
  for (const source of ["import { x } from './one.mjs'; export { y } from '../two.js';",
    "const x = import('./literal.mjs');", "const s = `not an import ${1 + 2}`;", '/import\\(/.test("text");'])
    assert.deepEqual(modelSourceRelativeModuleSpecifiers(source, 'ordinary.mjs'), exactRelativeModuleSpecifiers(source, 'ordinary.mjs'));
  for (const source of ['import(variable)', "import('./x.mjs' + suffix)", 'import(`./${name}.mjs`)', 'import(unknown.path)']) {
    assert.throws(() => exactRelativeModuleSpecifiers(source, 'ordinary.mjs'));
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source, 'ordinary.mjs'));
  }
});

test('both normal builders differ only by the explicit shared import-inventory call', async () => {
  for (const file of ['scripts/build-ravscore-model-bundle.mjs', 'scripts/build-candidate-g-rollback-bundle.mjs']) {
    const before = normalized(execFileSync('git', ['-C', ROOT, 'show', 'd7b31aa3c706e2f657fe5de99c56434f3cff260d:' + file],
      { encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 }));
    const after = qualifiedImportSource(SOURCE601_ORIGINAL_DATA_PROFILE.head,file);
    const current = normalized(await fs.readFile(path.join(ROOT, file), 'utf8'));
    const declaration = "import { modelSourceRelativeModuleSpecifiers } from './lib/model-source-imports.mjs';";
    assert.equal(after.split(declaration).length, 2);
    assert.equal(current.split(declaration).length, 2);
    assert.equal(current.split('modelSourceRelativeModuleSpecifiers(').length, 2);
    let inverse = after.replace(declaration, "import { exactRelativeModuleSpecifiers } from './lib/static-module-closure.mjs';");
    assert.equal(inverse.split('modelSourceRelativeModuleSpecifiers(').length, 2);
    inverse = inverse.replace('modelSourceRelativeModuleSpecifiers(', 'exactRelativeModuleSpecifiers(');
    assert.equal(inverse, before);
  }
});


// Current599 registration is checked on the raw current owners. Its entire
// reconstructed before-image is the already qualified599 source, not a head cohort.
const current599ImportOwners = Object.freeze([
  'scripts/check-assistant-later-h0-predecessor-source.mjs',
  'scripts/lib/authenticated-frozen586-predecessor.mjs',
  'scripts/lib/established-native-current-origin.mjs',
  'scripts/assistant-later-h0-binding-prewrite.mjs',
]);
function qualifiedImportSource(head,file) {
  return normalized(execFileSync('git', ['-C', ROOT, 'cat-file', 'blob',
    head + ':' + file], {encoding:'utf8',timeout:30000,
      maxBuffer:2*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',
        GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}}));
}

test('genuine599 registry reconstructs the whole existing after598 source and import rule', async () => {
  for (const file of current599ImportOwners) {
    const source=qualifiedImportSource(SOURCE601_ORIGINAL_DATA_PROFILE.head,file);
    const original=qualifiedImportSource(SOURCE599_CODE_SOURCE_PROVENANCE.head,file);
    const expected=modelSourceRelativeModuleSpecifiers(original,file);
    // This is the actual old failing normal call, before using the projection.
    const actual=modelSourceRelativeModuleSpecifiers(source,file);
    assert.deepEqual(actual,expected);assert(Object.isFrozen(actual));
    const reconstructed=currentImportContract.assistantAfter599RegisterImportBeforeSource(source,file);
    assert.equal(reconstructed,original,'Whole qualified before, including all old profiles, generic loader and cleanup');
    assert.deepEqual(modelSourceRelativeModuleSpecifiers(reconstructed,file),expected);
    assert.deepEqual(modelSourceRelativeModuleSpecifiers('\uFEFF'+source.replaceAll('\n','\r\n'),file),expected);
    assert.throws(()=>currentImportContract.assistantAfter599RegisterImportBeforeSource(original,file),/AFTER599_REGISTER/);
  }
});

test('genuine599 registry rejects missing duplicate wrong register imports and loader drift', async () => {
  let checked=0;
  for (const file of current599ImportOwners.slice(0,2)) {
    const source=qualifiedImportSource(SOURCE601_ORIGINAL_DATA_PROFILE.head,file);
    const isCode=file.startsWith('scripts/check-');
    const declaration=isCode?'const source599Code=fixedSource(SOURCE599_CODE_PROFILE);'
      :'const sourceSnapshot599=fixedSnapshot(SOURCE_FROZEN599);';
    assert.equal(source.split(declaration).length,2);
    const changed=(before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,after);};
    const mutants=[
      changed(declaration,''),
      source+'\n'+declaration+'\n',
      isCode?changed(SOURCE599_CODE_SOURCE_PROVENANCE.head,'0'.repeat(40))
        :changed('withSource:withSource599OriginalDataSource,','withSource:withSource598OriginalDataSource,'),
      source+"\nimport './unreviewed-current-edge.mjs';\n",
      source+"\nconst unreviewed=import('./unreviewed-current-edge.mjs');\n",
      source+"\nconst unreviewed=import(unknown.path);\n",
      source+"\nconst unreviewed=import('node:fs');\n",
      source+'\n// unexplained old-body drift\n',
    ];
    if(isCode){
      mutants.push(changed("Buffer.from(executableModel).toString('base64')","Buffer.from(executableModel+'// changed loader').toString('base64')"));
      mutants.push(changed('for(const file of files)await fs.unlink(path.join(root,file));','for(const file of files)await fs.unlink(path.join(root,file)).catch(()=>{});'));
      mutants.push(changed('const SOURCE598_CODE_PROFILE=Object.freeze({','const SOURCE598_CODE_PROFILE=Object.freeze({\n// changed old profile\n'));
      mutants.push(changed('  if(profile===SOURCE599_CODE_PROFILE)assertSource599CodeSourceSelected();',''));
      mutants.push(changed('const SOURCE_599_ASSERTION_SUFFIX=String.raw`','const SOURCE_599_ASSERTION_SUFFIX=String.raw`\n${import(unknown.path)}'));
    }else{
      mutants.push(changed('const conditionsMaximum=profile===FROZEN591','const conditionsMaximum=profile===FROZEN586'));
      mutants.push(changed("assertionExport:'assertSource599OriginSnapshotData'","assertionExport:'assertSource598OriginSnapshotData'"));
      mutants.push(changed('const SOURCE_FROZEN598=Object.freeze({','const SOURCE_FROZEN598=Object.freeze({\n// changed old capability\n'));
    }
    for(const mutant of mutants){
      assert.notEqual(mutant,source);
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(mutant,file));
      checked++;
    }
  }
  assert.equal(checked,24);
});


test('current registered import owners remain raw current inputs with their current guards', async () => {
  for(const file of [...pins.map(row=>row[0]),...current599ImportOwners]){
    const source=qualifiedImportSource(SOURCE601_ORIGINAL_DATA_PROFILE.head,file);
    const imports=modelSourceRelativeModuleSpecifiers(source,file);
    assert(Object.isFrozen(imports));assert.equal(new Set(imports).size,imports.length);
    assert(imports.every(value=>value.startsWith('./')||value.startsWith('../')));
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n// changed current owner\n',file),/Whole reviewed model import source changed/);
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+"\nimport './unreviewed-current-edge.mjs';\n",file),/Whole reviewed model import source changed/);
  }
});

test('genuine599 archived origin and prewrite reject missing duplicate foreign register and new imports',()=>{
  for(const file of current599ImportOwners.slice(2)){
    const source=qualifiedImportSource(SOURCE601_ORIGINAL_DATA_PROFILE.head,file);
    const declaration=file.endsWith('binding-prewrite.mjs')?'export function assistantAfter599PrewritePredecessor(){'
      :'const ASSISTANT_AFTER599_ORIGINAL599=Object.freeze({';
    assert.equal(source.split(declaration).length,2);
    const mutants=[source.replace(declaration,''),source+'\n'+declaration,
      source.replace('readAuthenticatedSource599Predecessor','readAuthenticatedSource598Predecessor'),
      source+"\nimport './unknown-owner.mjs';\n",source+"\nimport(unknown.path);\n",
      source+"\nimport('node:fs');\n",source+'\n// unexplained control drift\n'];
    for(const changed of mutants)assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file));
  }
});

test('normal 601 capsule owners use the declared closure and reject extra runtime imports',async()=>{
  const currentCapsuleOwners=current599ImportOwners.slice(0,3);
  for(const file of currentCapsuleOwners){
    const source=normalized(await fs.readFile(path.join(ROOT,file),'utf8'));
    const archived=qualifiedImportSource(SOURCE601_ORIGINAL_DATA_PROFILE.head,file);
    const expected=[...modelSourceRelativeModuleSpecifiers(archived,file)];
    if(file===currentCapsuleOwners[2])expected.push('../check-assistant-later-h0-predecessor-source.mjs');
    const actual=modelSourceRelativeModuleSpecifiers(source,file);
    assert(Object.isFrozen(actual));
    assert.deepEqual([...actual].sort(),[...expected].sort());
    for(const extra of ["import(unknown.path);","import('./foreign-runtime.mjs');","import './foreign-runtime.mjs';","import 'file:///foreign-runtime.mjs';"]){
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n'+extra,file));
    }
    if(file===currentCapsuleOwners[0]){
      const dynamic='import(verifiedLeafUrl.href)';
      assert.equal(source.split(dynamic).length,2);
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n'+dynamic+';',file),/unparsed dynamic import/);
      const substitutions=[
        ['pathToFileURL(verifiedLeaf)','new URL("file:///overridden.mjs")'],
        ['await exactTree(root,[...written].sort(),index,gitReference);',''],
        ['DECLARED_MODULES.includes(file)&&written.has(file)','true'],
        ['path.resolve(root,file)','path.resolve("unverified",file)'],
      ];
      for(const [before,after] of substitutions){
        assert(source.includes(before));
        assert.throws(()=>modelSourceRelativeModuleSpecifiers(source.replace(before,after),file),/unparsed dynamic import/);
      }
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(source.replace(dynamic,'import(unverified.href)'),file),/unparsed dynamic import/);
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(source,'scripts/check-unreviewed-host.mjs'),/unparsed dynamic import/);
    }
    if(file===currentCapsuleOwners[2]){
      const substitutions=[
        ['path.join(sourceRoot, file)','path.join(process.cwd(), file)'],
        [".includes(file), 'SEED_ARCHIVE_MODULE'",".includes(file) || true, 'SEED_ARCHIVE_MODULE'"],
        ['withAuthenticated584PredecessorSource(async frozenRoot','withAuthenticated585PredecessorSource(async frozenRoot'],
        ['established-native-current-origin-585-assertion.mjs','unknown-original-assertion.mjs'],
        ['withAuthenticated585PredecessorSource } from','forgedArchiveHost as withAuthenticated585PredecessorSource } from'],
        ["import('./ravscore-production-part-pipeline.mjs')","import('node:fs')"],
      ];
      for(const [before,after] of substitutions){
        assert(source.includes(before));
        assert.throws(()=>modelSourceRelativeModuleSpecifiers(source.replace(before,after),file));
      }
      const shadow="function unexpected(withAuthenticated585PredecessorSource) {}";
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n'+shadow,file),/shadowed verified archive owner/);
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n'+shadow.replace('585','58\\u0035'),file),
        /shadowed verified archive owner/);
    }
  }
});

test('current binding prewrite can use the declared capsule callback without an extra code edge',()=>{
  const file=current599ImportOwners[3],archived=qualifiedImportSource(SOURCE601_ORIGINAL_DATA_PROFILE.head,file);
  const oldCallback=`ACTIVE_PREDECESSOR.withSource(async frozenRoot=>{
    const load=file=>import(pathToFileURL(path.join(frozenRoot,file)).href);`;
  assert.equal(archived.split(oldCallback).length,2);
  const current=archived.replace(oldCallback,'ACTIVE_PREDECESSOR.withSource(async (frozenRoot,load)=>{');
  assert.deepEqual([...modelSourceRelativeModuleSpecifiers(current,file)].sort(),
    [...modelSourceRelativeModuleSpecifiers(archived,file)].sort());
  assert.throws(()=>modelSourceRelativeModuleSpecifiers(current+"\nimport(unknown.path);",file));
});
