// Optional nationwide public raster outlines. No feature-info, crop, owner
// or GPS queries; administrative field registration is not ploughing evidence.
export const FIELD_SERVICE = Object.freeze({
  url:'https://geodata.fvm.dk/geoserver/ows', layer:'Marker:Marker_2026',
  year:2026, minZoom:12,
  source:'https://lbst.dk/bedrift/arealer-og-ejendomme/kortdata/adgang-til-kortdata'
});
const symbolizer = (colour, width) => `<PolygonSymbolizer><Stroke><CssParameter name="stroke">${colour}</CssParameter><CssParameter name="stroke-width">${width}</CssParameter></Stroke></PolygonSymbolizer>`;
export const FIELD_STYLE = `<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld"><NamedLayer><Name>${FIELD_SERVICE.layer}</Name><UserStyle><FeatureTypeStyle><Rule>${symbolizer('#ffffff',3)}${symbolizer('#222222',1)}</Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

export function initialiseFieldContext(map, checkbox, status, tr, leaflet) {
  const pane = map.createPane('jordrav-fields');
  pane.style.zIndex = '450'; pane.style.pointerEvents = 'none';
  const layer = leaflet.tileLayer.wms(FIELD_SERVICE.url, {
    layers:FIELD_SERVICE.layer, styles:'', version:'1.1.1', format:'image/png',
    transparent:true, sld_body:FIELD_STYLE, pane:'jordrav-fields',
    minZoom:FIELD_SERVICE.minZoom, maxZoom:17, updateWhenIdle:true,
    keepBuffer:0, opacity:.9, attribution:'Marker 2026 © SGAV'
  });
  let failed = false, loading = false;
  const sync = () => {
    const enabled = checkbox.checked;
    const near = map.getZoom() >= FIELD_SERVICE.minZoom;
    if (enabled && near) layer.addTo(map); else layer.remove();
    status.hidden = !enabled;
    status.textContent = tr(!near ? 'fieldsZoom' : failed ? 'fieldsFailed' : loading ? 'fieldsLoading' : 'fieldsReady');
    status.classList.toggle('jordrav-error', enabled && near && failed);
  };
  // Keep an error visible for this viewport; later success must not hide a
  // missing tile. Retrying clears the whole batch and requests it afresh.
  layer.on('loading', () => {failed=false;loading=true;sync();});
  layer.on('tileerror', () => {failed=true;sync();});
  layer.on('load', () => {loading=false;sync();});
  checkbox.addEventListener('change', sync);
  map.on('moveend', sync);
  sync();
  return layer;
}
