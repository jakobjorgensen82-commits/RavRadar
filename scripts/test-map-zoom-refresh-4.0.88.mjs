import fs from 'node:fs/promises';
const source = await fs.readFile('js/map/map-view.js','utf8');
const failures=[];
const need=(ok,msg)=>{if(!ok)failures.push(msg)};
need(source.includes('map.on("zoomend", refreshZoomStyles)'), 'Zonestregerne lytter ikke på zoomend.');
need(source.includes('requestAnimationFrame(() =>'), 'Zoomopdateringen mangler efter-animation redraw.');
need(source.includes('pair.casing.redraw()') && source.includes('pair.visible.redraw()') && source.includes('pair.hit.redraw()'), 'SVG-zonelag redrawes ikke eksplicit efter zoom.');
need(source.includes('cancelAnimationFrame(zoomFrame)'), 'Ventende zoom-redraw ryddes ikke sikkert.');
if(failures.length){console.error('Zoom-refresh-test fejlede:\n- '+failures.join('\n- '));process.exit(1)}
console.log('OK: Zonestreger opdateres og redrawes automatisk efter zoomanimation.');
