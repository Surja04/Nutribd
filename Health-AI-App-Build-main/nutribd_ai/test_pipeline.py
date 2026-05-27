# test_pipeline.py
from utils.nutrition_calculator import calculate_food_nutrition
from utils.summary_engine import calculate_daily_summary
from utils.risk_engine import analyze_health_risks
import pandas as pd

# Mocking database rows that would normally come from your foods.csv
rice_row = pd.Series({"food_name": "white rice", "serving_size_g": 100, "calories": 130, "protein": 2.4, "carbs": 28.0, "fat": 0.3, "sugar": 0.1, "sodium": 1.0, "fiber": 0.4})
beef_row = pd.Series({"food_name": "beef curry", "serving_size_g": 100, "calories": 250, "protein": 18.0, "carbs": 5.0, "fat": 17.0, "sugar": 0.5, "sodium": 650.0, "fiber": 0.5})

print("--- Running Complete Step 5 Pipeline Verification ---")

# Simulate a user eating a large meal: 2 plates of rice (500g) and 3 pieces of beef (150g)
meal_items = [
    calculate_food_nutrition(rice_row, 500),  # 2 plates
    calculate_food_nutrition(beef_row, 300)   # 3 servings/pieces equivalent 
]

# Run through Step 5 summary engine
daily_summary = calculate_daily_summary(meal_items)
print("\n[Daily Macro Aggregation Totals]:")
for macro, value in daily_summary.items():
    print(f" - {macro.capitalize()}: {value}")

# Run through Step 5 health risk screening engine
detected_risks = analyze_health_risks(daily_summary)
print("\n[Risk Engine Evaluation Output]:")
if detected_risks:
    for risk in detected_risks:
        print(risk)
else:
    print("No health risk flags triggered for this nutritional profile.")