"""
Shared LLM instances — one fast model for mechanical tasks,
one powerful model for creative/reasoning tasks.
"""
import os
from langchain_groq import ChatGroq

_FAST_MODEL = "llama-3.1-8b-instant"
_POWER_MODEL = "llama-3.3-70b-versatile"


def get_fast_llm(groq_api_key: str) -> ChatGroq:
    return ChatGroq(
        model=_FAST_MODEL,
        api_key=groq_api_key,
        temperature=0.1,
        max_tokens=4096,
    )


def get_power_llm(groq_api_key: str) -> ChatGroq:
    return ChatGroq(
        model=_POWER_MODEL,
        api_key=groq_api_key,
        temperature=0.3,
        max_tokens=8192,
    )
