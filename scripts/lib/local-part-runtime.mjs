const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

function coordinates(value) {
  return Array.isArray(value) && value.length >= 2 && value.slice(0, 2).every(finite)
    ? value.slice(0, 2).map(Number)
    : null;
}

export function localPartDirectionAnchor(part = {}) {
  const dataPoint = coordinates(part.waterPoint);
  const pinPoint = coordinates(part.landPoint);
  const onshoreDirectionDeg = finite(part.onshoreDirectionDeg)
    ? ((Number(part.onshoreDirectionDeg) % 360) + 360) % 360
    : null;
  if (!part.partId || !part.name || !dataPoint || !pinPoint || onshoreDirectionDeg === null) {
    throw new Error(`${part.partId || 'ukendt-kystdel'}: ugyldigt lokalt land-/havpunkt eller pålandsretning`);
  }
  return {
    id: `local-part:${part.partId}`,
    name: String(part.name),
    dataPoint,
    pinPoint,
    onshoreDirectionDeg,
    weight: 1,
    verified: true
  };
}

export function localPartRuntimeProperties(parentProperties = {}, part = {}, id = part.partId) {
  const anchor = localPartDirectionAnchor(part);
  return {
    ...parentProperties,
    id,
    name: anchor.name,
    dataPoint: anchor.dataPoint,
    pinPoint: anchor.pinPoint,
    onshoreDirectionDeg: anchor.onshoreDirectionDeg,
    directionAnchors: [anchor]
  };
}
