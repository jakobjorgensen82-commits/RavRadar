"""One fail-closed owner policy for native DMI WAM coastal targets.

The public coastal classification remains the default routing rule.  Two
versioned PART exceptions are assigned to WAM-DW because the audited WAM masks
show that WAM-NSB cannot provide a valid cell inside its approved distance
limit, while WAM-DW can.  This module contains no coordinates and changes no
sampling geometry.
"""
from __future__ import annotations

from typing import Any, Mapping


WAVE_OWNER_POLICY_ID = "coast-type-exact-part-overrides-v2"
WAM_DW = "wam_dw"
WAM_NSB = "wam_nsb"
WAM_COLLECTIONS = frozenset({WAM_DW, WAM_NSB})
VALID_COAST_TYPES = frozenset({"east", "limfjord", "west"})

# Exact, audited identifiers only.  Do not broaden this to a parent zone or a
# dynamic nearest-model rule: every other native PART keeps the coast rule.
WAM_DW_PART_OVERRIDES = frozenset({
    "dk-b10-10-national-part-02-locality-02",
    "dk-b10-10-national-part-03",
})


def wave_owner_collection(part_id: str | None, coast_type: Any) -> str:
    """Return the single native WAM owner or fail on unrecognised metadata."""
    if not isinstance(coast_type, str) or coast_type not in VALID_COAST_TYPES:
        raise ValueError("Native WAM coast type is invalid")
    if part_id is not None and (
        not isinstance(part_id, str) or not part_id or part_id != part_id.strip()
    ):
        raise ValueError("Native WAM part id is invalid")
    if part_id in WAM_DW_PART_OVERRIDES:
        # A coast-type change is a material registry change and must be audited,
        # not silently accepted by this narrowly approved exception.
        if coast_type != "west":
            raise ValueError("Native WAM owner override no longer matches its registry")
        return WAM_DW
    return WAM_NSB if coast_type == "west" else WAM_DW


def target_part_id(target: Mapping[str, Any]) -> str | None:
    """Read an exact PART id from public or private-stage target metadata."""
    value = target.get("partId")
    if isinstance(value, str) and value:
        return value
    entity_id = target.get("id")
    if isinstance(entity_id, str) and entity_id.startswith("PART::"):
        return entity_id.removeprefix("PART::")
    return None


def wave_owner_for_target(target: Mapping[str, Any]) -> str:
    if not isinstance(target, Mapping):
        raise ValueError("Native WAM target is invalid")
    return wave_owner_collection(target_part_id(target), target.get("coastType"))


def wave_owner_by_cache_key(
    parts: Any,
    zone_coast_types: Mapping[str, str],
) -> dict[str, str]:
    """Build an exact owner map for a validated CoastalPartRegistry."""
    owners: dict[str, str] = {}
    for part in parts:
        coast_type = zone_coast_types.get(part.parent_zone_id)
        owner = wave_owner_collection(part.part_id, coast_type)
        if part.cache_key in owners:
            raise ValueError("Native WAM owner registry contains duplicates")
        owners[part.cache_key] = owner
    return owners
