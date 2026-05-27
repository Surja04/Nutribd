# alias_generator.py

# Mapping localized terms or alternative names to database items
ALIAS_MAP = {
    "bhat": "white rice",
    "rice": "white rice",
    "murgi": "chicken curry",
    "chicken": "chicken curry",
    "dal": "lentil soup (dal)",
    "daal": "lentil soup (dal)",
    "ruti": "roti/chapati",
    "paratha": "porota"
}

def resolve_alias(input_text):
    """
    Checks if a user input matches a known shortcut or localized alias.
    """
    cleaned = input_text.lower().strip()
    return ALIAS_MAP.get(cleaned, input_text)