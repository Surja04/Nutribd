# utils/quantity_parser.py
import re

# Serving size definitions (adjusted to standard weight profiles)
QUANTITY_MAP = {
    "plate": 250,
    "bowl": 200,
    "cup": 200,
    "piece": 50,
    "pieces": 100,
    "slice": 80,
    "glass": 250,
}

def extract_quantity(text):
    """
    Parses strings like '1 plate rice' or '2 pieces chicken' into physical gram profiles.
    """
    text = text.lower().strip()
    
    # 1. Handle explicit 'half' modifiers structurally
    if "half" in text:
        for unit, weight in QUANTITY_MAP.items():
            if unit in text:
                return int(weight * 0.5)
        return 100 # Fallback for 'half' without a clear unit
        
    # 2. Extract specific patterns: number + unit (e.g., '2 pieces')
    match = re.search(r"(\d+)\s*(plate|bowl|cup|piece|pieces|glass|slice)", text)
    if match:
        number = int(match.group(1))
        unit = match.group(2)
        # Handle 'pieces' mapping cleanly down to base 'piece' weight if needed
        base_unit = "piece" if unit == "pieces" else unit
        return number * QUANTITY_MAP.get(base_unit, 100)
        
    # 3. Default fallback if no measurement unit is found
    return 100