from fastapi import HTTPException
from langchain_core.language_models.chat_models import BaseChatModel
from providers.groq_provider import GroqProvider
from providers.openai_provider import OpenAIProvider
from providers.claude_provider import ClaudeProvider
from providers.gemini_provider import GeminiProvider
from providers.model_registry import get_fallback_models
from router.rate_limiter import rate_limiter
import logging

logger = logging.getLogger(__name__)

class LLMRouter:
    _providers = {
        "groq": GroqProvider(),
        "openai": OpenAIProvider(),
        "claude": ClaudeProvider(),
        "gemini": GeminiProvider()
    }

    @classmethod
    def get_model(cls, provider: str, model: str, api_keys: dict, temperature: float = 0.7, max_tokens: int = 4096, max_retries: int = 3) -> BaseChatModel:
        if not provider:
            provider = "groq"
            
        provider_name = provider.lower()
        if provider_name not in cls._providers:
            raise HTTPException(status_code=400, detail=f"Unsupported LLM provider: {provider}")

        # Check Rate Limit BEFORE instantiation
        if rate_limiter.is_limited(provider_name):
            # Check for alternative
            available = list(cls._providers.keys())
            alt_provider = rate_limiter.get_alternative_provider(provider_name, available)
            
            error_payload = {"error": "Service busy", "provider": provider_name}
            if alt_provider:
                error_payload["suggested_model"] = alt_provider
                
            raise HTTPException(status_code=429, detail=error_payload)

        # Extract specific API key
        token_key = f"{provider_name}_token"
        api_key = api_keys.get(token_key)
        
        if not api_key:
            raise HTTPException(status_code=400, detail=f"API key for {provider} is not configured.")

        # Record attempt
        rate_limiter.record_request(provider_name)

        provider_impl = cls._providers[provider_name]
        return provider_impl.get_model(
            model_name=model, 
            api_key=api_key, 
            temperature=temperature, 
            max_tokens=max_tokens,
            max_retries=max_retries
        )

    @classmethod
    def get_model_with_fallback(cls, provider: str, model: str, api_keys: dict, **kwargs) -> BaseChatModel:
        """Try the requested model, fall back to alternatives on model-not-found errors."""
        provider_name = (provider or "groq").lower()
        models_to_try = [model] if model else [None]
        models_to_try.extend(get_fallback_models(provider_name))

        last_error = None
        for candidate in models_to_try:
            try:
                return cls.get_model(provider=provider, model=candidate, api_keys=api_keys, **kwargs)
            except Exception as e:
                error_str = str(e).lower()
                is_model_error = any(phrase in error_str for phrase in [
                    "model not found", "model_not_found", "deprecated",
                    "decommissioned", "not available", "does not exist",
                    "invalid model", "model_not_active"
                ])
                if is_model_error and candidate != models_to_try[-1]:
                    logger.warning(f"Model '{candidate}' unavailable for {provider_name}, trying fallback... Error: {e}")
                    last_error = e
                    continue
                raise  # Not a model error, or last fallback — propagate

        raise last_error

