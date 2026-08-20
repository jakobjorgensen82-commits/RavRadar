import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
const out = path.resolve('release', `RavRadar-${pkg.version}.zip`);
const gitBase = ['-c', `safe.directory=${root.replaceAll('\\', '/')}`];
const runGit = (args, options = {}) => spawnSync('git', [...gitBase, ...args], options);

const headPackageResult = runGit(['show', 'HEAD:package.json'], { encoding: 'utf8' });
if (headPackageResult.status !== 0) {
  throw new Error('Kunne ikke læse package.json fra HEAD. Commit releasekandidaten før pakning.');
}
const headPackage = JSON.parse(headPackageResult.stdout);
if (headPackage.version !== pkg.version) {
  throw new Error(`Arbejdstræets version ${pkg.version} matcher ikke HEAD ${headPackage.version}. Commit releasekandidaten før pakning.`);
}

const list = runGit(['ls-tree', '-r', '--name-only', 'HEAD'], { encoding: 'utf8' });
if (list.status !== 0) throw new Error('Kunne ikke læse den committede releasefil-liste.');
const files = list.stdout.split(/\r?\n/).filter(Boolean);
const forbidden = files.filter(file => file === '.git'
  || file.startsWith('.git/')
  || file.startsWith('node_modules/')
  || file.startsWith('.cache/')
  || file.startsWith('_site/')
  || file.startsWith('_support/')
  || file.startsWith('release/')
  || /(^|\/)\.env($|\.)/.test(file));
if (forbidden.length) {
  throw new Error(`Releasekilden indeholder forbudte filer: ${forbidden.slice(0, 10).join(', ')}`);
}

await fs.mkdir('release', { recursive: true });
await fs.rm(out, { force: true });
const archive = runGit(['archive', '--format=zip', `--output=${out}`, 'HEAD'], { stdio: 'inherit' });
if (archive.status !== 0) {
  await fs.rm(out, { force: true });
  throw new Error('Kunne ikke bygge release-ZIP fra den committede kandidat.');
}
const stat = await fs.stat(out);
if (!stat.isFile() || stat.size === 0) {
  await fs.rm(out, { force: true });
  throw new Error('Release-ZIP blev ikke oprettet korrekt.');
}
console.log(`Sikker releasepakke oprettet fra HEAD: ${out} (${files.length} filer, ${stat.size} byte).`);
