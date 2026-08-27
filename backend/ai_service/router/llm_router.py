from fastapi import HTTPException
from langchain_core.language_models.chat_models import BaseChatModel
from providers.groq_provider import GroqProvider
from providers.openai_provider import OpenAIProvider
from providers.claude_provider import ClaudeProvider
from providers.gemini_provider import GeminiProvider

class LLMRouter:
    _providers = {
        "groq": GroqProvider(),
        "openai": OpenAIProvider(),
        "claude": ClaudeProvider(),
        "gemini": GeminiProvider()
    }

    @classmethod
    def get_model(cls, provider: str, model: str, api_keys: dict, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
        if not provider:
            provider = "groq"
            
        provider_name = provider.lower()
        if provider_name not in cls._providers:
            raise HTTPException(status_code=400, detail=f"Unsupported LLM provider: {provider}")

        # Extract specific API key
        token_key = f"{provider_name}_token"
        api_key = api_keys.get(token_key)
        
        if not api_key:
            raise HTTPException(status_code=400, detail=f"API key for {provider} is not configured.")

        provider_impl = cls._providers[provider_name]
        return provider_impl.get_model(
            model_name=model, 
            api_key=api_key, 
            temperature=temperature, 
            max_tokens=max_tokens
        )
