"""
Centralized Model Registry — single file to update when providers
deprecate or release models. Each provider reads from here instead
of hardcoding model names.

To update models: edit ONLY this file. No other code changes needed.
"""

MODEL_REGISTRY = {
    "groq": {
        "default": "openai/gpt-oss-120b",
        "fallbacks": ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"],
        "available": [
            {"id": "openai/gpt-oss-120b", "name": "GPT OSS 120B"},
            {"id": "openai/gpt-oss-20b", "name": "GPT OSS 20B"},
            {"id": "qwen/qwen3.8-27b", "name": "Qwen 3.8 27B"},
        ]
    },
    "openai": {
        "default": "gpt-5.6-terra",
        "fallbacks": ["gpt-5.6-luna", "gpt-5.6-sol"],
        "available": [
            {"id": "gpt-6-astra", "name": "GPT-6 Astra"},
            {"id": "gpt-5.6-sol", "name": "GPT-5.6 Sol"},
            {"id": "gpt-5.6-terra", "name": "GPT-5.6 Terra"},
            {"id": "gpt-5.6-luna", "name": "GPT-5.6 Luna"},
        ]
    },
    "claude": {
        "default": "claude-sonnet-5",
        "fallbacks": ["claude-haiku-4.5", "claude-opus-5"],
        "available": [
            {"id": "claude-sonnet-5", "name": "Claude Sonnet 5"},
            {"id": "claude-haiku-4.5", "name": "Claude Haiku 4.5"},
            {"id": "claude-opus-5", "name": "Claude Opus 5"},
        ]
    },
    "gemini": {
        "default": "gemini-3.8-flash",
        "fallbacks": ["gemini-3.7-flash", "gemini-3.5-flash-lite"],
        "available": [
            {"id": "gemini-3.8-flash", "name": "Gemini 3.8 Flash"},
            {"id": "gemini-3.7-flash", "name": "Gemini 3.7 Flash"},
            {"id": "gemini-3.5-flash-lite", "name": "Gemini 3.5 Flash-Lite"},
        ]
    }
}


def get_default_model(provider: str) -> str:
    """Return the default model ID for a provider."""
    return MODEL_REGISTRY.get(provider, {}).get("default")


def get_fallback_models(provider: str) -> list:
    """Return ordered list of fallback model IDs for a provider."""
    return MODEL_REGISTRY.get(provider, {}).get("fallbacks", [])


def get_available_models(provider: str) -> list:
    """Return the list of available models for a provider (for Settings UI)."""
    return MODEL_REGISTRY.get(provider, {}).get("available", [])
