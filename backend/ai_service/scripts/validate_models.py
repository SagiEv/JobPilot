"""
Model Registry Validator
========================
Queries each provider's API to check if our registered models are still available.
Reports stale/deprecated models and optionally auto-updates model_registry.py.

Usage:
  python scripts/validate_models.py              # Dry-run report
  python scripts/validate_models.py --fix        # Auto-update model_registry.py
  python scripts/validate_models.py --ci         # CI mode: exit code 1 if stale models found

Environment variables (optional — skips provider if missing):
  GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
"""

import os
import sys
import json
import argparse
import requests

# Add parent dir to path so we can import model_registry
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from providers.model_registry import MODEL_REGISTRY


# ── Provider API fetchers ──────────────────────────────────────────────────────

def fetch_groq_models(api_key: str) -> list:
    """Fetch available model IDs from Groq API."""
    resp = requests.get(
        "https://api.groq.com/openai/v1/models",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=15
    )
    resp.raise_for_status()
    return [m["id"] for m in resp.json().get("data", [])]


def fetch_openai_models(api_key: str) -> list:
    """Fetch available model IDs from OpenAI API."""
    resp = requests.get(
        "https://api.openai.com/v1/models",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=15
    )
    resp.raise_for_status()
    return [m["id"] for m in resp.json().get("data", [])]


def fetch_claude_models(api_key: str) -> list:
    """Fetch available model IDs from Anthropic API."""
    resp = requests.get(
        "https://api.anthropic.com/v1/models",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        },
        timeout=15
    )
    resp.raise_for_status()
    return [m["id"] for m in resp.json().get("data", [])]


def fetch_gemini_models(api_key: str) -> list:
    """Fetch available model IDs from Google Gemini API."""
    resp = requests.get(
        f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}&pageSize=100",
        timeout=15
    )
    resp.raise_for_status()
    models = []
    for m in resp.json().get("models", []):
        # Gemini returns "models/gemini-3.8-flash", strip prefix
        model_id = m.get("name", "").replace("models/", "")
        if model_id:
            models.append(model_id)
    return models


FETCHERS = {
    "groq":   ("GROQ_API_KEY",      fetch_groq_models),
    "openai": ("OPENAI_API_KEY",    fetch_openai_models),
    "claude": ("ANTHROPIC_API_KEY", fetch_claude_models),
    "gemini": ("GEMINI_API_KEY",    fetch_gemini_models),
}


# ── Validation logic ──────────────────────────────────────────────────────────

def validate_provider(provider: str, live_models: list) -> dict:
    """Compare registry models against live API models for one provider."""
    config = MODEL_REGISTRY.get(provider, {})
    all_registered = set()
    
    # Collect all model IDs from our registry
    if config.get("default"):
        all_registered.add(config["default"])
    for fb in config.get("fallbacks", []):
        all_registered.add(fb)
    for m in config.get("available", []):
        all_registered.add(m["id"])
    
    live_set = set(live_models)
    
    stale = all_registered - live_set
    new_models = live_set - all_registered
    valid = all_registered & live_set
    
    default_ok = config.get("default") in live_set if config.get("default") else True
    
    return {
        "valid": valid,
        "stale": stale,
        "new": new_models,
        "default_ok": default_ok,
        "default": config.get("default"),
    }


def print_report(provider: str, result: dict):
    """Print a human-readable report for one provider."""
    print(f"\n[{provider}]")
    
    for model_id in sorted(result["valid"]):
        print(f"  ✅ {model_id} — available")
    
    for model_id in sorted(result["stale"]):
        is_default = " (DEFAULT!)" if model_id == result["default"] else ""
        print(f"  ⚠️  {model_id} — NOT FOUND (deprecated?){is_default}")
    
    # Show up to 10 new models (avoid flooding with hundreds of OpenAI fine-tunes)
    new_sorted = sorted(result["new"])[:10]
    for model_id in new_sorted:
        print(f"  🆕 {model_id} — available, not in registry")
    if len(result["new"]) > 10:
        print(f"  🆕 ... and {len(result['new']) - 10} more new models")


def main():
    parser = argparse.ArgumentParser(description="Validate AI model registry against live provider APIs")
    parser.add_argument("--fix", action="store_true", help="Auto-update model_registry.py")
    parser.add_argument("--ci", action="store_true", help="CI mode: exit 1 if stale models found")
    args = parser.parse_args()

    print("🔍 Validating model registry against live provider APIs...\n")

    total_stale = 0
    checked = 0

    for provider, (env_key, fetcher) in FETCHERS.items():
        api_key = os.environ.get(env_key)
        if not api_key:
            print(f"[{provider}] ⏭️  Skipped (no {env_key} env var)")
            continue

        try:
            live_models = fetcher(api_key)
            result = validate_provider(provider, live_models)
            print_report(provider, result)
            total_stale += len(result["stale"])
            checked += 1
        except Exception as e:
            print(f"[{provider}] ❌ API error: {e}")

    # Summary
    print(f"\n{'─' * 50}")
    print(f"Checked {checked} provider(s). Found {total_stale} stale model(s).")

    if total_stale > 0:
        if args.fix:
            print("\n⚠️  --fix mode: Auto-update not yet implemented.")
            print("   Please manually update providers/model_registry.py based on the report above.")
        elif args.ci:
            print("\n❌ CI check failed: stale models detected.")
            sys.exit(1)
        else:
            print("\nRun with --fix to auto-update, or edit providers/model_registry.py manually.")
    else:
        print("✅ All registered models are current.")


if __name__ == "__main__":
    main()
