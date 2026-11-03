from typing import Any
from fastapi import HTTPException
from langchain_core.language_models.chat_models import BaseChatModel
from interfaces.llm_provider import LLMProvider
from providers.groq_provider import GroqProvider
from providers.openai_provider import OpenAIProvider
from providers.claude_provider import ClaudeProvider
from providers.gemini_provider import GeminiProvider
from providers.model_registry import get_default_model, get_fallback_models
from router.rate_limiter import rate_limiter
import logging

logger = logging.getLogger(__name__)


class _FallbackChatModel:
    """Wraps a primary BaseChatModel and ordered fallback BaseChatModels,
    automatically falling back on runtime model-not-found, 503, or 429 errors."""

    _FALLBACK_ERROR_PHRASES = (
        "model not found", "model_not_found", "deprecated",
        "decommissioned", "not available", "does not exist",
        "invalid model", "model_not_active",
        "503", "unavailable", "high demand", "overloaded",
        "429", "rate limit", "resource_exhausted", "not_found", "404",
        "timeout", "timed out", "504", "deadline_exceeded", "deadline exceeded",
    )

    def __init__(self, models: list[BaseChatModel], model_names: list[str], provider_name: str) -> None:
        self._models = models
        self._model_names = model_names
        self._provider_name = provider_name

    @classmethod
    def is_recoverable(cls, exc: Exception) -> bool:
        error_str = f"{type(exc).__name__}: {exc}".lower()
        return any(phrase in error_str for phrase in cls._FALLBACK_ERROR_PHRASES)

    def invoke(self, *args: Any, **kwargs: Any) -> Any:
        for idx, (candidate_llm, candidate_name) in enumerate(zip(self._models, self._model_names)):
            try:
                return candidate_llm.invoke(*args, **kwargs)
            except Exception as e:
                has_more = idx < len(self._models) - 1
                if has_more and self.is_recoverable(e):
                    logger.warning(
                        f"Model '{candidate_name}' unavailable for {self._provider_name} "
                        f"({type(e).__name__}: {e}), trying fallback '{self._model_names[idx + 1]}'..."
                    )
                    continue
                raise
        raise RuntimeError(f"No models available to invoke for provider {self._provider_name}")

    def with_structured_output(self, schema: Any, **kwargs: Any) -> Any:
        structured_models = [m.with_structured_output(schema, **kwargs) for m in self._models]
        if len(structured_models) == 1:
            return structured_models[0]
        return structured_models[0].with_fallbacks(structured_models[1:])

    def __getattr__(self, name: str) -> Any:
        return getattr(self._models[0], name)


class LLMRouter:
    _providers: dict[str, LLMProvider] = {
        "groq": GroqProvider(),
        "openai": OpenAIProvider(),
        "claude": ClaudeProvider(),
        "gemini": GeminiProvider()
    }

    @classmethod
    def _validate_and_prepare(cls, provider: str, api_keys: dict[str, Any]) -> tuple[str, str, LLMProvider]:
        provider_name = (provider or "groq").lower()
        if provider_name not in cls._providers:
            raise HTTPException(status_code=400, detail=f"Unsupported LLM provider: {provider}")

        # Check Rate Limit BEFORE instantiation
        if rate_limiter.is_limited(provider_name):
            available = list(cls._providers.keys())
            alt_provider = rate_limiter.get_alternative_provider(provider_name, available)

            error_payload = {"error": "Service busy", "provider": provider_name}
            if alt_provider:
                error_payload["suggested_model"] = alt_provider

            raise HTTPException(status_code=429, detail=error_payload)

        # Extract specific API key
        token_key = f"{provider_name}_token"
        api_key = api_keys.get(token_key)

        if not api_key or not isinstance(api_key, str):
            raise HTTPException(status_code=400, detail=f"API key for {provider} is not configured.")

        # Record attempt
        rate_limiter.record_request(provider_name)
        return provider_name, api_key, cls._providers[provider_name]

    @classmethod
    def get_model(
        cls,
        provider: str,
        model: str | None,
        api_keys: dict[str, Any],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        max_retries: int = 3,
    ) -> Any:
        provider_name, api_key, provider_impl = cls._validate_and_prepare(provider, api_keys)

        primary_model = model or get_default_model(provider_name)
        models_to_try: list[str] = [primary_model] if primary_model else []
        for fb in get_fallback_models(provider_name):
            if isinstance(fb, str) and fb and fb not in models_to_try:
                models_to_try.append(fb)

        instantiated: list[tuple[BaseChatModel, str]] = []
        for idx, candidate in enumerate(models_to_try):
            has_fallbacks_after = idx < len(models_to_try) - 1
            candidate_retries = min(max_retries, 1) if has_fallbacks_after else max_retries
            try:
                llm_instance = provider_impl.get_model(
                    model_name=candidate,
                    api_key=api_key,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    max_retries=candidate_retries,
                )
                instantiated.append((llm_instance, candidate))
            except Exception as e:
                if has_fallbacks_after and _FallbackChatModel.is_recoverable(e):
                    logger.warning(
                        f"Model '{candidate}' unavailable for {provider_name}, trying fallback... Error: {e}"
                    )
                    continue
                if not instantiated:
                    raise

        if not instantiated:
            raise RuntimeError(f"No models instantiated for provider {provider_name}")

        if len(instantiated) == 1:
            return instantiated[0][0]

        return _FallbackChatModel(
            models=[m for m, _ in instantiated],
            model_names=[n for _, n in instantiated],
            provider_name=provider_name,
        )

    @classmethod
    def get_model_with_fallback(
        cls,
        provider: str,
        model: str | None,
        api_keys: dict[str, Any],
        **kwargs: Any,
    ) -> Any:
        """Try the requested model, fall back to alternatives on model-not-found or 503/429 errors."""
        return cls.get_model(provider=provider, model=model, api_keys=api_keys, **kwargs)
