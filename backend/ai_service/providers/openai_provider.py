from typing import List, Dict, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from interfaces.llm_provider import LLMProvider

class OpenAIProvider(LLMProvider):
    def get_model(self, model_name: str, api_key: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
        if not model_name:
            model_name = "gpt-4o"
            
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def get_available_models(self) -> List[Dict[str, Any]]:
        return [
            {"id": "gpt-4o", "name": "GPT-4o"},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini"},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo"}
        ]
