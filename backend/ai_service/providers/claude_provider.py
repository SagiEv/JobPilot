from typing import List, Dict, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_anthropic import ChatAnthropic
from interfaces.llm_provider import LLMProvider
from providers.model_registry import get_default_model, get_available_models as registry_models

class ClaudeProvider(LLMProvider):
    def get_model(self, model_name: str, api_key: str, temperature: float = 0.7, max_tokens: int = 4096, max_retries: int = 3) -> BaseChatModel:
        if not model_name:
            model_name = get_default_model("claude")
            
        return ChatAnthropic(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
            max_retries=max_retries,
        )

    def get_available_models(self) -> List[Dict[str, Any]]:
        return registry_models("claude")

