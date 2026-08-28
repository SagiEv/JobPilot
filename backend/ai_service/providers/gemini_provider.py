from typing import List, Dict, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from interfaces.llm_provider import LLMProvider

class GeminiProvider(LLMProvider):
    def get_model(self, model_name: str, api_key: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
        if not model_name:
            model_name = "gemini-2.5-flash-lite"
            
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
            max_retries=0,
        )

    def get_available_models(self) -> List[Dict[str, Any]]:
        return [
            {"id": "gemini-3.7-flash", "name": "Gemini 3.7 Flash"},
            {"id": "gemini-3.1-pro", "name": "Gemini 3.1 Pro"},
            {"id": "gemini-3.5-flash-lite", "name": "Gemini 3.5 Flash-Lite"},
            # You can keep older models like 2.5 or 1.5 if you have specific legacy needs
            {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash"},
            {"id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite"}
        ]
