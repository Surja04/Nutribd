from utils.food_matcher import *

# Load dataset
df = load_food_dataset("data/foods.csv")

# Build alias dictionary
alias_dict = build_alias_dictionary(df)

# Test inputs
test_foods = [
    "bhaat",
    "vat",
    "rice",
    "1 plate rice",
    "beff curry",
    "mosour dal",
    "mushur dal",
    "khicuri",
    "fuchkaa",
    "ফুচকা"
]

print("\nFOOD MATCH RESULTS:\n")

for food in test_foods:

    result = match_food(food, alias_dict)

    print(f"{food} -> {result}")

print("\nTOP FUZZY MATCHES FOR 'mosour dal':\n")
for match in closest_food_matches("mosour dal", alias_dict, threshold=60, limit=5):
    print(match)
