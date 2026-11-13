// Ren numerisk projektion. Modulet læser ingen originaler, udsteder ingen beviser og udfører intet I/O.
const HOUR_MS = 3_600_000;
const finite = value => typeof value === 'number' && Number.isFinite(value)
  ? value
  : null;
const round = (value, digits) => Number.isFinite(value)
  ? Number(value.toFixed(digits))
  : null;
export const normalizeDegrees = value => ((value % 360) + 360) % 360;
export function uvToTowardDirectionDeg(uValue, vValue) {
  const u = finite(uValue);
  const v = finite(vValue);
  return u === null || v === null ? null : normalizeDegrees(Math.atan2(u, v) * 180 / Math.PI);
}
export function coastNormalSpeedMpsFromUv(uMps, vMps, onshoreDirectionDeg) {
  const u = finite(uMps);
  const v = finite(vMps);
  const onshore = finite(onshoreDirectionDeg);
  if (u === null || v === null || onshore === null || onshore < 0 || onshore > 360) return null;
  const radians = normalizeDegrees(onshore) * Math.PI / 180;
  const value = u * Math.sin(radians) + v * Math.cos(radians);
  return Math.abs(value) < Number.EPSILON ? 0 : value;
}

export function pythonRoundDmiSamplingCoordinate(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 180) return null;
  if (value === 0) return value;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0), negative = (bits >> 63n) !== 0n;
  const exponent = Number((bits >> 52n) & 0x7ffn), fraction = bits & ((1n << 52n) - 1n);
  const significand = exponent === 0 ? fraction : (1n << 52n) | fraction;
  const shift = exponent === 0 ? -1074 : exponent - 1023 - 52;
  let numerator = significand * 10_000_000n, rounded;
  if (shift >= 0) rounded = numerator << BigInt(shift);
  else {
    const denominator = 1n << BigInt(-shift);
    rounded = numerator / denominator;
    const twiceRemainder = (numerator % denominator) * 2n;
    if (twiceRemainder > denominator || twiceRemainder === denominator && (rounded & 1n)) rounded += 1n;
  }
  const result = Number(rounded) / 10_000_000;
  return negative ? -result : result;
}

function samePoint(first, second, tolerance = 1e-7) {
  return Array.isArray(first) && Array.isArray(second)
    && first.length === 2 && second.length === 2
    && first.every((value, index) => finite(value) !== null
      && finite(second[index]) !== null
      && Math.abs(value - second[index]) <= tolerance);
}

function sameDmiSeries(left, right) {
  return left?.status === 'verified'
    && right?.status === 'verified'
    && left.provider === 'dmi'
    && right.provider === 'dmi'
    && left.collection === right.collection
    && left.modelRun === right.modelRun
    && left.component === right.component
    && left.componentKind === right.componentKind
    && left.entityId === right.entityId
    && left.parentZoneId === right.parentZoneId
    && left.entityType === right.entityType
    && left.samplingContext === right.samplingContext
    && left.gridDefinitionSha256 === right.gridDefinitionSha256
    && left.spatialSelection === right.spatialSelection
    && left.spatialSemanticsVersion === right.spatialSemanticsVersion
    && left.vectorSelection === right.vectorSelection
    && left.vectorSemanticsVersion === right.vectorSemanticsVersion
    && samePoint(left.samplingPoint, right.samplingPoint)
    && samePoint(left.gridPoint, right.gridPoint);
}

const circularDistanceDeg = (left, right) => {
  const difference = Math.abs(Number(left) - Number(right)) % 360;
  return Math.min(difference, 360 - difference);
};

export function projectRavScoreAdmittedCurrentVector({ uMps, vMps, coastNormalSpeedMps }) {
  const currentUMps = finite(uMps);
  const currentVMps = finite(vMps);
  return {
    currentSpeedMps: round(Math.hypot(currentUMps, currentVMps), 2),
    currentDirectionDeg: normalizeDegrees(round(
      uvToTowardDirectionDeg(currentUMps, currentVMps),
      0,
    )),
    currentCoastNormalSpeedMps: coastNormalSpeedMps,
  };
}

export function calculateRavScoreWaterLevelTrends(sanitized) {
  const byTime = new Map(sanitized.map(row => [row.time, row]));
  return sanitized.map(row => {
    if (finite(row.waterLevelCm) === null) return row;
    const future = byTime.get(new Date(Date.parse(row.time) + 3 * HOUR_MS).toISOString());
    if (finite(future?.waterLevelCm) === null
      || !sameDmiSeries(row.waterLevelProvenance, future?.waterLevelProvenance)) return row;
    return {
      ...row,
      waterLevelTrendCm3h: round(future.waterLevelCm - row.waterLevelCm, 0),
    };
  });

}

export function calculateRavScoreNativeCadenceProjection({
  uMps, vMps, onshoreDirectionDeg, projection,
}) {
  const rounded = (value, digits) => Number(Number(value).toFixed(digits));
  const exactCurrentSpeedMps = Math.hypot(uMps, vMps);
  const exactCurrentDirectionDeg = ((Math.atan2(uMps, vMps) * 180 / Math.PI) + 360) % 360;
  const currentSpeedMps = projection === 'candidate-g-legacy-quantized'
    ? rounded(exactCurrentSpeedMps, 2)
    : exactCurrentSpeedMps;
  const currentDirectionDeg = projection === 'candidate-g-legacy-quantized'
    ? rounded(exactCurrentDirectionDeg, 0)
    : exactCurrentDirectionDeg;
  return { currentSpeedMps,
    currentAlignment: Math.cos((currentDirectionDeg - onshoreDirectionDeg) * Math.PI / 180),
  };
}

export function calculateRavScoreRecoveryCurrentProjection(row, part) {
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const hasU = finite(row.currentUMps);
  const hasV = finite(row.currentVMps);
  if (!hasU || !hasV) return null;
  const rawU = Number(row.currentUMps);
  const rawV = Number(row.currentVMps);
  const directionDeg = ((Number(row.currentDirectionDeg) % 360) + 360) % 360;
  const derivedSpeed = Math.hypot(rawU, rawV);
  const derivedDirection = ((Math.atan2(rawU, rawV) * 180 / Math.PI) + 360) % 360;
  const coastNormalSpeedMps = coastNormalSpeedMpsFromUv(
    rawU,
    rawV,
    part?.onshoreDirectionDeg,
  );
  if (Math.abs(derivedSpeed - Number(row.currentSpeedMps)) > 0.011
    || (Number(row.currentSpeedMps) > 0.01
      && circularDistanceDeg(derivedDirection, directionDeg) > 0.51)
    || coastNormalSpeedMps === null) return null;
  return { rawU, rawV, directionDeg, coastNormalSpeedMps };
}
