// Internal cooperative acquisition exclusion, fixed to this module's checkout.
// No PID/expiry/adoption, serialized credential, caller root or executor. Every
// participant must leave another owner's claim untouched. Identity checks and
// unlink are NOT atomic against arbitrary same-privilege filesystem replacement.
// This primitive proves only its own claim lifetime. A normal entry may release
// it only AFTER its actual children/readers/requests/writes have settled; unknown
// settlement must call retain. That caller integration is a separate contract.
import fs from 'node:fs/promises';
import rawFs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { types } from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = path.join(ROOT, '.cache');
const CLAIM = path.join(CACHE, 'weather-acquisition-writer.claim');
const leases = new WeakMap();
let active = null;

function failure(code = 'WEATHER_ACQUISITION_WRITER_UNPROVED') {
  return Object.assign(new Error(code), { code });
}
function ownCode(error, code) {
  return error !== null && (typeof error === 'object' || typeof error === 'function')
    && !types.isProxy(error) && Object.getOwnPropertyDescriptor(error, 'code')?.value === code;
}
function sameObject(left, right) {
  return typeof left?.dev === 'bigint' && typeof left?.ino === 'bigint' && left.ino > 0n
    && left.dev === right?.dev && left.ino === right?.ino;
}
function current(lease) {
  if (active !== lease || lease.blocked || lease.state === 'CLOSED') throw failure();
}
function owned(owner) {
  const lease = leases.get(owner);
  if (!lease) throw failure('WEATHER_ACQUISITION_WRITER_OWNER_INVALID');
  return lease;
}
function rawStat(fd) {
  return new Promise((resolve, reject) => {
    rawFs.fstat(fd, { bigint: true }, (error, stat) => {
      // Falsy values other than the actual null success callback are unknown.
      if (error === null) resolve(stat); else reject(error);
    });
  });
}
async function directories(lease, capture = false) {
  for (const [file, key] of [[ROOT, 'rootIdentity'], [CACHE, 'cacheIdentity']]) {
    const stat = await fs.lstat(file, { bigint: true });
    current(lease);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.ino <= 0n
      || await fs.realpath(file) !== file) throw failure();
    current(lease);
    if (capture) lease[key] = stat;
    else if (!sameObject(stat, lease[key])) throw failure();
  }
}
async function physical(lease) {
  current(lease);
  await directories(lease);
  const stat = await fs.lstat(CLAIM, { bigint: true });
  current(lease);
  if (!stat.isFile() || stat.isSymbolicLink() || !sameObject(stat, lease.identity)
    || stat.size !== 0n || stat.nlink !== 1n || stat.mtimeNs !== lease.identity.mtimeNs) throw failure();
  if (!lease.closed) {
    const opened = await rawStat(lease.fd);
    current(lease);
    if (!sameObject(opened, stat) || opened.size !== 0n || opened.nlink !== 1n
      || opened.mtimeNs !== stat.mtimeNs) throw failure();
  }
}

export async function acquireWeatherAcquisitionWriter() {
  if (arguments.length !== 0) throw failure('WEATHER_ACQUISITION_WRITER_ARGUMENTS_INVALID');
  if (active) throw failure('WEATHER_ACQUISITION_WRITER_BUSY');
  const lease = { state: 'ACQUIRING', blocked: false, closed: false, handle: null };
  active = lease; // Serialize even concurrent acquisitions before the first await.
  try {
    // The normal checkout and its private .cache must already exist. No mkdir.
    await directories(lease, true);
    const handle = await fs.open(CLAIM,
      rawFs.constants.O_WRONLY | rawFs.constants.O_CREAT | rawFs.constants.O_EXCL
        | (rawFs.constants.O_NOFOLLOW ?? 0), 0o600);
    lease.handle = handle; // Retain actual resource before fd access/any next await.
    lease.fd = handle.fd;
    if (!Number.isInteger(lease.fd) || lease.fd < 0) throw failure();
    lease.identity = await rawStat(lease.fd);
    await physical(lease);
    const owner = Object.freeze(Object.create(null));
    leases.set(owner, lease);
    lease.state = 'OWNED';
    return owner;
  } catch (error) {
    if (lease.handle) lease.blocked = true; // Never release a partly verified claim.
    else if (active === lease) active = null;
    throw error;
  }
}

export async function assertWeatherAcquisitionWriter(owner) {
  if (arguments.length !== 1) throw failure('WEATHER_ACQUISITION_WRITER_ARGUMENTS_INVALID');
  const lease = owned(owner);
  try {
    if (lease.state !== 'OWNED') throw failure();
    await physical(lease);
  } catch (error) { lease.blocked = true; throw error; }
}

// Synchronous, irreversible uncertainty latch. It cannot grant authority or
// prove closure, and neither a subsequent healthy operation nor a new object
// can clear it. Keep the actual FileHandle strongly held through active.
export function retainWeatherAcquisitionWriter(owner) {
  if (arguments.length !== 1) throw failure('WEATHER_ACQUISITION_WRITER_ARGUMENTS_INVALID');
  const lease = owned(owner);
  if (lease.state === 'CLOSED') throw failure();
  lease.blocked = true;
}

export async function releaseWeatherAcquisitionWriter(owner) {
  if (arguments.length !== 1) throw failure('WEATHER_ACQUISITION_WRITER_ARGUMENTS_INVALID');
  const lease = owned(owner);
  if (lease.state !== 'OWNED') throw failure();
  lease.state = 'RELEASING'; // Exactly one release attempt, including uncertain ones.
  let primary = null;
  try {
    await physical(lease);
    try { await lease.handle.close(); }
    catch (error) { primary = { error }; }
    let closed = false;
    try { await rawStat(lease.fd); }
    catch (error) { closed = ownCode(error, 'EBADF'); }
    if (!closed) throw failure('WEATHER_ACQUISITION_WRITER_CLOSE_UNPROVED');
    lease.closed = true;
    await physical(lease); // Still our exact empty path and original directories.
    try { await fs.unlink(CLAIM); }
    catch (error) { primary ??= { error }; }
    let absent = false;
    try { await fs.lstat(CLAIM, { bigint: true }); }
    catch (error) { if (ownCode(error, 'ENOENT')) absent = true; else throw error; }
    if (!absent) throw failure('WEATHER_ACQUISITION_WRITER_RELEASE_UNPROVED');
    current(lease);
    await directories(lease);
    lease.state = 'CLOSED';
    active = null;
  } catch (error) {
    lease.blocked = true;
    primary ??= { error };
  }
  if (primary) throw primary.error;
}
