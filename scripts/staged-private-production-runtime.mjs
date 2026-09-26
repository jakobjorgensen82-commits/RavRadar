#!/usr/bin/env node
// A short-lived, encrypted GitHub artifact for an already validated private
// build. It is not a production pointer and never authorizes publication.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProtectedPrivateRuntimeArchive,
  PROTECTED_PRIVATE_RUNTIME_POLICY,
  restoreStagedPrivateProductionRuntime,
} from './protected-private-production-runtime.mjs';

const MAGIC = Buffer.from('RR-PRIVATE-BUILD-STAGE-1\n');
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const MAX_DESCRIPTOR_BYTES = 32 * 1024;
const MAX_ARTIFACT_BYTES = PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes
  + MAX_DESCRIPTOR_BYTES + 1024;

function identity({ repository, runId, runAttempt, sourceHead }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(repository ?? ''))
    || !/^[1-9][0-9]*$/.test(String(runId ?? ''))
    || !/^[1-9][0-9]*$/.test(String(runAttempt ?? ''))
    || !/^[a-f0-9]{40}$/.test(String(sourceHead ?? ''))) {
    throw new Error('Staged private build identity is invalid');
  }
  return JSON.stringify({ repository, runId: String(runId),
    runAttempt: String(runAttempt), sourceHead });
}

function encryptionKey(masterSecret, salt, repository) {
  if (typeof masterSecret !== 'string' || masterSecret.length < 32) {
    throw new Error('Staged private build encryption secret is unavailable');
  }
  return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(masterSecret), salt,
    Buffer.from(`RavRadar/${repository}/PRIVATE_BUILD_STAGE/v1`), 32));
}

function outsideRepository(file, repositoryRoot) {
  const resolved = path.resolve(file);
  const root = path.resolve(repositoryRoot);
  const relative = path.relative(root, resolved);
  if (!relative || (relative !== '..' && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative))) {
    throw new Error('Staged private build artifact must stay outside repository');
  }
  return resolved;
}

async function writeAll(handle, bytes) {
  for (let offset = 0; offset < bytes.length;) {
    const { bytesWritten } = await handle.write(bytes, offset);
    if (bytesWritten < 1) throw new Error('Staged private build write did not progress');
    offset += bytesWritten;
  }
}

export async function sealStagedPrivateProductionRuntime({
  privateRoot, bundlePath, repositoryRoot, expected, sourceHead,
  repository, runId, runAttempt, outputPath, masterSecret,
  now = new Date().toISOString(),
} = {}) {
  const aad = identity({ repository, runId, runAttempt, sourceHead });
  const output = outsideRepository(outputPath, repositoryRoot);
  const built = await buildProtectedPrivateRuntimeArchive({
    privateRoot, bundlePath, repositoryRoot, expected, sourceHead, now,
  });
  const descriptor = Buffer.from(JSON.stringify(built.descriptor));
  if (descriptor.length < 1 || descriptor.length > MAX_DESCRIPTOR_BYTES) {
    throw new Error('Staged private build descriptor exceeds its bound');
  }
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(descriptor.length);
  const salt = crypto.randomBytes(SALT_BYTES);
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm',
    encryptionKey(masterSecret, salt, repository), nonce);
  cipher.setAAD(Buffer.from(aad));
  const temporary = `${output}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  await fs.mkdir(path.dirname(output), { recursive: true });
  let handle;
  try {
    handle = await fs.open(temporary, 'wx', 0o600);
    for (const item of [MAGIC, salt, nonce, cipher.update(header),
      cipher.update(descriptor)]) await writeAll(handle, item);
    for (let offset = 0; offset < built.archive.length; offset += 8 * 1024 * 1024) {
      await writeAll(handle, cipher.update(built.archive.subarray(
        offset, Math.min(offset + 8 * 1024 * 1024, built.archive.length),
      )));
    }
    await writeAll(handle, cipher.final());
    await writeAll(handle, cipher.getAuthTag());
    await handle.close();
    handle = null;
    const stat = await fs.stat(temporary);
    if (stat.size < MAGIC.length + SALT_BYTES + NONCE_BYTES + TAG_BYTES + 5
      || stat.size > MAX_ARTIFACT_BYTES) {
      throw new Error('Staged private build ciphertext size is invalid');
    }
    await fs.rename(temporary, output);
    return { sealed: true, ciphertextBytes: stat.size,
      bundleContentSha256: built.descriptor.bundleContentSha256,
      privatePayloadLogged: false, productionPointerUnchanged: true };
  } finally {
    if (handle) await handle.close().catch(() => {});
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

export async function openStagedPrivateProductionRuntime({
  inputPath, privateRoot, bundlePath, repositoryRoot, expected,
  sourceHead, repository, runId, runAttempt, masterSecret,
  now = new Date().toISOString(),
} = {}) {
  const aad = identity({ repository, runId, runAttempt, sourceHead });
  const input = outsideRepository(inputPath, repositoryRoot);
  const stat = await fs.lstat(input);
  if (!stat.isFile() || stat.isSymbolicLink()
    || stat.size < MAGIC.length + SALT_BYTES + NONCE_BYTES + TAG_BYTES + 5
    || stat.size > MAX_ARTIFACT_BYTES) {
    throw new Error('Staged private build ciphertext is invalid');
  }
  const bytes = await fs.readFile(input);
  if (!bytes.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Staged private build format is invalid');
  }
  const saltStart = MAGIC.length;
  const nonceStart = saltStart + SALT_BYTES;
  const ciphertextStart = nonceStart + NONCE_BYTES;
  const tagStart = bytes.length - TAG_BYTES;
  const decipher = crypto.createDecipheriv('aes-256-gcm',
    encryptionKey(masterSecret,
      bytes.subarray(saltStart, nonceStart), repository),
    bytes.subarray(nonceStart, ciphertextStart));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(bytes.subarray(tagStart));
  let plaintext;
  try {
    plaintext = Buffer.concat([
      decipher.update(bytes.subarray(ciphertextStart, tagStart)),
      decipher.final(),
    ]);
  } catch {
    throw new Error('Staged private build authentication failed');
  }
  const descriptorBytes = plaintext.readUInt32BE(0);
  if (descriptorBytes < 1 || descriptorBytes > MAX_DESCRIPTOR_BYTES
    || plaintext.length <= 4 + descriptorBytes) {
    throw new Error('Staged private build envelope is invalid');
  }
  let descriptor;
  try {
    descriptor = JSON.parse(plaintext.subarray(4, 4 + descriptorBytes).toString('utf8'));
  } catch {
    throw new Error('Staged private build descriptor is invalid');
  }
  return restoreStagedPrivateProductionRuntime({
    archive: plaintext.subarray(4 + descriptorBytes), descriptor,
    privateRoot, bundlePath, repositoryRoot, expected, sourceHead, now,
  });
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || index + 1 >= argv.length) throw new Error(`Missing ${name}`);
  return argv[index + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv[0];
  if (!['seal', 'open'].includes(mode)) throw new Error('Use seal or open');
  const repositoryRoot = path.resolve(argument(argv, '--repository-root'));
  const common = {
    repositoryRoot,
    privateRoot: argument(argv, '--private-root'),
    bundlePath: argument(argv, '--bundle'),
    expected: JSON.parse(await fs.readFile(argument(argv, '--expected'), 'utf8')),
    sourceHead: argument(argv, '--source-head'),
    repository: argument(argv, '--repository'),
    runId: argument(argv, '--run-id'),
    runAttempt: argument(argv, '--run-attempt'),
    masterSecret: process.env.STAGED_PRIVATE_BUILD_MASTER_SECRET,
  };
  const result = mode === 'seal'
    ? await sealStagedPrivateProductionRuntime({
      ...common, outputPath: argument(argv, '--output'),
    })
    : await openStagedPrivateProductionRuntime({
      ...common, inputPath: argument(argv, '--input'),
    });
  console.log(JSON.stringify({ status: mode === 'seal' ? 'sealed' : 'restored',
    ciphertextBytes: result.ciphertextBytes ?? null,
    bundleContentSha256: result.bundleContentSha256,
    privatePayloadLogged: false, productionPointerUnchanged: true }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Private build staging failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
