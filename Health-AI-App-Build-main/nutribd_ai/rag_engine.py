"""Contextual RAG engine for NutriBD AI."""
from __future__ import annotations

from typing import List

try:
    from .vector_store import search_foods
except ImportError:
    from vector_store import search_foods

CONTEXT_PREFIX = "Context: Traditional Bangladeshi food for South Asian nutrition tracking and health risk assessment."


def _format_result(item: dict, index: int) -> str:
    meta = item.get("metadata", {}) or {}
    return (
        f"{index}. {CONTEXT_PREFIX}\n"
        f"Food: {meta.get('food_name_en', 'Unknown')} ({meta.get('food_name_bn', '')})\n"
        f"Category: {meta.get('category', 'uncategorized')} | Alias matched: {meta.get('alias', '')}\n"
        f"Nutrition: {meta.get('calories', 0)} kcal, {meta.get('protein', 0)}g protein, "
        f"{meta.get('carbs', 0)}g carbs, {meta.get('fat', 0)}g fat, "
        f"{meta.get('sugar', 0)}g sugar, {meta.get('sodium', 0)}mg sodium, {meta.get('fiber', 0)}g fiber."
    )


def retrieve_context(query: str) -> str:
    """Retrieve top food context for Gemini/Claude prompts."""
    # Contextual RAG — Anthropic-style context injection
    results = search_foods(query, n_results=5)
    if not results:
        return f"{CONTEXT_PREFIX}\nNo close food match found for: {query}"
    return "\n\n".join(_format_result(item, i + 1) for i, item in enumerate(results))


def build_rag_prompt(user_query: str, system_role: str = "You are NutriBD AI, a Bangladeshi nutrition assistant.") -> str:
    context = retrieve_context(user_query)
    return f"""{system_role}

Use the retrieved nutrition context below. Prefer exact local Bangladeshi food matches, mention uncertainty when a food is not found, and keep advice practical.

RETRIEVED CONTEXT:
{context}

USER QUERY:
{user_query}

ANSWER:"""


if __name__ == "__main__":
    print(retrieve_context("bhaat dal dim"))
