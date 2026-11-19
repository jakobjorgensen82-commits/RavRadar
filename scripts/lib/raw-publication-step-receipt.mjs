import { appendFile } from 'node:fs/promises';
import { resolveProductionReferenceTime } from './production-reference-time.mjs';

const OUTPUT_DIGESTS = {
  b: 'bundle_content_sha256',
  s: 'generation_sha256',
};

// Only the opted-in CLI publishes step outputs. Its existing protected writer
// remains the authority for the successful digest, generation and version.
export function prepareRawPublicationStepReceipt(role, publicationTarget, env = process.env) {
  if (env.RAVRADAR_RAW_PUBLICATION_RECEIPT !== 'true') return null;
  const locked = env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  if (!Object.hasOwn(OUTPUT_DIGESTS, role) || !env.GITHUB_OUTPUT
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(locked ?? '')) {
    throw new Error('RAW_PUBLICATION_RECEIPT_TARGET_INVALID');
  }
  const target = resolveProductionReferenceTime(locked);
  if (target !== locked.replace(/(?:\.000)?Z$/, '.000Z') || target !== publicationTarget) {
    throw new Error('RAW_PUBLICATION_RECEIPT_TARGET_INVALID');
  }
  const output = env.GITHUB_OUTPUT;
  const prefix = 'raw_' + role + '_';
  return async ({ centralVersion, productionReferenceAt, digest }) => {
    if (!Number.isSafeInteger(centralVersion) || centralVersion < 1
        || productionReferenceAt !== target || typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) {
      throw new Error('RAW_PUBLICATION_RECEIPT_RESULT_INVALID');
    }
    await appendFile(output, `${prefix}central_version=${centralVersion}\n`
      + `${prefix}production_reference_at=${target}\n${prefix}${OUTPUT_DIGESTS[role]}=${digest}\n`);
  };
}
