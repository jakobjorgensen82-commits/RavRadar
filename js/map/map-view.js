const palette = { excellent: "#168653", good: "#6ba83b", fair: "#e6a700", poor: "#d34a3a", unavailable: "#76868d" };

export function createMap(elementId) {
  const map = L.map(elementId, { zoomControl: true }).setView([56.45, 10.15], 7);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap-bidragsydere"
  }).addTo(map);
  return map;
}

export function renderZones(map, featureCollection, scoreForZone, onSelect) {
  const layer = L.geoJSON(featureCollection, {
    style: feature => {
      const result = scoreForZone(feature.properties.id);
      const color = palette[result?.level || "unavailable"];
      return { color, fillColor: color, fillOpacity: .38, weight: 2 };
    },
    onEachFeature: (feature, polygon) => {
      polygon.bindTooltip(feature.properties.name, { sticky: true });
      polygon.on("click", () => onSelect(feature.properties));
    }
  }).addTo(map);

  if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [18, 18], maxZoom: 10 });
  return layer;
}

export function refreshZoneStyles(layer, scoreForZone) {
  layer.eachLayer(item => {
    const result = scoreForZone(item.feature.properties.id);
    const color = palette[result?.level || "unavailable"];
    item.setStyle({ color, fillColor: color });
  });
}

export function locateUser(map, onError, onFound = () => {}) {
  map.locate({ setView: true, maxZoom: 12, enableHighAccuracy: true });
  map.once("locationfound", event => {
    L.circleMarker(event.latlng, { radius: 7, weight: 3, color: "#073b4c", fillColor: "#fff", fillOpacity: 1 }).addTo(map);
    onFound({ latitude: event.latitude, longitude: event.longitude, accuracy: event.accuracy });
  });
  map.once("locationerror", onError);
}
