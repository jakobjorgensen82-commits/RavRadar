"""Scheduling metadata only: a short confirmation is not an extended DMI turn."""

import copy
import math
from datetime import datetime, timedelta

EXTENDED_RUNTIME_SECONDS = 3600
COMPONENTS = ("wind", "wave", "current", "waterLevel", "waterTemperature")


def _known_short_budget(value):
    return type(value) in (int, float) and math.isfinite(value) and 0 <= value < EXTENDED_RUNTIME_SECONDS


def _utc_instant(value):
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo is not None and parsed.utcoffset() == timedelta(0) else None
    except (TypeError, ValueError):
        return None


def retained_adaptive_recovery(cache):
    """Remove only a marker proved to have been written by a short invocation.

    Legacy long markers carried through a later short cache remain valid. An
    unknown budget is not evidence for removing an existing cooldown.
    """
    diagnostics = cache.get("diagnostics") or {}
    marker = diagnostics.get("adaptiveRecovery")
    if not isinstance(marker, dict):
        return None
    if _known_short_budget(marker.get("runtimeBudgetSeconds")):
        return None
    if "runtimeBudgetSeconds" not in marker:
        generated = _utc_instant(cache.get("generatedAt"))
        marked = _utc_instant(marker.get("lastExtendedAt"))
        if (generated is not None and marked == generated
                and _known_short_budget(diagnostics.get("runtimeBudgetSeconds"))):
            return None
    return copy.deepcopy(marker)


def next_adaptive_recovery(cache, *, requested, runtime_budget_seconds, generated_at, before_counts):
    marker = retained_adaptive_recovery(cache)
    if requested is not True or runtime_budget_seconds < EXTENDED_RUNTIME_SECONDS:
        return marker
    if (not isinstance(before_counts, dict)
            or any(type(before_counts.get(component)) is not int or before_counts[component] < 0
                   for component in COMPONENTS)):
        raise ValueError("DMI adaptive recovery needs the measured five-component baseline")
    return {
        "lastExtendedAt": generated_at,
        "runtimeBudgetSeconds": runtime_budget_seconds,
        "missingDmiPairsAtStart": {component: before_counts[component] for component in COMPONENTS},
    }
