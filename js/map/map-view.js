const palette = { excellent: "#168653", good: "#6ba83b", fair: "#e6a700", poor: "#d34a3a", unavailable: "#76868d" };

export function createMap(elementId) {
  const map = L.map(elementId, { zoomControl: true }).setView([56.45, 10.15], 7);

  const streetMap = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap-bidragsydere"
  });

  const satelliteMap = L.tileLayer(
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri"
    }
  );

  const baseMaps = {
    "🗺️ Standard": streetMap,
    "🛰️ Satellit": satelliteMap
  };
  const savedBaseMap = localStorage.getItem("ravradar-basemap");
  const initialBaseMap = savedBaseMap === "satellite" ? satelliteMap : streetMap;
  initialBaseMap.addTo(map);

  const layerControl = L.control.layers(baseMaps, null, {
    position: "topright",
    collapsed: true
  }).addTo(map);

  const layerToggle = layerControl.getContainer()?.querySelector(".leaflet-control-layers-toggle");
  if (layerToggle) {
    layerToggle.title = "Skift kortvisning";
    layerToggle.setAttribute("aria-label", "Skift kortvisning");
  }

  map.on("baselayerchange", event => {
    localStorage.setItem("ravradar-basemap", event.layer === satelliteMap ? "satellite" : "street");
    layerControl.collapse();
  });

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
