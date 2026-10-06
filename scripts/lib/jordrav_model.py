"""Pure qualitative jordrav rules; no GIS, database or network dependencies."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RULES_PATH = ROOT / "data/jordrav/model-rules.json"
RULES = json.loads(RULES_PATH.read_text(encoding="utf-8"))
MODEL = RULES["modelVersion"]


def group(code, older=False):
    lookup = RULES["olderGroups" if older else "newerGroups"]
    if code in ("HV-L", "HV-S") and not older:
        return "marine-fine"
    groups = {next((name for name, codes in lookup.items() if part in codes),
                   "unresolved") for part in code.split("-")}
    if "unresolved" in groups:
        return "unresolved"
    return groups.pop() if len(groups) == 1 else "mixed"


def landscape_group(label):
    return next((key for key, labels in RULES["landscapeGroups"].items()
                 if label in labels), "missing")


def constituents(code, older=False):
    """Keep side-by-side material mixtures; never substitute the depth code."""
    if code in ("HV-L", "HV-S") and not older:
        return {"marine-fine"}
    return {group(part, older) for part in code.split("-")}


def classify(surface, depth, landscape, older=False):
    material = group(surface, older)
    process = landscape_group(landscape)
    materials = constituents(surface, older)
    covered = bool(materials & {"aeolian-cover", "organic-cover"})
    depth_materials = constituents(depth, older) if depth else {"unresolved"}
    transport = process in RULES["reworkingProcesses"]
    receiver = process in RULES["receiverProcesses"]
    marine = materials <= set(RULES["marineMaterials"])
    fresh = materials <= set(RULES["freshMaterials"])
    lake_codes = bool(set(surface.split("-")) & set(RULES["iceLakeCodes"])) and not older
    if material == "unresolved" or process == "unresolved":
        potential = "unresolved"
    elif material == "rock":
        potential = "limited"
    elif covered and (receiver or ((transport or process == "cover") and
                                 depth_materials <= set(RULES["receiverDepthMaterials"]))):
        potential = "covered"
    elif [material, process] in RULES["enhancedPairs"]:
        potential = "enhanced"
    elif not covered and marine:
        potential = "coastal"
    elif not covered and (fresh or lake_codes or
                          (process == "basin" and materials <= set(RULES["basinMaterials"]))):
        potential = "basin"
    elif not covered and transport and materials <= set(RULES["reworkingMaterials"]):
        potential = "reworked"
    else:
        potential = "possible"
    accessibility = ("unknown" if older or material == "unresolved" else
                     "covered" if covered else
                     "layered" if surface != depth else "unknown")
    return {"potential": potential, "material": material, "process": process,
            "accessibility": accessibility, "confidence": "weak"}
