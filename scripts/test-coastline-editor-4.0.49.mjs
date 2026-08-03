import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyAnchor,
  applyOverridesToCollection,
  createOverride,
  insertPoint,
  movePoint,
  removePoint,
  validateCoastLine
} from '../js/core/coastline-editor-model.js';

const line = [[10,56],[10.01,56.01],[10.02,56.02]];
assert.equal(insertPoint(line,1,[10.005,56.005]).length,4);
assert.deepEqual(movePoint(line,1,[11,57])[1],[11,57]);
assert.equal(removePoint(line,1).length,2);
assert.equal(removePoint([[10,56],[10.1,56.1]],0).length,2,'minimum two points must be preserved');
const anchored = applyAnchor(line,[10.011,56.012],1);
assert.notDeepEqual(anchored,line,'anchor must reshape line');
assert.equal(validateCoastLine(line,line).valid,true);
assert.equal(validateCoastLine([[1,1],[2,2]],line).valid,false);

const zone = {type:'Feature',properties:{id:'DK-TEST',name:'Test',coastLine:line,coastLineSource:'baseline'},geometry:{type:'Polygon',coordinates:[]}};
const override = createOverride(zone,anchored,'test','Nyt zonenavn');
assert.equal(override.status,'published');
assert.equal(override.published,true);
const collection = applyOverridesToCollection({type:'FeatureCollection',features:[zone]},{'DK-TEST':override});
assert.deepEqual(collection.features[0].geometry,zone.geometry,'polygon geometry must remain unchanged');
assert.deepEqual(collection.features[0].properties.coastLine,anchored);
assert.equal(collection.features[0].properties.name,'Nyt zonenavn');
assert.equal(collection.features[0].properties.coastLineSource,'admin-manual-editor');

const html = fs.readFileSync(new URL('../admin.html',import.meta.url),'utf8');
const dashboard = fs.readFileSync(new URL('../js/ui/admin-dashboard.js',import.meta.url),'utf8');
const editor = fs.readFileSync(new URL('../js/ui/admin-coastline-editor.js',import.meta.url),'utf8');
assert.match(html,/data-tab="coastlineEditor"/);
assert.match(dashboard,/loadAdminDocument\('coastline-overrides'/);
assert.match(dashboard,/saveAdminDocumentNow\('coastline-overrides'/);
assert.match(editor,/Gem ændringer/);
assert.match(editor,/Zonenavn/);
assert.match(editor,/Flyt kort/);
assert.match(editor,/Præcis redigering/);
assert.doesNotMatch(editor,/Gem zonekladde|Slet kladde|Eksportér kladdebackup|Eksportér valideret zones\.geojson/);
assert.match(editor,/Sæt strandmarkører/);
console.log('✓ kystlinjeeditor: central gemning, zonenavn, geometri og bevarede redigeringstilstande');
