import pandas as pd
import re
from difflib import get_close_matches


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


def build_alias_dictionary(df):
    """
    Build alias -> official food name mapping.
    """

    alias_dict = {}

    for _, row in df.iterrows():

        official_name = normalize_text(
            row["food_name_en"]
        )

        aliases = str(row["aliases"]).split("|")

        for alias in aliases:

            cleaned_alias = normalize_text(alias)

            alias_dict[cleaned_alias] = official_name

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

    normalized_input = normalize_text(user_input)

    aliases = list(alias_dict.keys())

    matches = get_close_matches(
        normalized_input,
        aliases,
        n=1,
        cutoff=0.7
    )

    if matches:

        best_alias = matches[0]

        return alias_dict[best_alias]

    return None


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