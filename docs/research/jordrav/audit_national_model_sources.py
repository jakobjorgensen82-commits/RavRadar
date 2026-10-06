"""Inventory every original material/landscape attribute, without region filters."""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys
import shapefile
from audit_stenstrup_contacts import checked_cache, digest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts/lib"))
from jordrav_model import MODEL, group, landscape_group


def audit(source_root):
    rows, anomalies = [], []
    for key, relative, encoding in [
        ("soil", "soil-qgis/QGIS/Jordart_25000_v7_1.shp", "utf-8"),
        ("older_soil", "soil-200k/jordart_200000.shp", "cp1252"),
        ("geomorphology", "Shape_format/Geomorfologi.shp", "utf-8")]:
        meta, _wkb, binding = checked_cache(source_root, key)
        source = source_root / relative
        if digest(source) != binding["shpSha256"] or digest(source.with_suffix(".dbf")) != binding["dbfSha256"]:
            raise ValueError("Original source identity changed")
        reader = shapefile.Reader(str(source), encoding=encoding)
        cached = {source_id: attrs for attrs, source_id, _delta in meta["attributes"]}
        codes, depth_codes, symbols, labels = Counter(), Counter(), Counter(), Counter()
        verified = 0
        for source_id, record in enumerate(reader.iterRecords()):
            attrs = {k: (v.isoformat() if hasattr(v, "isoformat") else v)
                     for k, v in record.as_dict().items()}
            if source_id in cached:
                if attrs != cached[source_id]:
                    raise ValueError(f"Original/cache attributes differ: {key}/{source_id}")
                verified += 1
            if key == "geomorphology":
                label = attrs["landskab"]
                labels[(label, landscape_group(label))] += 1
                if landscape_group(label) == "missing":
                    raise ValueError("Unmapped named landscape: " + label)
            else:
                upper = attrs["TSYM"] if key == "older_soil" else attrs["jsym1"]
                lower = "" if key == "older_soil" else attrs["jsym2"]
                symbol = attrs["TSYM"] if key == "older_soil" else attrs["tsym"]
                family = group(upper, key == "older_soil")
                codes[(upper, family)] += 1
                depth_codes[lower] += 1
                symbols[symbol] += 1
                lookup = "olderGroups" if key == "older_soil" else "newerGroups"
                from jordrav_model import RULES
                known = {c for values in RULES[lookup].values() for c in values}
                if any(c not in known for c in upper.split("-")) and upper not in ("HV-L", "HV-S"):
                    anomalies.append({"source":key,"sourceId":source_id,"surface":upper,"depth":lower,"symbol":symbol,
                                      "classification":"unresolved","note":"Original value retained; no substitution from lower or display symbol"})
        if verified != len(cached):
            raise ValueError("Not every retained source attribute verified")
        rows.append({"source":key,"binding":binding,"originalRecords":len(reader),"verifiedRetainedRecords":verified,
                     "historicallyAuditedCollapsedRecords":len(reader)-verified,
                     "upperCodes":[{"code":c,"material":m,"records":n} for (c,m),n in sorted(codes.items())],
                     "depthCodes":dict(sorted(depth_codes.items())),"displaySymbols":dict(sorted(symbols.items())),
                     "landscapes":[{"label":label,"process":p,"records":n} for (label,p),n in sorted(labels.items())]})
    return {"status":"PASS","modelVersion":MODEL,"scope":"Whole-national original attribute inventory; no field-depth or amber verification",
            "scriptSha256":digest(Path(__file__)),"modelCodeSha256":digest(ROOT / "scripts/lib/jordrav_model.py"),
            "rulesSha256":digest(ROOT / "data/jordrav/model-rules.json"),"layers":rows,"explicitOriginalAnomalies":anomalies,
            "countNote":"Actual upper combinations, display symbols and product-defined types are different counts; no missing type invented"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True)
    args = parser.parse_args()
    result = audit(args.source_root)
    path = Path(__file__).with_name("national-model-0.2-source-inventory.json")
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"status":result["status"],"verifiedRecords":sum(r["verifiedRetainedRecords"] for r in result["layers"]),"anomalies":len(result["explicitOriginalAnomalies"])}))
