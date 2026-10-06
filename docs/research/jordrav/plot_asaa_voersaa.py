"""Static figure of audited coastal context; no new classification or network."""
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from shapely.geometry import shape

from audit_stenstrup_contacts import digest
from plot_stenstrup_field_context import draw


def build(audit_path, geometry_path, output):
    audit = json.loads(audit_path.read_bytes())
    if audit["status"] != "PASS" or digest(geometry_path) != audit["geometrySha256"]:
        raise ValueError("Figure input binding differs")
    features = json.loads(geometry_path.read_bytes())["features"]
    corridor = shape(next(f["geometry"] for f in features if f["properties"]["kind"] == "corridor"))
    x0, y0, x1, y1 = corridor.bounds
    origin = (x0, y0)
    groups = {kind: {} for kind in ("soil", "landscape", "crop")}
    for f in features:
        kind = f["properties"]["kind"]
        if kind in groups:
            key = f["properties"]["key"]
            groups[kind][tuple(key) if isinstance(key, list) else key] = shape(f["geometry"])
    palettes = {
        "soil": {("HS", "HS"): ("#dfc782", "HS/HS: marint sand"),
                 ("ES", "ES"): ("#e4d9b5", "ES/ES: flyvesand"),
                 ("ES", "HS"): ("#bdae76", "ES/HS: flyvesand / marint sand"),
                 ("DL", "DL"): ("#949bb6", "DL/DL: smeltevandsler"),
                 ("FT", "FT"): ("#719d8a", "FT/FT: ferskvandstørv")},
        "landscape": {"Marin flade": ("#84b7d2", "Marin flade"),
                      "Erosionsdal": ("#c0d8af", "Erosionsdal"),
                      "Klit": ("#ddcc95", "Klit"),
                      "Antropogent landskab": ("#bda3ad", "Antropogent landskab")},
        "crop": {"Udvalgte korn-, majs-, raps- og andre dyrkningsafgrøder": ("#bd902f", "Udvalgte dyrkningsafgrøder"),
                 "Permanent græs": ("#5b917a", "Permanent græs"), "Græs i omdrift": ("#a5c496", "Græs i omdrift"),
                 "Brak": ("#bfa5cf", "Brak"), "Træer og skov": ("#466754", "Træer og skov"),
                 "Andre registrerede anvendelser": ("#b8b3a7", "Andre anvendelser")}}
    fig, axes = plt.subplots(1, 3, figsize=(13, 9), sharex=True, sharey=True)
    for ax, (kind, title) in zip(axes, (("soil", "Geologiske symbolpar\nunder pløjelaget"),
                                      ("landscape", "Kortlagt landskabsproces"),
                                      ("crop", "Registreret markanvendelse 2026"))):
        draw(ax, corridor, "#eeeeee", origin)
        handles = [Patch(facecolor="#eeeeee", label="Ingen kortværdi / registrering")]
        for key, geom in groups[kind].items():
            colour, label = palettes[kind][key]
            draw(ax, geom, colour, origin)
            handles.append(Patch(facecolor=colour, label=label))
        draw(ax, corridor, "none", origin, edge="#444444", width=.6)
        ax.set_xlim(-.15, (x1-x0)/1000+.15)
        ax.set_ylim(-.15, (y1-y0)/1000+.15)
        ax.set_aspect("equal")
        ax.set_title(title, fontsize=11)
        ax.set_xlabel("Østafstand (km)")
        ax.legend(handles=handles, loc="upper left", bbox_to_anchor=(0, -.14), frameon=False, fontsize=8)
        ax.text(.99, .98, "N ↑", transform=ax.transAxes, ha="right", va="top", fontsize=10)
    axes[0].set_ylabel("Nordafstand (km)")
    fig.suptitle("Asaa–Voerså: kystflade og dyrkede marker mellem vej og strand", fontsize=15, y=.98)
    fig.text(.055, .91, "Eksplicit analyseudsnit: 4,054 km² • HS/HS: 86,91 % • Marin flade: 95,32 %\n"
             "Eksisterende regler: hele den fælles native GEUS-dækning bliver generel klasse; ingen orange udpegning.", fontsize=10)
    fig.subplots_adjust(top=.84, bottom=.26, left=.065, right=.98, wspace=.19)
    fig.text(.055, .015, "GEUS native kildepolygoner + offentlige Marker 2026 + arkiveret OSM-vej/kystlinje. Egne skæringer i EPSG:25832.\n"
             "Nord-/sydsnit er analysevalg; området er ikke en fundgrænse. Huller og forskellige kystgrænser bevares.\n"
             "Farver viser materiale, proces og markkontekst; ingen farve dokumenterer rav, pløjning eller jagtbarhed. © OpenStreetMap contributors, ODbL.", fontsize=8)
    fig.savefig(output, dpi=160)
    plt.close(fig)
    return {"status": "PASS", "scope": "Figure input/output identity only; visual inspection separate",
        "auditSha256": digest(audit_path), "geometrySha256": digest(geometry_path),
        "scriptSha256": digest(Path(__file__)), "sharedDrawScriptSha256": digest(Path(__file__).with_name("plot_stenstrup_field_context.py")),
        "figureSha256": digest(output), "figure": output.name,
        "matplotlibVersion": matplotlib.__version__, "notAnAmberMap": True}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("audit", "geometry", "figure", "output"):
        parser.add_argument("--" + flag, type=Path, required=True)
    args = parser.parse_args()
    result = build(args.audit, args.geometry, args.figure)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(result))
