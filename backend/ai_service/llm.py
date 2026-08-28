"""
Shared LLM instances — one fast model for mechanical tasks,
one powerful model for creative/reasoning tasks.
"""
from router.llm_router import LLMRouter

def get_fast_llm(api_keys: dict, provider: str = "groq", model: str = None):
    return LLMRouter.get_model(
        provider=provider,
        model=model,
        api_keys=api_keys,
        temperature=0.1,
        max_tokens=4096,
        max_retries=3
    )

def get_power_llm(api_keys: dict, provider: str = "groq", model: str = None):
    return LLMRouter.get_model(
        provider=provider,
        model=model,
        api_keys=api_keys,
        temperature=0.3,
        max_tokens=8192,
        max_retries=3
    )

def extract_text(response) -> str:
    """Safely extracts text from a LangChain AIMessage, handling string or list-of-dicts formats."""
    raw = response.content
    if isinstance(raw, list):
        return "".join([part.get("text", "") for part in raw if isinstance(part, dict) and "text" in part])
    return str(raw)
