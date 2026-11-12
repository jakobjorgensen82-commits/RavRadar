// Pure row-shape validation. This module never grants source or hold authority.
const STATE_ONLY_CURRENT_ROW_FORBIDDEN_EXACT_FIELDS = new Set([
  'current', 'u', 'v', 'umps', 'vmps', 'rawu', 'rawv', 'rawumps', 'rawvmps',
  'uo', 'vo', 'eastwardcurrent', 'northwardcurrent',
  'eastwardseawatervelocity', 'northwardseawatervelocity',
  'samplingpoint', 'samplepoint', 'samplingcoordinates', 'gridpoint', 'gridindex',
  'gridcell', 'gridcoordinates', 'nativegrid', 'distancekm', 'verticallayer', 'verticallayerm',
  'verticallayerrankm', 'layerquality', 'sharedlayercount', 'componentpair',
  'interpolation', 'vectorsemanticsversion', 'vectorselection', 'vector', 'rawvector',
  'coastnormal', 'coastnormalspeedmps', 'coastnormalcurrentmps',
  'onshorecurrentmps', 'crossshorecurrentmps', 'alongshorecurrentmps',
  'flowpoints', 'flowarrow', 'flowarrows',
  'arrow', 'arrowsource', 'arrowavailable',
]);

export function stateOnlyCurrentRowFieldForbidden(field) {
  const normalized = String(field).replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (STATE_ONLY_CURRENT_ROW_FORBIDDEN_EXACT_FIELDS.has(normalized)) return true;
  if (normalized.startsWith('arrow')) return true;
  if (!normalized.startsWith('current')) return false;
  return !['currentprovenance', 'currentstateonlyhold'].includes(normalized);
}


export function stateOnlyCurrentRowForbiddenFields(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
  return Object.keys(row).filter(stateOnlyCurrentRowFieldForbidden);
}

export function stripStateOnlyCurrentRowProjection(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return {};
  const stripped = Object.fromEntries(Object.entries(row)
    .filter(([field]) => !stateOnlyCurrentRowFieldForbidden(field)));
  if (stripped.sources && typeof stripped.sources === 'object'
    && !Array.isArray(stripped.sources)) {
    const sources = { ...stripped.sources };
    delete sources.current;
    stripped.sources = sources;
  }
  return stripped;
}
