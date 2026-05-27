# utils/nutrition_calculator.py
import pandas as pd

def calculate_food_nutrition(food_row, quantity_g):
    """
    Scales macronutrients proportionally based on the target quantity in grams.
    Formula: (Nutrient value * quantity_g) / serving_size_g
    """
    # Safeguard against zero or missing base serving size
    base_serving = float(food_row["serving_size_g"]) if float(food_row["serving_size_g"]) > 0 else 100.0
    factor = quantity_g / base_serving
    
    # Scale all nutritional properties cleanly
    nutrition = {
        "food_name": food_row["food_name"],
        "quantity_g": quantity_g,
        "calories": round(float(food_row["calories"]) * factor, 2),
        "protein": round(float(food_row["protein"]) * factor, 2),
        "carbs": round(float(food_row["carbs"]) * factor, 2),
        "fat": round(float(food_row["fat"]) * factor, 2),
        "sugar": round(float(food_row["sugar"]) * factor, 2),
        "sodium": round(float(food_row["sodium"]) * factor, 2),
        "fiber": round(float(food_row["fiber"]) * factor, 2)
    }
    return nutrition

def calculate_totals(selected_foods):

    totals = {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "sugar": 0,
        "sodium": 0,
        "fiber": 0
    }

    for food in selected_foods:

        totals["calories"] += food["calories"]
        totals["protein"] += food["protein"]
        totals["carbs"] += food["carbs"]
        totals["fat"] += food["fat"]
        totals["sugar"] += food["sugar"]
        totals["sodium"] += food["sodium"]
        totals["fiber"] += food["fiber"]

    return totals