"""Independent artifact readback: every tile, original feature and explanation."""
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import sys
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[3]
OLD = ROOT / "data/jordrav/prototype-0.1.0"
NEW = ROOT / "data/jordrav/prototype-0.2.0"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(base, entry):
    path = base / entry["file"]
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == entry["sha256"]
    assert len(raw) == entry["bytes"]
    decoded = gzip.decompress(raw) if path.suffix == ".gz" else raw
    assert len(decoded) == entry["decodedBytes"]
    return json.loads(decoded)


def verify():
    old_manifest = json.loads((OLD / "manifest.json").read_bytes())
    new_manifest = json.loads((NEW / "manifest.json").read_bytes())
    build_path = Path(__file__).with_name("national-model-0.2-build-audit.json")
    build = json.loads(build_path.read_bytes())
    assert sha(OLD / "manifest.json") == build["historicalManifestSha256"]
    assert sha(NEW / "manifest.json") == build["manifestSha256"]
    assert new_manifest["modelVersion"] == "0.2.0-prototype"
    load(OLD, old_manifest["overview"])
    load(OLD, old_manifest["rules"])
    old_catalog = load(OLD, old_manifest["catalog"])["entries"]
    catalog = load(NEW, new_manifest["catalog"])["entries"]
    assert len(catalog) == len(old_catalog) == 4652
    mutable = {"potential","material","process","accessibility","confidence"}
    for old, new in zip(old_catalog, catalog):
        assert {k:v for k,v in old.items() if k not in mutable} == {k:v for k,v in new.items() if k not in mutable}
        assert new["confidence"] == "weak"
        assert new["accessibility"] in {"unknown","covered","layered"}
        if old["potential"] == "unresolved":
            assert new["potential"] == "unresolved"
    assert load(NEW,new_manifest["rules"]) == json.loads((ROOT / "data/jordrav/model-rules.json").read_bytes())
    assert [t["id"] for t in old_manifest["tiles"]] == [t["id"] for t in new_manifest["tiles"]]
    counts, landscape_counts, sources = Counter(), Counter(), Counter()
    fixtures, tile_rows = {}, []
    for old_meta, new_meta in zip(old_manifest["tiles"],new_manifest["tiles"]):
        old = load(OLD, old_meta)
        new = load(NEW, new_meta)
        assert new["modelVersion"] == new_manifest["modelVersion"]
        assert old["features"] == new["features"], "Geometry, origins or bounds changed"
        assert {k:v for k,v in old.items() if k != "modelVersion"} == {k:v for k,v in new.items() if k != "modelVersion"}
        assert new_meta["bbox"] == old_meta["bbox"]
        local = Counter()
        for feature in new["features"]:
            entry = catalog[feature["properties"]["i"]]
            category = entry["potential"]
            counts[category] += 1; local[category] += 1
            landscape_counts[entry["landscape"]] += 1
            sources[entry["source"]] += 1
            if category in {"coastal","basin","covered","reworked"}:
                g = shape(feature["geometry"])
                if g.area > fixtures.get(category, {}).get("displayAreaDegrees2",0):
                    p = g.representative_point()
                    fixtures[category] = {"class":category,"longitude":p.x,"latitude":p.y,"origin":feature["properties"]["o"],
                        "surface":entry["surface"],"landscape":entry["landscape"],"displayAreaDegrees2":g.area}
        tile_rows.append({"tile":new_meta["id"],"unchangedFeatures":len(new["features"]),"classes":dict(local),"bbox":new_meta["bbox"]})
        if len(tile_rows)%24==0:
            print(json.dumps({"independentTilesVerified":len(tile_rows)}),flush=True)
    assert len(tile_rows) == 192 and sum(counts.values()) == 505834
    assert dict(counts) == build["featureCountByClass"]
    assert set(counts) == {"enhanced","coastal","basin","reworked","covered","possible","limited","unresolved"}
    overview = load(NEW,new_manifest["overview"])
    overview_tiles = set()
    for feature in overview["features"]:
        assert feature["properties"]["potential"] in counts
        assert shape(feature["geometry"]).is_valid
        overview_tiles.add(feature["properties"]["tile"])
    assert overview_tiles == {t["id"] for t in new_manifest["tiles"]}
    assert any(t["bbox"][0]>14 for t in new_manifest["tiles"]), "Bornholm absent"
    result = {"status":"PASS","scope":"Every national artifact tile and feature; full structure equality to 0.1; overview validity. No amber/access verification",
              "scriptSha256":sha(Path(__file__)),"buildAuditSha256":sha(build_path),"manifestSha256":sha(NEW / "manifest.json"),
              "tiles":len(tile_rows),"features":sum(counts.values()),"catalogEntries":len(catalog),"detailStructuresUnchanged":True,
              "overviewTiles":len(overview_tiles),"classes":dict(counts),"sourceFeatureCounts":dict(sources),
              "landscapeFeatureCounts":dict(sorted(landscape_counts.items())),"browserFixtures":list(fixtures.values()),"tileChecks":tile_rows}
    path = Path(__file__).with_name("national-model-0.2-independent-verification.json")
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":"PASS","tiles":len(tile_rows),"features":sum(counts.values()),"classes":dict(counts)}))


if __name__ == "__main__":
    verify()
