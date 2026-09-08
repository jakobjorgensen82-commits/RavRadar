#!/usr/bin/env python3
"""Fail-closed CLI for private DMI WAM bootstrap history.

Output is intentionally aggregate-only: no wave values, coordinates, part ids,
STAC item ids or hrefs are emitted on either success or failure.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from lib.dmi_wave_history_bootstrap import (
    COLD_START_MODE,
    MIGRATION_MODE,
    WaveBootstrapError,
    load_coastal_part_registry,
    policy_for_mode,
    validate_wave_history_cache,
    validate_wave_operational_handoff_cache,
)


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE = ROOT / "data" / "live" / "dmi-bulk-cache.json"
DEFAULT_REGISTRY = ROOT / "data" / "live" / "coastal-parts-v2.json"
# The normal private cache carries complete per-component provenance for up to
# 673 PART rows and a bounded replay/future horizon. Keep a hard ceiling without
# rejecting the expected provenance-rich document.
MAX_CACHE_BYTES = 256 * 1024 * 1024
MAX_REGISTRY_BYTES = 16 * 1024 * 1024
HISTORY_INCOMPLETE_CODES = frozenset({
    "INTERPOLATION_GAP",
    "MISSING_HOUR",
    "NO_COHERENT_RUN",
})


class _BoundedJsonSizeError(WaveBootstrapError):
    """A cache-size rejection with aggregate-only diagnostics."""

    def __init__(self, actual_bytes: int, maximum_bytes: int) -> None:
        super().__init__("CACHE_SIZE_INVALID")
        self.actual_bytes = actual_bytes
        self.maximum_bytes = maximum_bytes


def _reject_non_finite_json(_value: str) -> None:
    raise ValueError


def _read_bounded_json(
    path: Path,
    maximum_bytes: int,
    error_code: str,
    *,
    detailed_cache_errors: bool = False,
) -> Any:
    try:
        size = path.stat().st_size
    except FileNotFoundError:
        raise WaveBootstrapError(
            "CACHE_MISSING" if detailed_cache_errors else error_code
        ) from None
    except OSError:
        raise WaveBootstrapError(
            "CACHE_IO_INVALID" if detailed_cache_errors else error_code
        ) from None
    if size < 2 or size > maximum_bytes:
        if detailed_cache_errors:
            raise _BoundedJsonSizeError(size, maximum_bytes)
        raise WaveBootstrapError(error_code)
    try:
        payload = path.read_bytes()
    except OSError:
        raise WaveBootstrapError(
            "CACHE_IO_INVALID" if detailed_cache_errors else error_code
        ) from None
    if len(payload) != size:
        raise WaveBootstrapError(
            "CACHE_IO_INVALID" if detailed_cache_errors else error_code
        )
    try:
        return json.loads(
            payload.decode("utf-8"),
            parse_constant=_reject_non_finite_json,
        )
    except (UnicodeDecodeError, ValueError):
        raise WaveBootstrapError(
            "CACHE_JSON_INVALID" if detailed_cache_errors else error_code
        ) from None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate private DMI WAM history without emitting private data.",
    )
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--target-hour", required=True)
    parser.add_argument("--production-target-hour", required=True)
    parser.add_argument("--forecast-hour-count", type=int, default=118)
    parser.add_argument(
        "--mode",
        required=True,
        choices=(MIGRATION_MODE, COLD_START_MODE),
    )
    return parser


def build_attestation(
    cache_document: Any,
    registry_document: Any,
    *,
    mode: str,
    target_hour: str,
    production_target_hour: str,
    forecast_hour_count: int,
) -> dict[str, Any]:
    """Validate direct operational WAM first, then classify older history.

    Only bounded absence inside a genuine cold-start history window may become
    HISTORY_INCOMPLETE.  Migration and every provenance, tuple, cell, run,
    registry or tamper error remain fail-closed.  The returned document is
    aggregate-only and contains no private rows or identifiers.
    """
    registry = load_coastal_part_registry(registry_document)
    operational = validate_wave_operational_handoff_cache(
        cache_document,
        registry,
        bootstrap_target_hour=target_hour,
        production_target_hour=production_target_hour,
        forecast_hour_count=forecast_hour_count,
    )
    policy = policy_for_mode(mode)
    try:
        summary = validate_wave_history_cache(
            cache_document,
            registry,
            target_hour=target_hour,
            policy=policy,
        )
    except WaveBootstrapError as exc:
        if mode != COLD_START_MODE or exc.code not in HISTORY_INCOMPLETE_CODES:
            raise
        attestation: dict[str, Any] = {
            "status": "ok",
            "schemaVersion": operational.sanitized_attestation()["schemaVersion"],
            "mode": mode,
            "registryPartCount": registry.part_count,
            "historyIncomplete": True,
            "historyIncompleteCode": exc.code,
        }
    else:
        attestation = summary.sanitized_attestation()
        attestation["historyIncomplete"] = False
    attestation["operationalHandoff"] = operational.sanitized_attestation()
    return attestation


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        registry_document = _read_bounded_json(
            args.registry,
            MAX_REGISTRY_BYTES,
            "REGISTRY_INVALID",
        )
        cache_document = _read_bounded_json(
            args.cache,
            MAX_CACHE_BYTES,
            "CACHE_INVALID",
            detailed_cache_errors=True,
        )
        attestation = build_attestation(
            cache_document,
            registry_document,
            mode=args.mode,
            target_hour=args.target_hour,
            production_target_hour=args.production_target_hour,
            forecast_hour_count=args.forecast_hour_count,
        )
        print(json.dumps(
            attestation,
            ensure_ascii=True,
            sort_keys=True,
            separators=(",", ":"),
        ))
        return 0
    except WaveBootstrapError as exc:
        failure: dict[str, Any] = {"code": exc.code, "status": "invalid"}
        if isinstance(exc, _BoundedJsonSizeError):
            failure["actualBytes"] = exc.actual_bytes
            failure["maximumBytes"] = exc.maximum_bytes
        print(json.dumps(
            failure,
            ensure_ascii=True,
            sort_keys=True,
            separators=(",", ":"),
        ))
        return 1
    except Exception:
        print('{"code":"CACHE_INVALID","status":"invalid"}')
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
