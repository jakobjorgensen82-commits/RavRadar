import fs from "node:fs";
import assert from "node:assert/strict";

const workflow = fs.readFileSync(".github/workflows/update-and-deploy.yml", "utf8");
const generator = fs.readFileSync("scripts/generate-production-coastlines-4.0.47.py", "utf8");
const zones = JSON.parse(fs.readFileSync("data/zones.geojson", "utf8"));

assert.match(workflow, /countries-coastline-100m@0\.6\.0\/map\.geo\.json/);
assert.match(workflow, /generate-production-coastlines-4\.0\.47\.py/);
assert.match(workflow, /--minimum-generated 190/);
assert.match(generator, /4\.0\.44 audited rollback geometry/);
assert.match(generator, /compact harbour\/pier hairpins bridged/);
assert.match(generator, /os\.replace\(tmp_path, zones_path\)/);
assert.equal(zones.features.filter(f => f.properties?.zoneStatus === "active").length, 210);
console.log("Production coastline workflow integration passed");
