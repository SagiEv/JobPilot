"""
LangGraph pipeline definition — wires all 8 agents into a directed graph
with a conditional ATS validation loop (max 2 retries).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from langgraph.graph import StateGraph, END
from cv_tailor.state import TailoringState

from cv_tailor.agents.job_analyst import job_analyst_node
from cv_tailor.agents.cv_scorer import cv_scorer_node
from cv_tailor.agents.profile_selector import profile_selector_node
from cv_tailor.agents.keyword_injector import keyword_injector_node
from cv_tailor.agents.cv_restructurer import cv_restructurer_node
from cv_tailor.agents.ats_validator import ats_validator_node
from cv_tailor.agents.summary_rewriter import summary_rewriter_node
from cv_tailor.agents.final_polish import final_polish_node

MAX_ATS_RETRIES = 2


def build_graph(groq_api_key: str):
    """Build and compile the LangGraph pipeline for a given API key."""

    # ── Node wrappers (bind API key) ──────────────────────────────────
    def node_job_analyst(state):
        return job_analyst_node(state, groq_api_key)

    def node_cv_scorer(state):
        return cv_scorer_node(state, groq_api_key)

    def node_profile_selector(state):
        return profile_selector_node(state, groq_api_key)

    def node_keyword_injector(state):
        return keyword_injector_node(state, groq_api_key)

    def node_cv_restructurer(state):
        return cv_restructurer_node(state, groq_api_key)

    def node_ats_validator(state):
        return ats_validator_node(state, groq_api_key)

    def node_summary_rewriter(state):
        return summary_rewriter_node(state, groq_api_key)

    def node_final_polish(state):
        return final_polish_node(state, groq_api_key)

    # ── ATS loop conditional edge ────────────────────────────────────
    def should_retry_ats(state: TailoringState) -> str:
        ats = state.get("ats_result", {})
        retries = state.get("ats_retry_count", 0)
        if not ats.get("is_compliant", True) and retries < MAX_ATS_RETRIES:
            return "retry"
        return "proceed"

    def increment_ats_retry(state: TailoringState) -> dict:
        """Inject ATS correction instructions into restructurer before retry."""
        ats = state.get("ats_result", {})
        instructions = ats.get("correction_instructions", "")
        # Append correction instructions to keyword injections so restructurer sees them
        injections = state.get("keyword_injections", {})
        injections["ats_correction_notes"] = instructions
        return {
            "ats_retry_count": state.get("ats_retry_count", 0) + 1,
            "keyword_injections": injections,
        }

    # ── Build graph ──────────────────────────────────────────────────
    workflow = StateGraph(TailoringState)

    workflow.add_node("job_analyst", node_job_analyst)
    workflow.add_node("cv_scorer", node_cv_scorer)
    workflow.add_node("profile_selector", node_profile_selector)
    workflow.add_node("keyword_injector", node_keyword_injector)
    workflow.add_node("cv_restructurer", node_cv_restructurer)
    workflow.add_node("ats_validator", node_ats_validator)
    workflow.add_node("ats_retry_prep", increment_ats_retry)
    workflow.add_node("summary_rewriter", node_summary_rewriter)
    workflow.add_node("final_polish", node_final_polish)

    # ── Edges ─────────────────────────────────────────────────────────
    workflow.set_entry_point("job_analyst")
    workflow.add_edge("job_analyst", "cv_scorer")
    workflow.add_edge("cv_scorer", "profile_selector")
    workflow.add_edge("profile_selector", "keyword_injector")
    workflow.add_edge("keyword_injector", "cv_restructurer")
    workflow.add_edge("cv_restructurer", "ats_validator")

    # ATS conditional: retry up to MAX_ATS_RETRIES times, then proceed
    workflow.add_conditional_edges(
        "ats_validator",
        should_retry_ats,
        {
            "retry": "ats_retry_prep",
            "proceed": "summary_rewriter",
        },
    )
    workflow.add_edge("ats_retry_prep", "cv_restructurer")
    workflow.add_edge("summary_rewriter", "final_polish")
    workflow.add_edge("final_polish", END)

    return workflow.compile()
