"""NetworkX food knowledge graph for NutriBD AI."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

try:
    import networkx as nx
except ImportError as exc:
    nx = None

try:
    from .vector_store import DATA_PATH, normalize_text, load_foods
except ImportError:
    from vector_store import DATA_PATH, normalize_text, load_foods

_graph = None
_df = None


def _num(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except Exception:
        return default


def build_food_graph(csv_path: Path | str = DATA_PATH):
    """Create graph nodes for foods, categories, nutrients and health tags."""
    if nx is None:
        raise ImportError("networkx is required. Install with: pip install networkx")
    global _graph, _df
    _df = load_foods(csv_path)
    G = nx.Graph()

    for _, row in _df.iterrows():
        name = str(row.get("food_name_en", "")).strip()
        if not name:
            continue
        category = str(row.get("category", "uncategorized")).strip() or "uncategorized"
        G.add_node(name, type="food", calories=_num(row.get("calories")), protein=_num(row.get("protein")), sodium=_num(row.get("sodium")), sugar=_num(row.get("sugar")), fiber=_num(row.get("fiber")))
        cat_node = f"category:{category}"
        G.add_node(cat_node, type="category")
        G.add_edge(name, cat_node, relation="belongs_to")

        if _num(row.get("protein")) >= 10:
            G.add_edge(name, "nutrient:high_protein", relation="rich_in")
        if _num(row.get("fiber")) >= 3:
            G.add_edge(name, "nutrient:high_fiber", relation="rich_in")
        if _num(row.get("sodium")) >= 400:
            G.add_edge(name, "risk:high_sodium", relation="caution_for_hypertension")
        if _num(row.get("sugar")) >= 10:
            G.add_edge(name, "risk:high_sugar", relation="caution_for_diabetes")
        if _num(row.get("calories")) >= 500:
            G.add_edge(name, "risk:high_calorie", relation="portion_control")

    # Connect healthier alternatives inside same category.
    for category, group in _df.groupby(_df["category"].astype(str)):
        foods = group.to_dict("records")
        for food in foods:
            name = str(food.get("food_name_en", "")).strip()
            alternatives = sorted(
                [f for f in foods if str(f.get("food_name_en", "")).strip() != name],
                key=lambda r: (_num(r.get("sodium")) + _num(r.get("sugar")) * 5 + _num(r.get("calories")) * 0.1),
            )[:3]
            for alt in alternatives:
                alt_name = str(alt.get("food_name_en", "")).strip()
                if alt_name:
                    G.add_edge(name, alt_name, relation="healthier_alternative")

    _graph = G
    return G


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_food_graph()
    return _graph


def get_related_foods(food_name: str, limit: int = 5) -> List[Dict[str, str]]:
    G = get_graph()
    q = normalize_text(food_name)
    target = None
    for node, data in G.nodes(data=True):
        if data.get("type") == "food" and (q == normalize_text(node) or q in normalize_text(node)):
            target = node
            break
    if not target:
        return []
    related = []
    for neighbor in G.neighbors(target):
        edge = G.get_edge_data(target, neighbor) or {}
        if G.nodes[neighbor].get("type") == "food":
            related.append({"food": neighbor, "relationship": edge.get("relation", "related")})
        if len(related) >= limit:
            break
    return related


def graph_summary() -> Dict[str, int]:
    G = get_graph()
    return {"nodes": G.number_of_nodes(), "edges": G.number_of_edges()}


if __name__ == "__main__":
    print(graph_summary())
    print(get_related_foods("rice"))
