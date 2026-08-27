import fs from 'node:fs';
import path from 'node:path';

const expected = new Map([
  ['actions/checkout', 'v7'],
  ['actions/cache/restore', 'v6'],
  ['actions/cache/save', 'v6'],
  ['actions/setup-node', 'v7'],
  ['actions/setup-python', 'v7'],
  ['actions/upload-artifact', 'v7'],
  ['actions/download-artifact', 'v8'],
  ['actions/configure-pages', 'v6'],
  ['actions/upload-pages-artifact', 'v5'],
  ['actions/deploy-pages', 'v5'],
]);

const files = [];
for (const name of fs.readdirSync('.github/workflows')) {
  if (/\.ya?ml$/i.test(name)) files.push(path.join('.github/workflows', name));
}
for (const name of fs.readdirSync('scripts')) {
  if (/^test-.*\.(?:mjs|py)$/i.test(name)) files.push(path.join('scripts', name));
}

const seenInWorkflows = new Set();
let references = 0;
for (const file of files.sort()) {
  const text = fs.readFileSync(file, 'utf8').replaceAll('\\/', '/');
  const pattern = /actions\/(?:checkout|cache\/(?:restore|save)|setup-(?:node|python)|upload-artifact|download-artifact|configure-pages|upload-pages-artifact|deploy-pages|github-script)@v\d+/g;
  for (const reference of text.match(pattern) || []) {
    references += 1;
    const split = reference.lastIndexOf('@');
    const action = reference.slice(0, split);
    const version = reference.slice(split + 1);
    const wanted = expected.get(action);
    if (!wanted) throw new Error(file + ': ukendt officiel Action-reference ' + reference);
    if (version !== wanted) throw new Error(file + ': ' + action + ' skal bruge ' + wanted + ', ikke ' + version);
    if (file.startsWith('.github')) seenInWorkflows.add(action);
  }
}

for (const action of expected.keys()) {
  if (!seenInWorkflows.has(action)) throw new Error('Workflowinventaret mangler ' + action);
}
if (references < expected.size) throw new Error('For få Action-referencer blev kontrolleret.');

const localValidation = fs.readFileSync('scripts/validate-source.ps1', 'utf8');
if (!localValidation.includes('$dependencyCheck = "')) {
  throw new Error('Den lokale Python-afhængighedskontrol skal ligge i en eksplicit argumentvariabel.');
}
if (!localValidation.includes("names = ('requests', 'eccodes', 'shapely', 'pyproj', 'copernicusmarine', 'xarray', 'PIL')")) {
  throw new Error('Python-pakkenavne skal bruge citater, som Windows PowerShell bevarer.');
}
if (!localValidation.includes('& $python -c $dependencyCheck')) {
  throw new Error('Den lokale Python-afhængighedskontrol skal sendes som ét argument.');
}
if (/& \$python -c\s+'[^'\r\n]*"/.test(localValidation)) {
  throw new Error('Inline Python med dobbelte citater i et enkeltciteret PowerShell-argument er ikke Windows-kompatibelt.');
}
console.log('Officielle GitHub Action-versioner består på tværs af workflows og testkontrakter.');
