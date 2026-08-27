from typing import List, Dict, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from interfaces.llm_provider import LLMProvider

class GeminiProvider(LLMProvider):
    def get_model(self, model_name: str, api_key: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
        if not model_name:
            model_name = "gemini-1.5-pro-latest"
            
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def get_available_models(self) -> List[Dict[str, Any]]:
        return [
            {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro"},
            {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash"},
            {"id": "gemini-1.0-pro", "name": "Gemini 1.0 Pro"}
        ]
