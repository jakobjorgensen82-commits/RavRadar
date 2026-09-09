"""Narrow compatibility policy for retained, already-decoded DMI current rows.

Raw GRIB reuse remains bound to an exact processing signature.  This module is
only for canonical retained row/proof validation after an audited native
ecCodes patch transition that did not change nearest/value decoding.
"""
from __future__ import annotations

import re
from typing import Any


_SIGNATURE = re.compile(
    r"parser:([0-9]{1,5})\|params:([0-9]{1,5})\|grid:([0-9]{1,5})"
    r"\|eccodes-api:([A-Za-z0-9._+-]{1,48})"
    r"\|eccodes-binding:([A-Za-z0-9._+-]{1,48})"
    r"\|zones:([a-f0-9]{16})"
)
_AUDITED_DECODER_APIS = frozenset({"2.48.0", "2.48.2"})
_AUDITED_BINDING = "2.48.0"
_AUDITED_PIPELINE = ("20", "4", "9")


def retained_current_processing_signature_compatible(
    stored: Any,
    expected: Any,
) -> bool:
    """Return true only for exact identity or the reviewed 2.48.0→2.48.2 class."""
    if not isinstance(stored, str) or not isinstance(expected, str):
        return False
    if stored == expected:
        return True
    left = _SIGNATURE.fullmatch(stored)
    right = _SIGNATURE.fullmatch(expected)
    if left is None or right is None:
        return False
    return bool(
        left.groups()[:3] == right.groups()[:3] == _AUDITED_PIPELINE
        and left.group(6) == right.group(6)
        and left.group(5) == right.group(5) == _AUDITED_BINDING
        and {left.group(4), right.group(4)} <= _AUDITED_DECODER_APIS
    )
