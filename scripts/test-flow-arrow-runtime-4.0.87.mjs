import fs from 'node:fs/promises';
const app=await fs.readFile('app.js','utf8');
const mapView=await fs.readFile('js/map/map-view.js','utf8');
const siteTest=await fs.readFile('js/services/site-function-test-service.js','utf8');
const failures=[];
const need=(ok,msg)=>{if(!ok)failures.push(msg)};
need(app.includes("setTimeout(installArrows,0)"),'Pileinstallationen er ikke deterministisk planlagt.');
need(app.includes("ravradar:flow-arrows-ready")&&app.includes("ravradar:flow-arrows-failed"),'Pilelaget mangler entydig runtime-status.');
need(app.includes('flowArrowAttempts<2'),'Pilelaget mangler sikker engangs-retry ved reel installationsfejl.');
need(!app.includes('requestIdleCallback(installArrows'),'Pilelaget afhænger stadig af requestIdleCallback.');
need(mapView.includes('pane.style.zIndex = "440"'),'Pilepanelet ligger ikke sikkert over zone- og grænselag.');
need(mapView.includes('counts:()=>'),'Pilelaget eksponerer ikke faktiske markørtal.');
need(mapView.includes('function latLngFromPoint') && !mapView.includes('L.latLng(...pointFrom'), 'Pilefallback blander fortsat koordinat-array og L.LatLng.');
need(mapView.includes('Pile for zone kunne ikke vises'), 'En ugyldig zone kan stadig afbryde hele pilelaget.');
need(siteTest.includes("'Vind- og strømpile renderes'"),'Sitetesten kontrollerer ikke pilelaget.');
need(siteTest.includes("querySelectorAll('.flow-arrow.wind')")&&siteTest.includes("querySelectorAll('.flow-arrow.current')"),'Sitetesten tæller ikke faktiske vind- og strømpile.');
if(failures.length){console.error('Pile-runtime-test fejlede:\n- '+failures.join('\n- '));process.exit(1)}
console.log('OK: Pilelaget planlægges deterministisk, ligger synligt, rapporterer status og kontrolleres af sitetesten.');
