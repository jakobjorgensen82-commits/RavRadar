"""Static scientific comparison from the audited regional geometry, no network."""
import argparse
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch, PathPatch
from matplotlib.path import Path as PlotPath
from shapely.geometry import shape
from shapely.geometry.polygon import orient

from audit_stenstrup_field_context import polygonal


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def draw(ax, geometry, colour, origin, edge="none", width=0):
    geometry = polygonal(geometry)
    polygons = geometry.geoms if geometry.geom_type == "MultiPolygon" else [geometry]
    for polygon in polygons:
        if polygon.is_empty:
            continue
        polygon = orient(polygon, sign=1.0)
        vertices, commands = [], []
        for ring in [polygon.exterior, *polygon.interiors]:
            xy = [((x-origin[0])/1000, (y-origin[1])/1000) for x, y in ring.coords]
            vertices.extend(xy)
            commands.extend([PlotPath.MOVETO]+[PlotPath.LINETO]*(len(xy)-2)+[PlotPath.CLOSEPOLY])
        ax.add_patch(PathPatch(PlotPath(vertices, commands), facecolor=colour,
                               edgecolor=edge, linewidth=width))


def build(audit_path, geometry_path, output):
    audit = json.loads(audit_path.read_bytes())
    if audit["status"] != "PASS" or digest(geometry_path) != audit["geometrySha256"]:
        raise ValueError("Figure input has not passed the bound audit")
    features = json.loads(geometry_path.read_bytes())["features"]
    lake = shape(next(f["geometry"] for f in features if f["properties"]["kind"] == "lake"))
    x0, y0, x1, y1 = lake.bounds
    origin = (x0, y0)
    groups = {}
    for feature in features:
        kind = feature["properties"]["kind"]
        if kind == "lake":
            continue
        key = feature["properties"]["key"]
        key = tuple(key) if isinstance(key, list) else key
        groups.setdefault(kind, {})[key] = shape(feature["geometry"])
    selected = "Udvalgte korn-, majs-, raps- og andre dyrkningsafgrøder"
    palettes = {
        "geology": {"TS": ("#d4b265", "TS: smeltevandssand"),
                    "TL": ("#7c8bc0", "TL: smeltevandsler"),
                    "FT": ("#51866b", "FT: ferskvandstørv"),
                    "FP": ("#83ad9d", "FP: ferskvandsgytje")},
        "cropContext": {selected: ("#cb952b", "Udvalgte dyrkningsafgrøder"),
                        "Græs i omdrift": ("#aad39c", "Græs i omdrift"),
                        "Permanent græs": ("#408564", "Permanent græs"),
                        "Brak": ("#b4a1c8", "Brak"),
                        "Træer og skov": ("#36594b", "Træer og skov"),
                        "Andre registrerede anvendelser": ("#c6c1b5", "Andre anvendelser")},
        "publishedJB": {(3, "Grov lerblandet sandjord"): ("#f4db94", "JB3"),
                        (4, "Fin lerblandet sandjord"): ("#d8af50", "JB4"),
                        (5, "Grov sandblandet lerjord"): ("#a7bed8", "JB5"),
                        (6, "Fin sandblandet lerjord"): ("#688bb9", "JB6 (se metodeforbehold)"),
                        (7, "Lerjord"): ("#384b7d", "JB7"),
                        (11, "Humusjord"): ("#649b81", "JB11"),
                        ("ambiguous", "Overlappende kildegrænser"): ("#aa2864", "Grænseoverlap (815 m²)")}}
    fig, axes = plt.subplots(1, 3, figsize=(16, 7.8), sharex=True, sharey=True)
    titles = [("geology", "Geologisk materiale\nGEUS' øvre aflejring under pløjelaget"),
              ("cropContext", "Registreret markanvendelse 2026\nIngen observation af dagens pløjning"),
              ("publishedJB", "Publiceret jordbundskort 2024\nJB-klasser; topjordstolkning uafklaret")]
    for ax, (kind, title) in zip(axes, titles):
        draw(ax, lake, "#ededed", origin)
        handles, other = [], False
        for key, geom in groups[kind].items():
            if key in palettes[kind]:
                colour, label = palettes[kind][key]
            else:
                colour, label = "#bea98d", "Øvrige geologiske symboler"
                if not other:
                    handles.append(Patch(facecolor=colour, label=label))
                other = True
            draw(ax, geom, colour, origin)
            if key in palettes[kind]:
                handles.append(Patch(facecolor=colour, label=label))
        draw(ax, lake, "none", origin, edge="#444444", width=.55)
        if kind != "geology":
            handles.append(Patch(facecolor="#ededed", label="Ingen registrering / kortværdi"))
        ax.set_xlim(-.15, (x1-x0)/1000+.15)
        ax.set_ylim(-.15, (y1-y0)/1000+.15)
        ax.set_aspect("equal")
        ax.set_title(title, fontsize=11)
        ax.set_xlabel("Østafstand (km)")
        ax.legend(handles=handles, loc="upper left", bbox_to_anchor=(0, -.18),
                  frameon=False, fontsize=9, ncol=1)
    axes[0].set_ylabel("Nordafstand (km)")
    fig.suptitle("Stenstrup: materiale, markanvendelse og jordbundskontekst", fontsize=16, y=.98)
    fig.text(.04, .91, "Samme GEUS-issøflade i alle tre kort: 19,284 km² • registrerede markarealer: 12,853 km² (66,65 %)", fontsize=10)
    fig.text(.04, .025, "Egne skæringer i EPSG:25832. Akser fra fladens vest-/sydkant. Hvide huller ligger uden for den valgte issøgeometri.\n"
             "Ingen farve dokumenterer rav, lagdybde eller jagtbarhed. Små JB-grænseoverlap er bevaret særskilt; de kan ikke opløses på figurens skala.", fontsize=9)
    fig.subplots_adjust(left=.055, right=.985, top=.84, bottom=.40, wspace=.10)
    fig.savefig(output, dpi=160)
    plt.close(fig)
    return {"status": "PASS", "scope": "Figure input/output identities; visual review is separate",
            "scriptSha256": digest(Path(__file__)), "auditSha256": digest(audit_path),
            "geometrySha256": digest(geometry_path), "figureSha256": digest(output),
            "matplotlibVersion": matplotlib.__version__}


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--audit", required=True, type=Path)
    p.add_argument("--geometry", required=True, type=Path)
    p.add_argument("--figure", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    args = p.parse_args()
    if args.figure.suffix != ".png" or args.output.suffix != ".json":
        raise ValueError("Figure outputs must be PNG and a JSON binding")
    if args.output.resolve() in (args.audit.resolve(), args.geometry.resolve()):
        raise ValueError("Figure binding may not overwrite its research inputs")
    root = Path(__file__).resolve().parents[3]
    for destination in (args.figure, args.output):
        if root / "data" in destination.resolve().parents:
            raise ValueError("Research output may not overwrite model data")
    result = build(args.audit, args.geometry, args.figure)
    args.output.write_text(json.dumps(result, indent=2)+"\n", encoding="utf-8", newline="\n")
    print(json.dumps(result))
