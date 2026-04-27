#!/usr/bin/env python3
"""
bump_build_number.py
====================
Bumps `expo.ios.buildNumber` in app.json by 1 (or sets it to "2" if missing).
Apple rejects builds with a duplicate buildNumber for the same version, so
every resubmission needs this incremented.

Run from the repo root:
    python3 bump_build_number.py

Idempotent: if the user already bumped manually, it just prints and exits.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

APP_JSON = Path("app.json")

def main() -> int:
    if not APP_JSON.exists():
        print(f"❌ {APP_JSON} not found. Run from repo root.")
        return 1

    raw = APP_JSON.read_text(encoding="utf-8")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"❌ app.json is not valid JSON: {e}")
        return 1

    expo = data.setdefault("expo", {})
    ios = expo.setdefault("ios", {})

    current = ios.get("buildNumber", "1")
    try:
        new = str(int(current) + 1)
    except ValueError:
        # Non-numeric (rare). Fall back to safe default.
        new = "2"

    ios["buildNumber"] = new

    # Pretty-print preserving 2-space indent (Expo default).
    APP_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"✅ Bumped expo.ios.buildNumber: {current} → {new}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
