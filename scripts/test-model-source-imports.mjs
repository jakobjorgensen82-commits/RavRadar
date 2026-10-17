import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { modelSourceRelativeModuleSpecifiers } from './lib/model-source-imports.mjs';
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

test('only complete reviewed model leaves use their exact frozen inventories', async () => {
  for (const [file, pin, count] of pins) {
    const source = normalized(await fs.readFile(path.join(ROOT, file), 'utf8'));
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
  const file = pins[0][0], source = normalized(await fs.readFile(path.join(ROOT, file), 'utf8'));
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
    const after = normalized(await fs.readFile(path.join(ROOT, file), 'utf8'));
    const declaration = "import { modelSourceRelativeModuleSpecifiers } from './lib/model-source-imports.mjs';";
    assert.equal(after.split(declaration).length, 2);
    let inverse = after.replace(declaration, "import { exactRelativeModuleSpecifiers } from './lib/static-module-closure.mjs';");
    assert.equal(inverse.split('modelSourceRelativeModuleSpecifiers(').length, 2);
    inverse = inverse.replace('modelSourceRelativeModuleSpecifiers(', 'exactRelativeModuleSpecifiers(');
    assert.equal(inverse, before);
  }
});
