# AI Model Registry & Resilience System

## Overview

The AI service supports multiple LLM providers (Groq, OpenAI, Claude, Gemini). Users configure their own API keys via the Settings page and select which model/provider to use. This document explains how models are managed, how the system protects against deprecated models, and how to keep models up to date.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Request                             │
│   (includes api_keys dict + provider + model from Settings)      │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │       llm.py        │
              │  get_fast_llm()     │
              │  get_power_llm()    │
              └────────┬────────────┘
                       │ calls get_model_with_fallback()
                       ▼
              ┌─────────────────────┐
              │    LLMRouter        │
              │  (llm_router.py)    │
              │                     │
              │  1. Rate limit check│
              │  2. Extract API key │
              │  3. Try model       │──── on "model not found" ───┐
              │  4. Return LLM      │                              │
              └────────┬────────────┘                              │
                       │                                           │
                       ▼                                           ▼
              ┌─────────────────────┐                 ┌──────────────────┐
              │   Provider Layer    │                 │  Fallback Chain  │
              │  groq_provider.py   │                 │  Try next model  │
              │  openai_provider.py │                 │  from registry   │
              │  claude_provider.py │                 │  fallbacks list  │
              │  gemini_provider.py │                 └──────────────────┘
              └────────┬────────────┘
                       │ reads defaults & available list from
                       ▼
              ┌─────────────────────┐
              │  model_registry.py  │  ◀── Single Source of Truth
              │                     │
              │  MODEL_REGISTRY = { │
              │    "groq": {        │
              │      "default": ... │
              │      "fallbacks": . │
              │      "available": . │
              │    },               │
              │    "openai": {...}  │
              │    "claude": {...}  │
              │    "gemini": {...}  │
              │  }                  │
              └─────────────────────┘
```

---

## Key Files

| File | Purpose |
|:-----|:--------|
| `providers/model_registry.py` | **Single source of truth** for all model IDs, defaults, and fallbacks |
| `providers/groq_provider.py` | Groq provider — reads from registry |
| `providers/openai_provider.py` | OpenAI provider — reads from registry |
| `providers/claude_provider.py` | Claude/Anthropic provider — reads from registry |
| `providers/gemini_provider.py` | Google Gemini provider — reads from registry |
| `router/llm_router.py` | Routes requests to providers, handles fallback logic |
| `llm.py` | Convenience functions (`get_fast_llm`, `get_power_llm`) used by all features |
| `scripts/validate_models.py` | CLI script to check model freshness against live APIs |
| `main.py` | Logs registry config on startup |

---

## Model Registry Structure

The `model_registry.py` file defines a `MODEL_REGISTRY` dict with this structure per provider:

```python
"groq": {
    "default": "openai/gpt-oss-120b",       # Used when no model is specified
    "fallbacks": ["openai/gpt-oss-20b", ...], # Tried in order if primary fails
    "available": [                            # Shown in Settings UI dropdown
        {"id": "openai/gpt-oss-120b", "name": "GPT OSS 120B"},
        ...
    ]
}
```

- **`default`** — The model used when the user hasn't selected one (or for internal system calls).
- **`fallbacks`** — Ordered list of backup models. If the primary model returns a "model not found" or "deprecated" error, the system automatically tries these.
- **`available`** — The full list of models shown in the Settings UI. The `id` is the API identifier; the `name` is the human-readable display label.

---

## Fallback Mechanism

The `LLMRouter.get_model_with_fallback()` method provides runtime resilience:

1. Try the requested model (or default if none specified)
2. If the provider returns a model-related error (not found, deprecated, decommissioned, etc.), log a warning and try the next fallback
3. Continue through the fallback chain
4. If all fallbacks fail, raise the last error

**Detected error patterns:** `model not found`, `model_not_found`, `deprecated`, `decommissioned`, `not available`, `does not exist`, `invalid model`, `model_not_active`

This means users won't see a cryptic 500 error just because a model was deprecated — the system silently falls back and logs the issue.

---

## Keeping Models Up to Date

### Option 1: Manual — Validation Script

Run the validation script to check all models against live provider APIs:

```bash
cd backend/ai_service

# Dry-run report (needs at least one provider API key as env var)
GROQ_API_KEY=gsk_... python scripts/validate_models.py

# CI mode (exits with code 1 if stale models found)
python scripts/validate_models.py --ci
```

The script queries:
| Provider | API Endpoint |
|:---------|:-------------|
| Groq | `GET https://api.groq.com/openai/v1/models` |
| OpenAI | `GET https://api.openai.com/v1/models` |
| Claude | `GET https://api.anthropic.com/v1/models` |
| Gemini | `GET https://generativelanguage.googleapis.com/v1beta/models` |

Output example:
```
[groq]
  ✅ openai/gpt-oss-120b — available
  ✅ openai/gpt-oss-20b — available
  ⚠️  qwen/qwen3.6-27b — NOT FOUND (deprecated?)
  🆕 qwen/qwen3.8-27b — available, not in registry
```

### Option 2: Automated — Weekly GitHub Action

The `validate-models.yml` workflow runs every Monday at 8 AM UTC. If stale models are detected, it automatically opens a GitHub Issue with the `ai-model-stale` label.

**Setup:** Add provider API keys as GitHub repository secrets:
- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

### Option 3: Antigravity Skill

Use the `update-ai-models` skill to guide the update process interactively.

---

## How to Update Models

When you need to update models (stale model detected, new model released, etc.):

1. **Edit only `providers/model_registry.py`**:
   - Update the `default` to a current model
   - Update `fallbacks` with 2-3 alternatives
   - Update `available` list for the Settings UI

2. **Test**: Restart the AI service and verify at least one feature works.

3. **Commit & push**: That's it. No other files need changes.

---

## Startup Logging

On every boot, the AI service logs the current registry config:

```
INFO: ==================================================
INFO: AI Model Registry — Current Configuration:
INFO:   [groq] default=openai/gpt-oss-120b | fallbacks=[openai/gpt-oss-20b, qwen/qwen3.8-27b] | 3 models listed
INFO:   [openai] default=gpt-5.6-terra | fallbacks=[gpt-5.6-luna, gpt-5.6-sol] | 4 models listed
INFO:   [claude] default=claude-sonnet-5 | fallbacks=[claude-haiku-4.5, claude-opus-5] | 3 models listed
INFO:   [gemini] default=gemini-3.8-flash | fallbacks=[gemini-3.7-flash, gemini-3.5-flash-lite] | 3 models listed
INFO: ==================================================
```

This gives immediate visibility into which models are configured without reading any code.
