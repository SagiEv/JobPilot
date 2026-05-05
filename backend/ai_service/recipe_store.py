#load/save/invalidate recipes as JSON in recipes/ folder
"""
recipe_store.py — Persist and retrieve site recipes as JSON files.
One file per domain, stored in ai_service/recipes/
"""
import json
import os
import re
from datetime import datetime, timedelta
from urllib.parse import urlparse
from typing import Optional
from job_search.state import SiteRecipe

RECIPES_DIR = os.path.join(os.path.dirname(__file__), "recipes")
REANALYZE_AFTER_DAYS = 30
FAILURE_THRESHOLD = 3


def _domain_key(url: str) -> str:
    """Turn https://stripe.com/jobs → stripe_com"""
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    return re.sub(r"[^a-z0-9]", "_", domain.lower())


def _recipe_path(url: str) -> str:
    os.makedirs(RECIPES_DIR, exist_ok=True)
    return os.path.join(RECIPES_DIR, f"{_domain_key(url)}.json")


def load_recipe(url: str) -> Optional[SiteRecipe]:
    """
    Load a saved recipe. Returns None if:
    - No recipe saved yet
    - Recipe is older than REANALYZE_AFTER_DAYS
    - failure_count exceeded threshold
    """
    path = _recipe_path(url)
    if not os.path.exists(path):
        return None

    with open(path) as f:
        recipe: SiteRecipe = json.load(f)

    # Check staleness
    last = datetime.fromisoformat(recipe.get("last_analyzed", "2000-01-01"))
    if datetime.now() - last > timedelta(days=REANALYZE_AFTER_DAYS):
        return None

    # Check failure count
    if recipe.get("failure_count", 0) >= FAILURE_THRESHOLD:
        return None

    return recipe


def save_recipe(recipe: SiteRecipe) -> None:
    """Save or overwrite a recipe for a given URL."""
    path = _recipe_path(recipe["careers_url"])
    recipe["last_analyzed"] = datetime.now().date().isoformat()
    recipe["failure_count"] = 0
    with open(path, "w") as f:
        json.dump(recipe, f, indent=2)


def increment_failure(url: str) -> int:
    """
    Increment failure count for a recipe.
    Returns new failure count. Used by dumb scraper on consecutive failures.
    """
    path = _recipe_path(url)
    if not os.path.exists(path):
        return 0

    with open(path) as f:
        recipe = json.load(f)

    recipe["failure_count"] = recipe.get("failure_count", 0) + 1
    with open(path, "w") as f:
        json.dump(recipe, f, indent=2)

    return recipe["failure_count"]


def delete_recipe(url: str) -> None:
    """Force re-analysis next run by deleting the recipe."""
    path = _recipe_path(url)
    if os.path.exists(path):
        os.remove(path)


def list_recipes() -> list:
    """Return summary of all saved recipes for inspection."""
    os.makedirs(RECIPES_DIR, exist_ok=True)
    recipes = []
    for fname in os.listdir(RECIPES_DIR):
        if fname.endswith(".json"):
            with open(os.path.join(RECIPES_DIR, fname)) as f:
                r = json.load(f)
            recipes.append({
                "company": r.get("company"),
                "url": r.get("careers_url"),
                "last_analyzed": r.get("last_analyzed"),
                "failure_count": r.get("failure_count", 0),
                "requires_js": r.get("requires_js"),
            })
    return recipes