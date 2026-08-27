#!/usr/bin/env python3
"""Atomically promote one validated point candidate in central admin storage."""
from __future__ import annotations

import json
import os
import pathlib
import urllib.parse
import urllib.request
from typing import Any


ROOT = pathlib.Path(__file__).resolve().parents[1]
PENDING = ROOT / ".cache/coastal-point-staging/pending-promotion.json"
URL = os.getenv("SUPABASE_URL", "").rstrip("/")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def headers(*, write: bool = False) -> dict[str, str]:
    result = {"apikey": KEY}
    if not KEY.startswith("sb_secret_"):
        result["Authorization"] = "Bearer " + KEY
    if write:
        result.update({"Content-Type": "application/json", "Prefer": "return=representation"})
    return result


def request_json(url: str, *, method: str = "GET", payload: dict[str, Any] | None = None) -> Any:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=body, method=method, headers=headers(write=payload is not None))
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def central_row(document_key: str) -> dict[str, Any] | None:
    query = urllib.parse.urlencode({
        "document_key": f"eq.{document_key}",
        "select": "document_key,payload,version,updated_at",
        "limit": "1",
    })
    rows = request_json(f"{URL}/rest/v1/admin_documents?{query}")
    return rows[0] if isinstance(rows, list) and rows else None


def assert_requested_revisions(payload: dict[str, Any], revisions: set[str]) -> None:
    found = {
        str((review.get("stagedChange") or {}).get("revision"))
        for review in (payload.get("zones") or {}).values()
        if isinstance(review, dict)
        and (review.get("stagedChange") or {}).get("status") == "activation-requested"
    }
    if not revisions <= found:
        raise RuntimeError("Central candidate changed after readiness validation")


def main() -> int:
    if not PENDING.exists():
        print(json.dumps({"status": "noop", "reason": "no-pending-promotion"}))
        return 0
    if not URL or not KEY:
        raise RuntimeError("Supabase service credentials are required for atomic point activation")
    pending = json.loads(PENDING.read_text("utf-8"))
    document_key = str(pending.get("documentKey") or "")
    expected_version = int(pending.get("expectedVersion") or 0)
    promoted_payload = pending.get("payload")
    prepared_at = str(pending.get("preparedAt") or "")
    revisions = {str(value) for value in (pending.get("revisions") or []) if value}
    if document_key != "direction-reviews" or expected_version < 1 or not isinstance(promoted_payload, dict) or not revisions or not prepared_at:
        raise RuntimeError("Pending point promotion contract is invalid")
    before = central_row(document_key)
    if not before or int(before.get("version") or 0) != expected_version:
        raise RuntimeError("Central direction review version changed; refusing stale point activation")
    assert_requested_revisions(before.get("payload") or {}, revisions)
    query = urllib.parse.urlencode({
        "document_key": f"eq.{document_key}",
        "version": f"eq.{expected_version}",
        "select": "document_key,version,updated_at",
    })
    rows = request_json(
        f"{URL}/rest/v1/admin_documents?{query}",
        method="PATCH",
        payload={"payload": promoted_payload, "updated_at": prepared_at},
    )
    if not isinstance(rows, list) or len(rows) != 1:
        raise RuntimeError("Atomic point activation lost its central compare-and-swap race")
    after = central_row(document_key)
    if not after or after.get("payload") != promoted_payload or int(after.get("version") or 0) <= expected_version:
        raise RuntimeError("Central point activation readback did not match the validated payload")
    print(json.dumps({
        "status": "promoted",
        "documentKey": document_key,
        "fromVersion": expected_version,
        "toVersion": int(after["version"]),
        "partCount": len(pending.get("partIds") or []),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
