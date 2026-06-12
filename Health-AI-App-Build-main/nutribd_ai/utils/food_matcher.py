import pandas as pd
import re
from difflib import SequenceMatcher
from typing import Dict, Iterable, List, Tuple

try:
    from rapidfuzz import fuzz
except ImportError:  # pragma: no cover - optional dependency
    fuzz = None
    process = None

try:
    import Levenshtein
except ImportError:  # pragma: no cover - optional dependency
    Levenshtein = None

try:
    import jellyfish
except ImportError:  # pragma: no cover - optional dependency
    jellyfish = None


def load_food_dataset(csv_path):
    """
    Load nutrition dataset CSV.
    """

    df = pd.read_csv(csv_path)

    return df


def normalize_text(text):
    """
    Normalize user input text.
    """

    text = str(text).lower().strip()

    # Remove punctuation
    text = re.sub(r"[^\w\s]", "", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text)

    return text


def _token_sort_key(text: str) -> str:
    """
    Normalize word order so 'dal moshur' and 'moshur dal' are scored similarly.
    """

    return " ".join(sorted(normalize_text(text).split()))


def _string_similarity(query: str, candidate: str) -> float:
    """
    Return 0-100 similarity using the best available fuzzy library.

    Preference order:
    1. RapidFuzz token_set_ratio (best speed/quality when installed)
    2. python-Levenshtein ratio
    3. Python's difflib SequenceMatcher fallback
    """

    query = normalize_text(query)
    candidate = normalize_text(candidate)

    if not query or not candidate:
        return 0.0

    if fuzz is not None:
        return float(max(
            fuzz.ratio(query, candidate),
            fuzz.partial_ratio(query, candidate),
            fuzz.token_sort_ratio(query, candidate),
            fuzz.token_set_ratio(query, candidate),
        ))

    if Levenshtein is not None:
        direct = Levenshtein.ratio(query, candidate) * 100
        token_sorted = Levenshtein.ratio(_token_sort_key(query), _token_sort_key(candidate)) * 100
        return float(max(direct, token_sorted))

    direct = SequenceMatcher(None, query, candidate).ratio() * 100
    token_sorted = SequenceMatcher(None, _token_sort_key(query), _token_sort_key(candidate)).ratio() * 100
    return float(max(direct, token_sorted))


def _phonetic_code(text: str) -> str:
    """
    Phonetic key for South Asian food transliterations.

    Jellyfish is optional. Metaphone helps group spelling variants such as
    'mosour', 'moshur', and 'masoor'. Soundex is used as a fallback when needed.
    """

    normalized = normalize_text(text)
    if not normalized or jellyfish is None:
        return ""

    words = normalized.split()
    codes = []
    for word in words:
        metaphone = jellyfish.metaphone(word)
        soundex = jellyfish.soundex(word)
        codes.append(metaphone or soundex or word)

    return " ".join(codes)


def _phonetic_similarity(query: str, candidate: str) -> float:
    query_code = _phonetic_code(query)
    candidate_code = _phonetic_code(candidate)

    if not query_code or not candidate_code:
        return 0.0

    return _string_similarity(query_code, candidate_code)


def closest_food_matches(
    query: str,
    food_items: Iterable[str] | Dict[str, str],
    threshold: float = 70,
    limit: int = 5,
    use_phonetic: bool = True,
) -> List[Dict[str, object]]:
    """
    Search food names/aliases with typo-tolerant and optional phonetic matching.

    Args:
        query: User input, e.g. 'mosour dal' or '1 bowl mosour dal'.
        food_items: Either a list of searchable names/aliases, or an alias dict
            mapping alias -> official food name.
        threshold: Minimum confidence score from 0-100.
        limit: Maximum number of matches to return.
        use_phonetic: If Jellyfish is installed, boost phonetically similar terms.

    Returns:
        A list of matches ordered by confidence. Each match contains:
        alias, match, score, fuzzy_score, phonetic_score.
    """

    normalized_query = normalize_text(query)
    if not normalized_query:
        return []

    if isinstance(food_items, dict):
        candidates: List[Tuple[str, str]] = [
            (normalize_text(alias), official)
            for alias, official in food_items.items()
            if normalize_text(alias)
        ]
    else:
        candidates = [
            (normalize_text(item), item)
            for item in food_items
            if normalize_text(item)
        ]

    scored_matches = []
    for alias, official in candidates:
        fuzzy_score = _string_similarity(normalized_query, alias)
        phonetic_score = _phonetic_similarity(normalized_query, alias) if use_phonetic else 0.0
        score = max(fuzzy_score, phonetic_score)

        # Give a small bonus when the candidate food phrase is contained in a
        # longer meal log, e.g. '1 bowl mosour dal for lunch'.
        if alias in normalized_query or normalized_query in alias:
            score = max(score, 95.0)

        if score >= threshold:
            scored_matches.append({
                "alias": alias,
                "match": official,
                "score": round(score, 2),
                "fuzzy_score": round(fuzzy_score, 2),
                "phonetic_score": round(phonetic_score, 2),
            })

    scored_matches.sort(key=lambda item: item["score"], reverse=True)

    deduped = []
    seen_matches = set()
    for item in scored_matches:
        if item["match"] in seen_matches:
            continue
        seen_matches.add(item["match"])
        deduped.append(item)
        if len(deduped) >= limit:
            break

    return deduped


def build_alias_dictionary(df):
    """
    Build alias -> official food name mapping.
    """

    alias_dict = {}

    for _, row in df.iterrows():

        official_name = normalize_text(
            row["food_name_en"]
        )

        aliases = [row["food_name_en"], row.get("food_name_bn", "")]
        aliases += str(row["aliases"]).split("|")

        for alias in aliases:

            cleaned_alias = normalize_text(alias)

            if cleaned_alias and cleaned_alias != "nan":
                alias_dict.setdefault(cleaned_alias, official_name)

    return alias_dict


def exact_match(user_input, alias_dict):
    """
    Try exact alias matching.
    """

    normalized_input = normalize_text(user_input)

    if normalized_input in alias_dict:
        return alias_dict[normalized_input]

    return None


def partial_match(user_input, alias_dict):
    """
    Match if alias appears inside user text.
    """

    normalized_input = normalize_text(user_input)

    for alias in alias_dict:

        if alias in normalized_input:
            return alias_dict[alias]

    return None


def fuzzy_match(user_input, alias_dict):
    """
    Handle spelling mistakes using fuzzy matching.
    """

    matches = closest_food_matches(user_input, alias_dict, threshold=70, limit=1)

    return matches[0]["match"] if matches else None


def match_food(user_input, alias_dict):
    """
    Main food matching pipeline.
    """

    # Exact match
    result = exact_match(user_input, alias_dict)

    if result:
        return result

    # Partial match
    result = partial_match(user_input, alias_dict)

    if result:
        return result

    # Fuzzy match
    result = fuzzy_match(user_input, alias_dict)

    if result:
        return result

    return None
