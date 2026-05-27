# test_quantity.py
from utils.quantity_parser import extract_quantity

tests = [
    "1 plate rice",
    "half bowl dal",
    "2 pieces chicken",
    "1 cup tea",
    "rice",
    "fuchka"
]

print("--- Running Quantity Parser Verification ---")
for t in tests:
    print(f"{t} → {extract_quantity(t)}")