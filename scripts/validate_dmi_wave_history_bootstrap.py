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


def _reject_non_finite_json(_value: str) -> None:
    raise ValueError


def _read_bounded_json(path: Path, maximum_bytes: int, error_code: str) -> Any:
    try:
        size = path.stat().st_size
        if size < 2 or size > maximum_bytes:
            raise WaveBootstrapError(error_code)
        payload = path.read_bytes()
        if len(payload) != size:
            raise WaveBootstrapError(error_code)
        return json.loads(
            payload.decode("utf-8"),
            parse_constant=_reject_non_finite_json,
        )
    except WaveBootstrapError:
        raise
    except (OSError, UnicodeDecodeError, ValueError):
        raise WaveBootstrapError(error_code) from None


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
        )
        policy = policy_for_mode(args.mode)
        registry = load_coastal_part_registry(registry_document)
        summary = validate_wave_history_cache(
            cache_document,
            registry,
            target_hour=args.target_hour,
            policy=policy,
        )
        operational = validate_wave_operational_handoff_cache(
            cache_document,
            registry,
            bootstrap_target_hour=args.target_hour,
            production_target_hour=args.production_target_hour,
            forecast_hour_count=args.forecast_hour_count,
        )
        attestation = summary.sanitized_attestation()
        attestation["operationalHandoff"] = operational.sanitized_attestation()
        print(json.dumps(
            attestation,
            ensure_ascii=True,
            sort_keys=True,
            separators=(",", ":"),
        ))
        return 0
    except WaveBootstrapError as exc:
        print(json.dumps(
            {"code": exc.code, "status": "invalid"},
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
