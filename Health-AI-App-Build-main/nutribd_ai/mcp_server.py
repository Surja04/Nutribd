"""NutriBD AI MCP server exposing food and risk tools over stdio."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import TextContent, Tool
except ImportError:  # Allows importing helper functions without mcp installed.
    Server = None
    stdio_server = None
    TextContent = None
    Tool = None

try:
    from .vector_store import DATA_PATH, search_foods, normalize_text
except ImportError:
    from vector_store import DATA_PATH, search_foods, normalize_text


def _load_df() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH).fillna("")
    df.columns = df.columns.str.strip()
    return df


def _num(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except Exception:
        return default


def _find_food_row(food_name: str):
    df = _load_df()
    q = normalize_text(food_name)
    for _, row in df.iterrows():
        searchable = normalize_text("|".join([str(row.get("food_name_en", "")), str(row.get("food_name_bn", "")), str(row.get("aliases", ""))]))
        if q and (q in searchable or searchable in q):
            return row
    results = search_foods(food_name, n_results=1)
    if results:
        best = results[0].get("metadata", {}).get("food_name_en")
        match = df[df["food_name_en"] == best]
        if not match.empty:
            return match.iloc[0]
    return None


def search_food(query: str) -> str:
    results = search_foods(query, n_results=5)
    if not results:
        return f"No food found for '{query}'."
    lines = []
    for i, item in enumerate(results, 1):
        m = item.get("metadata", {})
        lines.append(f"{i}. {m.get('food_name_en')} ({m.get('food_name_bn','')}) — {m.get('calories',0)} kcal, protein {m.get('protein',0)}g, sodium {m.get('sodium',0)}mg")
    return "\n".join(lines)


def get_nutrients(food_name: str) -> str:
    row = _find_food_row(food_name)
    if row is None:
        return f"No exact nutrition record found for '{food_name}'."
    return json.dumps({
        "food": row.get("food_name_en", ""),
        "bangla_name": row.get("food_name_bn", ""),
        "serving_size_g": _num(row.get("serving_size_g")),
        "calories": _num(row.get("calories")),
        "protein_g": _num(row.get("protein")),
        "carbs_g": _num(row.get("carbs")),
        "fat_g": _num(row.get("fat")),
        "sugar_g": _num(row.get("sugar")),
        "sodium_mg": _num(row.get("sodium")),
        "fiber_g": _num(row.get("fiber")),
    }, ensure_ascii=False, indent=2)


def get_healthy_alternatives(food: str) -> str:
    df = _load_df()
    row = _find_food_row(food)
    if row is None:
        candidates = df.sort_values(["sodium", "sugar", "calories"], ascending=True).head(3)
    else:
        category = str(row.get("category", ""))
        candidates = df[df["category"].astype(str) == category].copy()
        candidates = candidates[candidates["food_name_en"] != row.get("food_name_en")]
        candidates["health_score"] = candidates.apply(lambda r: _num(r.get("sodium")) + _num(r.get("sugar")) * 5 + _num(r.get("calories")) * 0.1 - _num(r.get("protein")) * 2 - _num(r.get("fiber")) * 3, axis=1)
        candidates = candidates.sort_values("health_score").head(3)
    lines = [f"Healthier local alternatives for {food}:"]
    for _, r in candidates.iterrows():
        lines.append(f"- {r.get('food_name_en')}: lower-risk option with {_num(r.get('calories')):g} kcal, {_num(r.get('protein')):g}g protein, {_num(r.get('sodium')):g}mg sodium per serving.")
    return "\n".join(lines)


def calculate_daily_totals(foods: List[str]) -> str:
    totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "sugar": 0.0, "sodium": 0.0, "fiber": 0.0}
    matched = []
    for food in foods:
        row = _find_food_row(food)
        if row is None:
            continue
        matched.append(str(row.get("food_name_en")))
        for k in totals:
            totals[k] += _num(row.get(k))
    return json.dumps({"matched_foods": matched, "daily_totals": totals}, ensure_ascii=False, indent=2)


def assess_health_risk(bmi: float, conditions: List[str]) -> str:
    conds = [c.lower() for c in conditions]
    risks = []
    if bmi >= 23.0:
        risks.append("BMI is at/above the South Asian overweight risk threshold of 23.0; prioritize portion control and regular activity.")
    if "diabetes" in conds:
        risks.append("Diabetes flag: limit sugary drinks, sweets, and large refined-rice portions; prefer dal, vegetables, fish, and measured rice.")
    if "hypertension" in conds or "high blood pressure" in conds:
        risks.append("Hypertension flag: reduce added salt, pickles, salty snacks, and high-sodium street foods.")
    if "anemia" in conds:
        risks.append("Anemia flag: include iron-supporting foods such as leafy shak, lentils, eggs, fish, and vitamin-C fruits.")
    return "\n".join(risks) if risks else "No major risk flags from the provided BMI and conditions."


async def main():
    if Server is None:
        raise ImportError("mcp is not installed. Run: pip install mcp")
    server = Server("nutribdai")

    @server.list_tools()
    async def list_tools():
        return [
            Tool(name="search_food", description="Vector search the Bangladeshi food database.", inputSchema={"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}),
            Tool(name="get_nutrients", description="Full nutrition breakdown for a specific food.", inputSchema={"type": "object", "properties": {"food_name": {"type": "string"}}, "required": ["food_name"]}),
            Tool(name="get_healthy_alternatives", description="Suggest 3 healthier local alternatives.", inputSchema={"type": "object", "properties": {"food": {"type": "string"}}, "required": ["food"]}),
            Tool(name="calculate_daily_totals", description="Sum nutritional values for a list of foods.", inputSchema={"type": "object", "properties": {"foods": {"type": "array", "items": {"type": "string"}}}, "required": ["foods"]}),
            Tool(name="assess_health_risk", description="South Asian risk assessment using BMI 23.0 threshold.", inputSchema={"type": "object", "properties": {"bmi": {"type": "number"}, "conditions": {"type": "array", "items": {"type": "string"}}}, "required": ["bmi", "conditions"]}),
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: Dict[str, Any]):
        funcs = {
            "search_food": lambda a: search_food(a["query"]),
            "get_nutrients": lambda a: get_nutrients(a["food_name"]),
            "get_healthy_alternatives": lambda a: get_healthy_alternatives(a["food"]),
            "calculate_daily_totals": lambda a: calculate_daily_totals(a["foods"]),
            "assess_health_risk": lambda a: assess_health_risk(float(a["bmi"]), a.get("conditions", [])),
        }
        if name not in funcs:
            raise ValueError(f"Unknown tool: {name}")
        return [TextContent(type="text", text=funcs[name](arguments or {}))]

    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
