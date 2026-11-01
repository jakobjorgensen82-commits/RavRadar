import {
  RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,
  RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY,
  resolveOperationalRavScoreModel,
} from '../ravscore-operational-activation.mjs';

const documentKeys = Object.freeze([
  RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,
  RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY,
]);
const rowFields = Object.freeze(['document_key', 'payload', 'version']);

// The active public release can legitimately precede this checkout. Validate
// its sealed operation/profile pair, not its binding against the next template.
// One REST selection observes both rows together; never mix separate reads.
export async function readProtectedAdminRavScoreSelection(request) {
  const rows = await request(
    `?select=document_key,payload,version&document_key=in.(${documentKeys.join(',')})`,
    {},
    'beskyttet sync: atomisk RavScore operation/profil-læsning',
  );
  if (!Array.isArray(rows) || rows.length !== documentKeys.length) {
    throw new Error('Protected admin RavScore operation/profile snapshot is incomplete');
  }
  const byKey = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(rowFields)
      || !documentKeys.includes(row.document_key)
      || byKey.has(row.document_key)
      || !Number.isSafeInteger(row.version)
      || row.version < 1) {
      throw new Error('Protected admin RavScore operation/profile snapshot is malformed');
    }
    byKey.set(row.document_key, row);
  }
  const profileRow = byKey.get(RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY);
  resolveOperationalRavScoreModel(
    byKey.get(RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY),
    { profileRow },
  );
  return profileRow.payload;
}
