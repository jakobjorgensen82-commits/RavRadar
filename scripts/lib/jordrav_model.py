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


def classify(surface, depth, landscape, older=False):
    material = group(surface, older)
    process = landscape_group(landscape)
    if material == "unresolved" or process == "unresolved":
        potential = "unresolved"
    elif material == "rock":
        potential = "limited"
    elif [material, process] in RULES["enhancedPairs"]:
        potential = "enhanced"
    else:
        potential = "possible"
    accessibility = ("unknown" if older or material == "unresolved" else
                     "covered" if material in ("aeolian-cover", "organic-cover") else
                     "layered" if surface != depth else "near-surface")
    return {"potential": potential, "material": material, "process": process,
            "accessibility": accessibility, "confidence": "weak"}
