from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
import json
import logging
from .models import InterviewAnalysisRequest

logger = logging.getLogger(__name__)

async def analyze_interview_feedback(payload: InterviewAnalysisRequest) -> dict:
    llm = ChatGroq(temperature=0.7, groq_api_key=payload.groq_api_key, model_name="llama-3.1-8b-instant")

    interviews_text = json.dumps(payload.interviews_data, indent=2)

    system_prompt = """You are an expert career coach and psychological/technical evaluator. 
Your task is to analyze a candidate's past interview feedback to find recurring patterns, positive traits to keep doing, areas to improve, and overall trends/lack of knowledge.
You MUST return your answer ONLY as a valid JSON object with the following structure:
{
  "keep_report": ["point 1", "point 2"],
  "improve_report": ["point 1", "point 2"],
  "overall_trends": "A short paragraph summarizing the overall trend across these interviews."
}"""
    
    user_prompt = f"""Here is the interview data:
{interviews_text}

Analyze it and return the JSON."""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = llm.invoke(messages)
    
    # Clean response content to parse JSON
    content = response.content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.endswith("```"):
        content = content[:-3]
    
    parsed_data = json.loads(content.strip())
    return parsed_data
