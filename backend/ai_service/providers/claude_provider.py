from typing import List, Dict, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_anthropic import ChatAnthropic
from interfaces.llm_provider import LLMProvider

class ClaudeProvider(LLMProvider):
    def get_model(self, model_name: str, api_key: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
        if not model_name:
            model_name = "claude-3-5-sonnet-20240620"
            
        return ChatAnthropic(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def get_available_models(self) -> List[Dict[str, Any]]:
        return [
            {"id": "claude-3-5-sonnet-20240620", "name": "Claude 3.5 Sonnet"},
            {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"},
            {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"}
        ]
