import json
from langchain_core.messages import HumanMessage, SystemMessage
from llm import get_power_llm
from .single_shot_schema import SingleShotResult

SYSTEM = """You are an elite Job Analyst and Expert CV Restructurer.
Your task is to analyze the provided Job Description, score the original CV, and completely restructure the CV to perfectly match the job requirements while maintaining truthfulness.

You will be provided with:
1. Job Description
2. The Candidate's Base CV (or Profile Data)
3. A Pool of available Projects the candidate has worked on
4. A Pool of available Skills the candidate has

Follow these instructions to formulate your response:
1. Analyze the job description to identify the title, seniority, required skills, and ATS keywords.
2. Score the original CV against these requirements (0-100).
3. Select the most relevant skills and projects from the provided pools.
4. Restructure the Experience section, highlighting bullet points that prove the required skills.
5. Generate the final tailored CV in Markdown format.
   - Use # for name, ## for section headers
   - Start bullets with strong action verbs
   - Keep it concise and impactful
6. Return the output STRICTLY matching the requested JSON schema."""

def single_shot_tailor_node(payload, api_keys: dict, provider: str, model: str) -> dict:
    llm = get_power_llm(api_keys=api_keys, provider=provider, model=model)
    
    # Optional: Bind structured output
    structured_llm = llm.with_structured_output(SingleShotResult)

    base_cv = payload.base_cv
    if not base_cv and payload.cv_data:
        base_cv = json.dumps(payload.cv_data, indent=2)

    prompt = f"""
--- JOB DESCRIPTION ---
{payload.job_description}

--- BASE CV ---
{base_cv or "No base CV provided."}

--- PROJECTS POOL ---
{json.dumps(payload.projects_pool, indent=2) if payload.projects_pool else "No projects available."}

--- SKILLS POOL ---
{json.dumps(payload.skills_pool, indent=2) if payload.skills_pool else "No skills available."}

Perform the full analysis and restructuring, and return the structured response.
"""
    messages = [
        SystemMessage(content=SYSTEM),
        HumanMessage(content=prompt),
    ]

    try:
        response: SingleShotResult = structured_llm.invoke(messages)
        # Convert Pydantic object to dict mapping exactly to what router.py expects
        return {
            "success": True,
            "tailored_cv_markdown": response.tailored_cv_markdown,
            "cv_score": response.cv_score.model_dump(),
            "projected_score": response.projected_score,
            "tailoring_report": response.tailoring_report.model_dump()
        }
    except Exception as e:
        raise Exception(f"Single-Shot pipeline failed: {str(e)}")
