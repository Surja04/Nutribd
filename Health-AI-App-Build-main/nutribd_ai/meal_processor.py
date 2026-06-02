# meal_processor.py
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

try:
    from .utils.food_matcher import match_food
    from .utils.quantity_parser import extract_quantity
    from .utils.nutrition_calculator import calculate_food_nutrition
    from .utils.summary_engine import calculate_daily_summary
    from .utils.risk_engine import analyze_health_risks
    from .alias_generator import resolve_alias
    from .vector_store import search_foods, normalize_text
except ImportError:
    from utils.food_matcher import match_food
    from utils.quantity_parser import extract_quantity
    from utils.nutrition_calculator import calculate_food_nutrition
    from utils.summary_engine import calculate_daily_summary
    from utils.risk_engine import analyze_health_risks
    from alias_generator import resolve_alias
    from vector_store import search_foods, normalize_text

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CSV_PATH = BASE_DIR / "data" / "foods.csv"


def _safe_csv_path(csv_path: str | Path) -> Path:
    path = Path(csv_path)
    if path.exists():
        return path
    local_path = BASE_DIR / str(csv_path)
    if local_path.exists():
        return local_path
    return DEFAULT_CSV_PATH


def _clean_food_text(raw_input: str) -> str:
    cleaned_item = raw_input.lower()
    cleaned_item = re.sub(r"\d+(\.\d+)?", "", cleaned_item)
    cleaned_item = re.sub(r"\b(plate|bowl|cup|piece|pieces|glass|slice|half|full|gm|g|grams|ta|টা)\b", "", cleaned_item)
    cleaned_item = re.sub(r"\s+", " ", cleaned_item).strip()
    return cleaned_item


def hybrid_match_food(cleaned_input: str, matcher_dict: Dict[str, str], food_db: pd.DataFrame) -> Optional[str]:
    """Hybrid search: alias/fuzzy matcher first, then ChromaDB semantic retrieval."""
    resolved_input = resolve_alias(cleaned_input)
    matched_db_name = match_food(resolved_input, matcher_dict)
    if matched_db_name:
        return matched_db_name

    semantic_results = search_foods(cleaned_input, n_results=3)
    if semantic_results:
        best_name = semantic_results[0].get("metadata", {}).get("food_name_en")
        if best_name and best_name in set(food_db["food_name_en"].astype(str)):
            return best_name
    return None


def process_user_day_log(raw_meal_strings: List[str], csv_path: str | Path = DEFAULT_CSV_PATH) -> Dict[str, Any]:
    """Processes raw user food entries with quantity parsing + hybrid RAG retrieval."""
    try:
        food_db = pd.read_csv(_safe_csv_path(csv_path)).fillna("")
        food_db.columns = food_db.columns.str.strip()
    except FileNotFoundError:
        return {"error": f"Database file not found at {csv_path}."}

    db_food_names = food_db["food_name_en"].dropna().astype(str).unique().tolist()
    matcher_dict = {normalize_text(name): name for name in db_food_names}
    for _, row in food_db.iterrows():
        official = str(row.get("food_name_en", ""))
        for alias in str(row.get("aliases", "")).split("|"):
            if alias.strip():
                matcher_dict.setdefault(normalize_text(alias), official)
        bn = str(row.get("food_name_bn", ""))
        if bn.strip():
            matcher_dict.setdefault(normalize_text(bn), official)

    processed_items = []
    unmatched_items = []

    for raw_input in raw_meal_strings:
        if not str(raw_input).strip():
            continue

        parsed_grams = extract_quantity(raw_input)
        cleaned_item = _clean_food_text(raw_input)
        matched_db_name = hybrid_match_food(cleaned_item, matcher_dict, food_db)

        if matched_db_name:
            match = food_db[food_db["food_name_en"].astype(str) == matched_db_name]
            if match.empty:
                unmatched_items.append(raw_input)
                continue
            food_row = match.iloc[0]
            calculator_row = food_row.copy()
            calculator_row["food_name"] = food_row["food_name_en"]
            scaled_nutrition = calculate_food_nutrition(calculator_row, parsed_grams)
            scaled_nutrition["original_input"] = raw_input
            scaled_nutrition["matched_food"] = matched_db_name
            scaled_nutrition["search_method"] = "hybrid_alias_rag"
            processed_items.append(scaled_nutrition)
        else:
            unmatched_items.append(raw_input)

    daily_totals = calculate_daily_summary(processed_items)
    detected_risks = analyze_health_risks(daily_totals)

    return {
        "status": "success",
        "logged_items": processed_items,
        "unmatched_items": unmatched_items,
        "daily_totals": daily_totals,
        "health_risk_alerts": detected_risks,
    }
