// Fixed error-site projection only. This is never original-data admission.
const sites = Object.freeze({
  CLI: ['FIXED_OPERATION'],
  CURRENT220_SOURCE: ['FROZEN_SOURCE'],
  PRIVATE_ROOT: ['OWNED_DESTINATION', 'RESTORED_DIRECTORY', 'BUNDLE_DIRECTORY', 'CHECKPOINT_PATH'],
  CLIENT_SETUP: ['EXISTING_AUTH'],
  CURRENT_POINTER: ['AUTHENTICATED_B_READ'],
  RESTORE_EXPECTATION: ['EXACT_FAMILY', 'SAME_REFERENCE'],
  AUTHENTICATED_B_RESTORE: ['NORMAL_RESTORE', 'RESTORE_DISPOSITION'],
  ORIGINAL_B_UNPACK: ['NORMAL_UNPACK'],
  AUTHENTICATED_S_READ: ['WHOLE_ROW'],
  ORIGINAL_S_ROW: ['EXACT_ROW', 'ROW_SHAPE', 'ROW_KEYS', 'KEY_VERSION', 'PAYLOAD_SHAPE',
    'DATASET', 'REFERENCE', 'CONTINUATION_BINDING', 'ACTIVE_BINDING', 'COMPANION_BINDING'],
  PRESERVE_ORIGINAL_S: ['EXCLUSIVE_CHECKPOINT_FILE'],
  ORIGINAL_IDENTITIES: ['EXCLUSIVE_IDENTITY_FILE', 'BOUNDED_IDENTITY_FILE'],
  WHOLE_ORIGINAL_ARCHIVE: ['AUTHENTIC_BUNDLE', 'MANIFEST', 'RESTORED_INVENTORY', 'CONDITIONS', 'EXACT_IDENTITY', 'PARTS_AND_ARCHIVE'],
  ORIGINAL_S_BYTES: ['FULL_DIGEST', 'BOUNDED_JSON'],
  OLD_ISSUED_SOURCE: ['FIXED_SOURCE_CALLBACK'],
  OLD_ISSUED_LOADER: ['MODULE', 'EXCLUSIVE_VALIDATION_COPY', 'COPY_DIGEST', 'LOAD_TARGET',
    'LOAD_DISPOSITION', 'LOADED', 'PART_COUNT', 'NO_REATTEST', 'UNCHANGED_COPY'],
  OLD_RECOMPUTE: ['SAVE_673', 'EXACT_ORIGINAL_S'],
  FINAL_ORIGINAL_BYTES: ['RESTORED_INVENTORY', 'UNCHANGED_S'],
  FINAL_POINTER: ['CURRENT_B_READ', 'CURRENT_B_MATCH'],
  FINAL_VERSION: ['CURRENT_S_READ', 'CURRENT_S_MATCH'],
  PRESERVATION_RECEIPT: ['EXCLUSIVE_FILE', 'UNCHANGED'],
  EXACT_MIGRATION_PLAN: ['NORMAL_CLI'],
});
const recorded = new WeakMap();
const categories = Object.freeze({
  ERR_ASSERTION: 'ASSERTION',
  ENOENT: 'FILE_NOT_FOUND', EACCES: 'FILE_ACCESS', EPERM: 'FILE_ACCESS',
  EEXIST: 'EXISTING_DESTINATION', ELOOP: 'FILE_LINK',
  ENOSPC: 'FILE_CAPACITY', EDQUOT: 'FILE_CAPACITY', EIO: 'FILE_IO',
  ERR_MODULE_NOT_FOUND: 'MODULE_UNAVAILABLE',
  ERR_CHILD_PROCESS_STDIO_MAXBUFFER: 'PROCESS_OUTPUT_BOUND',
  ETIMEDOUT: 'TIMEOUT', ABORT_ERR: 'ABORTED',
  ECONNRESET: 'TRANSPORT', EPIPE: 'TRANSPORT', ENOTFOUND: 'TRANSPORT',
  EAI_AGAIN: 'TRANSPORT', ECONNREFUSED: 'TRANSPORT',
  SUPABASE_RESPONSE_BODY_TRANSPORT: 'BODY_TRANSPORT',
});
const weakKey = error => error !== null && (typeof error === 'object' || typeof error === 'function');
function category(error) {
  try {
    // Do not read getters, message, stack, actual, expected or a raw cause.
    const descriptor = weakKey(error) ? Object.getOwnPropertyDescriptor(error, 'code') : null;
    const code = descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
    if (typeof code === 'string' && Object.hasOwn(categories, code)) return categories[code];
    if (Number.isInteger(code)) return 'PROCESS_EXIT';
    if (error instanceof SyntaxError) return 'PARSE_SYNTAX';
  } catch { /* hostile diagnostic properties must not replace the first cause */ }
  return 'UNCLASSIFIED_ERROR';
}
function validateSite(phase, criterion) {
  if (!Object.hasOwn(sites, phase) || !sites[phase].includes(criterion)) {
    throw new TypeError('CURRENT_GRID_PREWRITE_DIAGNOSTIC_SITE_INVALID');
  }
}
function record(error, phase, criterion) {
  if (weakKey(error) && !recorded.has(error)) {
    recorded.set(error, Object.freeze({
      kind: 'CURRENT_GRID_ORIGINAL_PREWRITE_DIAGNOSTIC', phase, criterion, category: category(error),
    }));
  }
}
export function currentGridPrewriteGuard(phase, criterion, work) {
  validateSite(phase, criterion);
  try { return work(); }
  catch (error) { record(error, phase, criterion); throw error; }
}
export async function withCurrentGridPrewriteStage(phase, criterion, work) {
  validateSite(phase, criterion);
  try { return await work(); }
  catch (error) { record(error, phase, criterion); throw error; }
}
export function currentGridPrewriteRefusalDiagnostic(error) {
  return (weakKey(error) && recorded.get(error)) || Object.freeze({
    kind: 'CURRENT_GRID_ORIGINAL_PREWRITE_DIAGNOSTIC', phase: 'UNKNOWN',
    criterion: 'UNRECORDED', category: 'UNCLASSIFIED_ERROR',
  });
}
export function emitCurrentGridPrewriteRefusal(error, write = line => console.error(line)) {
  const value = currentGridPrewriteRefusalDiagnostic(error);
  write('CURRENT_GRID_ORIGINAL_PREWRITE_REFUSED');
  write(JSON.stringify(value));
  write('::error title=Current-grid original prewrite::phase=' + value.phase
    + ';criterion=' + value.criterion + ';category=' + value.category);
}
