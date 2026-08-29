from router.llm_router import LLMRouter
from langchain_core.messages import HumanMessage, SystemMessage
import logging
from .models import MessageRequest
from llm import extract_text

logger = logging.getLogger(__name__)

async def generate_networking_message(payload: MessageRequest) -> str:
    llm = LLMRouter.get_model(
        provider=payload.provider,
        model=payload.model,
        api_keys=payload.api_keys,
        temperature=0.7,
        max_tokens=1024
    )

    language_instruction = "The output MUST be written entirely in English."
    if payload.language == "He":
        language_instruction = "The output MUST be written entirely in Hebrew."

    recipient_info = f"Recipient Email: {payload.recipient_email}" if payload.recipient_email else ""

    # Truncate inputs to avoid massive token limits (e.g. Groq 8k TPM limit)
    skills_trunc = str(payload.skills_pool)[:1000]
    projects_trunc = str(payload.projects_pool)[:2000]
    exp_trunc = str(payload.experience_text)[:3000]
    
    user_data_context = f"""
    My Skills: {skills_trunc}
    My Projects: {projects_trunc}
    My Experience: {exp_trunc}
    """

    if payload.purpose == "referral":
        system_prompt = f"You are an expert career coach helping a user write an email or message asking for a job referral. {language_instruction}"
        user_prompt = f"""
        Please write a short, professional, and engaging message to {payload.addressee_name or 'a connection'}.
        {recipient_info}
        I am asking for a referral for a job.
        Job Link: {payload.job_link}
        Job Description: {payload.description[:2000] if payload.description else ''}
        My GitHub Portfolio: {payload.github_portfolio}
        My CV Summary: {payload.cv_text[:500] if payload.cv_text else ''}
        
        {user_data_context}
        
        Keep it under 150 words. Be polite, direct, and highlight one key strength if possible. Based on my data, please include a brief sentence explaining why I am a strong fit for this job.
        """
    else:
        system_prompt = f"You are an expert career coach helping a user write a cold email or direct message to a recruiter applying for a job. {language_instruction}"
        user_prompt = f"""
        Please write a short, professional, and engaging message to {payload.addressee_name or 'the hiring team'}.
        {recipient_info}
        I am applying for a job.
        Job Link: {payload.job_link}
        Job Description: {payload.description[:2000] if payload.description else ''}
        My GitHub Portfolio: {payload.github_portfolio}
        My CV Summary: {payload.cv_text[:500] if payload.cv_text else ''}
        
        {user_data_context}
        
        Keep it under 150 words. Emphasize excitement about the role and a brief match of skills. Based on my data, please include a brief sentence explaining why I am a strong fit for this job.
        """

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = llm.invoke(messages)
    return extract_text(response).strip()
