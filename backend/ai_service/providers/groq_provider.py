from typing import List, Dict, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq
from interfaces.llm_provider import LLMProvider

class GroqProvider(LLMProvider):
    def get_model(self, model_name: str, api_key: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
        if not model_name:
            model_name = "llama-3.3-70b-versatile"
            
        return ChatGroq(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def get_available_models(self) -> List[Dict[str, Any]]:
        return [
            {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B"},
            {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B"},
            {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B"}
        ]
