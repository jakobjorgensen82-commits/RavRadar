// A source can legitimately attest height/period without wave direction.
// Such a source must not displace a complete saved wave using an unrelated
// numeric direction that the downstream adapter would then remove.
// Source/provenance validation and physical height/period admission remain
// the responsibility of the caller; this only binds the optional value.
export function dmiWaveDirectionMatchesSource(row, source) {
  const declared = source?.optionalFieldSet;
  if (!Array.isArray(declared)) return false;
  const hasDirection = row?.waveDirectionDeg !== null && row?.waveDirectionDeg !== undefined;
  if (!hasDirection) return row?.waveHeightM === 0 && declared.length === 0;
  return typeof row.waveDirectionDeg === 'number' && Number.isFinite(row.waveDirectionDeg)
    && row.waveDirectionDeg >= 0 && row.waveDirectionDeg <= 360
    && declared.length === 1 && declared[0] === 'mean-wave-dir';
}
