import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
export const FORECAST_SHARE_PAGES_WRANGLER_PINS=Object.freeze({
  version:'4.28.1',
  cli:Object.freeze({bytes:6913941,sha256:'f0c7dc8bcc2e89d27d99448f6cc497c5b1d7cb2c1e984716e1154e526690041d'}),
  bin:Object.freeze({bytes:3155,sha256:'770db21641fb72c8035877b33c6a32856d61d253b58d9ea20e37820bcbc79007'}),
  package:Object.freeze({bytes:5527,sha256:'6bb378a7979f6b6797df374dd88d9958f68130616ab7f66bd390efa134e6d33a'}),
  once:Object.freeze({bytes:6913941,sha256:'279ce7a390f10a73d9a31faa955374fc9d2fe233efc7bf1098cd4c2d7b31fae5'})
});
const FROM='MAX_DEPLOYMENT_ATTEMPTS = 3;',TO='MAX_DEPLOYMENT_ATTEMPTS = 1;';
function pinned(raw,pin){assert(Buffer.isBuffer(raw));assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
export function buildForecastSharePagesWranglerOnce({cli,bin,packageJson}){
  assert.equal(arguments.length,1);pinned(cli,FORECAST_SHARE_PAGES_WRANGLER_PINS.cli);
  pinned(bin,FORECAST_SHARE_PAGES_WRANGLER_PINS.bin);pinned(packageJson,FORECAST_SHARE_PAGES_WRANGLER_PINS.package);
  const pkg=JSON.parse(packageJson);assert.equal(pkg.version,'4.28.1');assert.equal(pkg.bin.wrangler,'./bin/wrangler.js');
  const text=cli.toString('utf8');assert.equal(text.split(FROM).length,2);assert.equal(text.split(TO).length,1);
  const changed=Buffer.from(text.replace(FROM,TO));pinned(changed,FORECAST_SHARE_PAGES_WRANGLER_PINS.once);
  assert(Buffer.from(changed.toString('utf8').replace(TO,FROM)).equals(cli),'Whole original CLI inverse');
  return changed;
}
async function noLinks(file){let at=path.parse(file).root;for(const item of path.relative(at,file).split(path.sep)){
  at=path.join(at,item);assert(!(await fs.lstat(at)).isSymbolicLink(),'No aliased Wrangler runtime');}}
async function readPinned(file,pin){await noLinks(file);const stat=await fs.lstat(file);
  assert(stat.isFile()&&stat.nlink===1&&stat.size===pin.bytes);const raw=await fs.readFile(file);pinned(raw,pin);return raw;}
export async function prepareForecastSharePagesWranglerOnce(env){
  assert.equal(arguments.length,1);assert(/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID??''));assert.equal(env.GITHUB_RUN_ATTEMPT,'1');
  assert(typeof env.RUNNER_TEMP==='string'&&path.isAbsolute(env.RUNNER_TEMP)&&!/[\r\n\0]/.test(env.RUNNER_TEMP));
  const temporary=path.resolve(env.RUNNER_TEMP);await noLinks(temporary);
  const root=path.join(temporary,'ravradar-share-pages-wrangler-'+env.GITHUB_RUN_ID+'-1','node_modules/wrangler');
  const cliPath=path.join(root,'wrangler-dist/cli.js'),binPath=path.join(root,'bin/wrangler.js'),packagePath=path.join(root,'package.json');
  const cli=await readPinned(cliPath,FORECAST_SHARE_PAGES_WRANGLER_PINS.cli);
  const bin=await readPinned(binPath,FORECAST_SHARE_PAGES_WRANGLER_PINS.bin);
  const packageJson=await readPinned(packagePath,FORECAST_SHARE_PAGES_WRANGLER_PINS.package);
  const once=buildForecastSharePagesWranglerOnce({cli,bin,packageJson});
  const ownedPath=path.join(root,'wrangler-dist/cli.ravradar-pages-'+env.GITHUB_RUN_ID+'-1.cjs');
  let handle,created,first;
  try{handle=await fs.open(ownedPath,'wx',0o600);created=await handle.stat();await handle.writeFile(once);await handle.sync();}
  catch(error){first=error;}
  finally{try{await handle?.close();}catch(error){first??=error;}}
  if(first){
    if(created){const current=await fs.lstat(ownedPath);assert(current.isFile()&&!current.isSymbolicLink()
      &&current.dev===created.dev&&current.ino===created.ino&&current.nlink===1);await fs.unlink(ownedPath);}
    throw first;
  }
  const owned=await fs.lstat(ownedPath);assert(owned.isFile()&&owned.nlink===1);
  pinned(await fs.readFile(ownedPath),FORECAST_SHARE_PAGES_WRANGLER_PINS.once);
  // These exact flags and IPC are the requirements of the SHA-pinned normal
  // bin wrapper. The one copy remains in wrangler-dist, preserving __dirname.
  return Object.freeze({cliPath:ownedPath,nodeArgs:Object.freeze(['--no-warnings','--experimental-vm-modules']),
    async cleanup(){
      const current=await fs.lstat(ownedPath);assert(current.isFile()&&!current.isSymbolicLink()&&current.nlink===1
        &&current.dev===owned.dev&&current.ino===owned.ino&&current.size===owned.size,'Only this run-owned copy');
      pinned(await fs.readFile(ownedPath),FORECAST_SHARE_PAGES_WRANGLER_PINS.once);
      await fs.unlink(ownedPath);pinned(await fs.readFile(cliPath),FORECAST_SHARE_PAGES_WRANGLER_PINS.cli);
    }});
}
