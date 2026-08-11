function validCoordinate(point) {
  return Array.isArray(point)
    && point.length >= 2
    && Number.isFinite(Number(point[0]))
    && Number.isFinite(Number(point[1]));
}

function validLine(line) {
  return Array.isArray(line) && line.length >= 2 && line.every(validCoordinate);
}

export function geometryLines(geometry) {
  if (geometry?.type === 'LineString') return validLine(geometry.coordinates) ? [geometry.coordinates] : [];
  if (geometry?.type === 'MultiLineString') return (geometry.coordinates || []).filter(validLine);
  return [];
}

function zoneParts(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.parts)) return value.parts;
  return value?.partId && value?.geometry ? [value] : [];
}

// De lokale kystdele er beregnings- og redigeringsenheder. På det offentlige
// kort samles deres præcise geometri under den eksisterende hovedzone, så de
// aldrig bliver til selvstændige klikmål, farver eller zonegrænser.
export function projectPublicCoastlines(collection) {
  const partsByZone = collection?.coastalParts?.zones || {};
  return {
    ...collection,
    features: (collection?.features || []).map(feature => {
      const zoneId = feature?.properties?.id;
      const preciseLines = zoneParts(partsByZone[zoneId]).flatMap(part => geometryLines(part?.geometry));
      if (!preciseLines.length) return feature;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          publicCoastLines: preciseLines,
          publicCoastLineSource: 'reviewed-national-local-parts'
        }
      };
    })
  };
}
