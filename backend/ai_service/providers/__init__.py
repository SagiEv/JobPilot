__all__ = ["GroqProvider", "OpenAIProvider", "ClaudeProvider", "GeminiProvider"]


def __getattr__(name: str):
    if name == "GroqProvider":
        from .groq_provider import GroqProvider
        return GroqProvider
    if name == "OpenAIProvider":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider
    if name == "ClaudeProvider":
        from .claude_provider import ClaudeProvider
        return ClaudeProvider
    if name == "GeminiProvider":
        from .gemini_provider import GeminiProvider
        return GeminiProvider
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

