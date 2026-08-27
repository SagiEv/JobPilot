from abc import ABC, abstractmethod
from typing import List, Dict, Any
from langchain_core.language_models.chat_models import BaseChatModel

class LLMProvider(ABC):
    @abstractmethod
    def get_model(self, model_name: str, api_key: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
        """Instantiate and return the LangChain chat model."""
        pass

    @abstractmethod
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Return a list of available models for this provider."""
        pass
