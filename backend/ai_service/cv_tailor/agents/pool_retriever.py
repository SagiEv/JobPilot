"""
Agent 1.5 — Pool Retriever (RAG)
Mathematically scores all projects and skills against the job description using Semantic Embeddings.
Uses: sentence-transformers (all-MiniLM-L6-v2)
"""
from sentence_transformers import SentenceTransformer, util
from cv_tailor.state import TailoringState
import json

# Load model globally so it caches in memory across requests
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    model = None
    print(f"Failed to load sentence-transformers model: {str(e)}")

def pool_retriever_node(state: TailoringState, api_keys: dict, provider: str, model_name: str) -> dict:
    """
    Takes the full projects_pool and skills_pool, embeds them, compares to the job description,
    and returns only the top N most relevant items to prevent context limit errors.
    """
    job_desc = state.get("job_description_raw", "")
    projects_pool = state.get("projects_pool", [])
    skills_pool = state.get("skills_pool", [])

    # If the model failed to load, fail open (return everything, up to a hard cap)
    if model is None:
        return {
            "retrieved_projects": projects_pool[:10],
            "retrieved_skills": skills_pool[:30]
        }
        
    if not job_desc:
        return {
            "retrieved_projects": projects_pool[:5],
            "retrieved_skills": skills_pool[:20]
        }

    # Embed Job Description
    job_embedding = model.encode(job_desc, convert_to_tensor=True)

    # ── Score Projects ──
    retrieved_projects = []
    if projects_pool:
        project_texts = []
        for p in projects_pool:
            title = p.get("title", "")
            desc = p.get("description", "")
            tech = p.get("tech_stack", "")
            project_texts.append(f"{title}: {desc} {tech}")
        
        project_embeddings = model.encode(project_texts, convert_to_tensor=True)
        cos_scores = util.cos_sim(job_embedding, project_embeddings)[0]
        
        # Sort by score
        scored_projects = []
        for i, p in enumerate(projects_pool):
            scored_projects.append((cos_scores[i].item(), p))
            
        scored_projects.sort(key=lambda x: x[0], reverse=True)
        # Keep Top 5
        retrieved_projects = [p for score, p in scored_projects[:5]]

    # ── Score Skills ──
    retrieved_skills = []
    if skills_pool:
        skill_texts = []
        for s in skills_pool:
            skill_texts.append(f"{s.get('name', '')} - {s.get('category', '')}")
            
        skill_embeddings = model.encode(skill_texts, convert_to_tensor=True)
        cos_scores = util.cos_sim(job_embedding, skill_embeddings)[0]
        
        # Sort by score
        scored_skills = []
        for i, s in enumerate(skills_pool):
            scored_skills.append((cos_scores[i].item(), s))
            
        scored_skills.sort(key=lambda x: x[0], reverse=True)
        # Keep Top 20
        retrieved_skills = [s for score, s in scored_skills[:20]]

    return {
        "retrieved_projects": retrieved_projects,
        "retrieved_skills": retrieved_skills
    }
