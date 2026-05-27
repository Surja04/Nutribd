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
    "khicuri",
    "fuchkaa",
    "ফুচকা"
]

print("\nFOOD MATCH RESULTS:\n")

for food in test_foods:

    result = match_food(food, alias_dict)

    print(f"{food} -> {result}")