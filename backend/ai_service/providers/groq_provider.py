from typing import List, Dict, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq
from interfaces.llm_provider import LLMProvider

class GroqProvider(LLMProvider):
    def get_model(self, model_name: str, api_key: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
        if not model_name:
            model_name = "openai/gpt-oss-120b"
            
        return ChatGroq(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
            max_retries=0,
        )

    def get_available_models(self) -> List[Dict[str, Any]]:
        return [
            {"id": "openai/gpt-oss-120b", "name": "GPT OSS 120B"},
            {"id": "openai/gpt-oss-20b", "name": "GPT OSS 20B"},
            {"id": "qwen/qwen3.6-27b", "name": "Qwen 3.6 27B"}
        ]
