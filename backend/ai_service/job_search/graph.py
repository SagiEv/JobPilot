"""
job_search/graph.py
LangGraph pipeline for the AI analysis phase — runs ONCE per site.
Produces a SiteRecipe saved to disk. After that, dumb_scraper takes over.
"""
import sys, os
import time
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from langgraph.graph import StateGraph, END
from job_search.state import SearchState
from job_search.agents.jobs_url_finder import jobs_url_finder_node
from job_search.agents.site_explorer import site_explorer_node
from job_search.agents.selector_extractor import selector_extractor_node
from job_search.agents.recipe_validator import recipe_validator_node

# Delay between LLM calls — tune based on your Groq tier
# Free tier: 30 req/min → safe to wait 10s between agents
# Paid tier: set to 2-3s
INTER_NODE_DELAY = 10  # seconds


def build_search_analyzer_graph(groq_api_key: str):
    """
    4-node graph: find jobs URL → explore → extract selectors → validate.
    Each node runs once. No loops — straight pipeline.
    """

    def node_jobs_url_finder(state: SearchState):
        return jobs_url_finder_node(state, groq_api_key)

    def node_site_explorer(state: SearchState):
        time.sleep(INTER_NODE_DELAY)
        return site_explorer_node(state, groq_api_key)

    def node_selector_extractor(state: SearchState):
        time.sleep(INTER_NODE_DELAY)
        return selector_extractor_node(state, groq_api_key)

    def node_recipe_validator(state: SearchState):
        time.sleep(INTER_NODE_DELAY)
        return recipe_validator_node(state, groq_api_key)

    workflow = StateGraph(SearchState)

    workflow.add_node("jobs_url_finder", node_jobs_url_finder)
    workflow.add_node("site_explorer", node_site_explorer)
    workflow.add_node("selector_extractor", node_selector_extractor)
    workflow.add_node("recipe_validator", node_recipe_validator)

    workflow.set_entry_point("jobs_url_finder")
    workflow.add_edge("jobs_url_finder", "site_explorer")
    workflow.add_edge("site_explorer", "selector_extractor")
    workflow.add_edge("selector_extractor", "recipe_validator")
    workflow.add_edge("recipe_validator", END)

    return workflow.compile()