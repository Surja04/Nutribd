# test_nutrition.py
import pandas as pd
from utils.nutrition_calculator import calculate_food_nutrition

# Create a mock database row matching the fields in your foods.csv
mock_row = pd.Series({
    "food_name": "white rice",
    "serving_size_g": 100,
    "calories": 130,
    "protein": 2.4,
    "carbs": 28.0,
    "fat": 0.3,
    "sugar": 0.1,
    "sodium": 1,
    "fiber": 0.4
})

# Test scaling 100g base up to a full plate (250g)
target_grams = 250
result = calculate_food_nutrition(mock_row, target_grams)

print("--- Running Nutrition Calculator Verification ---")
print(f"Food: {result['food_name']} ({result['quantity_g']}g)")
print(f"Calories: {result['calories']} kcal")
print(f"Protein: {result['protein']}g")
print(f"Carbs: {result['carbs']}g")
print(f"Fat: {result['fat']}g")