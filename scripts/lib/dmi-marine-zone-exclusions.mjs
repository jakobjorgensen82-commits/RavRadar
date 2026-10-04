import fs from 'node:fs';

const policy = JSON.parse(fs.readFileSync(new URL('./dmi-marine-zone-exclusions.json', import.meta.url), 'utf8'));
if (policy?.schemaVersion !== 1
  || policy?.contractId !== 'owner-approved-dmi-marine-zone-exclusions-v1'
  || JSON.stringify(policy.excludedCollectionsByParentZoneId)
    !== JSON.stringify({ 'DK-B01-01': ['dkss_lf'], 'DK-B01-02': ['dkss_lf'],
      'DK-B02-08': ['dkss_lf'], 'DK-B02-09': ['dkss_lf'], 'DK-B02-11': ['dkss_lf'],
      'DK-B03-01': ['dkss_lf'], 'DK-B03-02': ['dkss_lf'] })) {
  throw new Error('DMI_MARINE_ZONE_EXCLUSION_POLICY_INVALID');
}

/** Consumer eligibility only; original native/authentication proofs are unchanged. */
export function dmiMarineCollectionAllowedForZone(collection, parentZoneId) {
  return !Object.hasOwn(policy.excludedCollectionsByParentZoneId, parentZoneId)
    || !policy.excludedCollectionsByParentZoneId[parentZoneId].includes(collection);
}
