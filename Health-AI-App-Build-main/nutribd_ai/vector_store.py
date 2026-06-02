"""
ChromaDB vector store for NutriBD AI.

Builds a local persistent semantic index from nutribd_ai/data/foods.csv.
Uses ChromaDB + sentence-transformers when installed, and falls back to
safe keyword search if vector dependencies are unavailable.
"""
from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "foods.csv"
CHROMA_PATH = BASE_DIR / "data" / "chroma_db"
COLLECTION_NAME = "nutribd_foods"
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"
_collection = None


def _clean_value(value: Any, default: str = "") -> str:
    if value is None:
        return default
    try:
        if isinstance(value, float) and math.isnan(value):
            return default
    except TypeError:
        pass
    text = str(value).strip()
    return text if text and text.lower() != "nan" else default


def _num(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_text(text: str) -> str:
    text = _clean_value(text).lower()
    text = text.replace("-", " ")
    text = re.sub(r"[^\w\s\u0980-\u09FF]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_foods(csv_path: Path | str = DATA_PATH) -> pd.DataFrame:
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"foods.csv not found: {path}")
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()
    required = ["food_id", "food_name_en", "food_name_bn", "aliases", "category"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in foods.csv: {missing}")
    return df.fillna("")


def build_food_chunk(row: pd.Series, alias: Optional[str] = None) -> str:
    name_en = _clean_value(row.get("food_name_en"), "Unknown food")
    name_bn = _clean_value(row.get("food_name_bn"), "")
    aliases = _clean_value(row.get("aliases"), "")
    category = _clean_value(row.get("category"), "uncategorized")
    serving = _num(row.get("serving_size_g"))
    chunk = (
        f"Food: {name_en} ({name_bn}). Category: {category}. "
        f"Aliases: {aliases}. Per {serving:g}g: {_num(row.get('calories')):g} kcal, "
        f"{_num(row.get('protein')):g}g protein, {_num(row.get('carbs')):g}g carbs, "
        f"{_num(row.get('fat')):g}g fat, {_num(row.get('sodium')):g}mg sodium, "
        f"{_num(row.get('fiber')):g}g fiber."
    )
    if alias:
        chunk = f"Search alias: {alias}. " + chunk
    return chunk


def _metadata(row: pd.Series, alias: Optional[str] = None) -> Dict[str, Any]:
    return {
        "food_id": _clean_value(row.get("food_id")),
        "food_name_en": _clean_value(row.get("food_name_en")),
        "food_name_bn": _clean_value(row.get("food_name_bn")),
        "alias": alias or "",
        "category": _clean_value(row.get("category"), "uncategorized"),
        "serving_size_g": _num(row.get("serving_size_g")),
        "calories": _num(row.get("calories")),
        "protein": _num(row.get("protein")),
        "carbs": _num(row.get("carbs")),
        "fat": _num(row.get("fat")),
        "sugar": _num(row.get("sugar")),
        "sodium": _num(row.get("sodium")),
        "fiber": _num(row.get("fiber")),
    }


def _aliases_for_row(row: pd.Series) -> List[str]:
    values = [_clean_value(row.get("food_name_en")), _clean_value(row.get("food_name_bn"))]
    values += [a.strip() for a in _clean_value(row.get("aliases")).split("|") if a.strip()]
    seen, out = set(), []
    for v in values:
        key = normalize_text(v)
        if key and key not in seen:
            seen.add(key)
            out.append(v)
    return out or [_clean_value(row.get("food_name_en"), "food")]


def _get_chroma_collection(reset: bool = False):
    global _collection
    if _collection is not None and not reset:
        return _collection

    import chromadb
    from chromadb.utils import embedding_functions

    CHROMA_PATH.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    if reset:
        try:
            client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass
    embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    _collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embedder,
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


def build_index(csv_path: Path | str = DATA_PATH, reset: bool = True) -> Dict[str, Any]:
    """Build the persistent ChromaDB index from foods.csv."""
    df = load_foods(csv_path)
    collection = _get_chroma_collection(reset=reset)

    ids, docs, metas = [], [], []
    for idx, row in df.iterrows():
        for alias_i, alias in enumerate(_aliases_for_row(row)):
            ids.append(f"food-{_clean_value(row.get('food_id'), str(idx))}-{alias_i}")
            docs.append(build_food_chunk(row, alias=alias))
            metas.append(_metadata(row, alias=alias))

    if ids:
        collection.upsert(ids=ids, documents=docs, metadatas=metas)
    return {"status": "success", "foods": len(df), "chunks": len(ids), "path": str(CHROMA_PATH)}


def _keyword_search(query: str, n_results: int = 5, csv_path: Path | str = DATA_PATH) -> List[Dict[str, Any]]:
    df = load_foods(csv_path)
    q = normalize_text(query)
    scored = []
    for _, row in df.iterrows():
        text = normalize_text(" ".join([_clean_value(row.get("food_name_en")), _clean_value(row.get("food_name_bn")), _clean_value(row.get("aliases")), _clean_value(row.get("category"))]))
        score = 0
        if q and q in text:
            score += 10
        score += sum(1 for token in q.split() if token and token in text)
        if score:
            scored.append((score, row))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"document": build_food_chunk(row), "metadata": _metadata(row), "distance": None, "score": score} for score, row in scored[:n_results]]


def _dedupe_results(results: List[Dict[str, Any]], n_results: int) -> List[Dict[str, Any]]:
    unique = []
    seen = set()
    for item in results:
        name = normalize_text(item.get("metadata", {}).get("food_name_en", ""))
        if not name or name in seen:
            continue
        seen.add(name)
        unique.append(item)
        if len(unique) >= n_results:
            break
    return unique


def search_foods(query: str, n_results: int = 5) -> List[Dict[str, Any]]:
    """Return deduplicated lexical + semantic food matches."""
    if not query or not str(query).strip():
        return []
    lexical_results = _keyword_search(query, n_results=n_results)
    try:
        collection = _get_chroma_collection(reset=False)
        if collection.count() == 0:
            build_index(reset=False)
        result = collection.query(query_texts=[query], n_results=max(n_results * 3, n_results))
        docs = result.get("documents", [[]])[0]
        metas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0] if result.get("distances") else [None] * len(docs)
        semantic_results = [{"document": d, "metadata": m, "distance": dist} for d, m, dist in zip(docs, metas, distances)]
        return _dedupe_results(lexical_results + semantic_results, n_results)
    except Exception:
        return _dedupe_results(lexical_results, n_results)


if __name__ == "__main__":
    print(build_index())
