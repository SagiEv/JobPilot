from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
import logging
from .models import MessageRequest

logger = logging.getLogger(__name__)

async def generate_networking_message(payload: MessageRequest) -> str:
    llm = ChatGroq(temperature=0.7, groq_api_key=payload.groq_api_key, model_name="llama-3.1-8b-instant")

    language_instruction = "The output MUST be written entirely in English."
    if payload.language == "He":
        language_instruction = "The output MUST be written entirely in Hebrew."

    recipient_info = f"Recipient Email: {payload.recipient_email}" if payload.recipient_email else ""

    user_data_context = f"""
    My Skills: {payload.skills_pool}
    My Projects: {payload.projects_pool}
    My Experience: {payload.experience_text}
    """

    if payload.purpose == "referral":
        system_prompt = f"You are an expert career coach helping a user write an email or message asking for a job referral. {language_instruction}"
        user_prompt = f"""
        Please write a short, professional, and engaging message to {payload.addressee_name or 'a connection'}.
        {recipient_info}
        I am asking for a referral for a job.
        Job Link: {payload.job_link}
        Job Description: {payload.description}
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
        Job Description: {payload.description}
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
    return response.content
