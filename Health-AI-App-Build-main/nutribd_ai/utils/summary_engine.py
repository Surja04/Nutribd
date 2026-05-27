# utils/summary_engine.py

def calculate_daily_summary(calculated_foods):
    """
    Sums up all scaled macro-nutrients from multiple items into a single daily total.
    """
    totals = {
        "calories": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0,
        "sugar": 0.0,
        "sodium": 0.0,
        "fiber": 0.0
    }
    
    for food in calculated_foods:
        totals["calories"] += food["calories"]
        totals["protein"] += food["protein"]
        totals["carbs"] += food["carbs"]
        totals["fat"] += food["fat"]
        totals["sugar"] += food["sugar"]
        totals["sodium"] += food["sodium"]
        totals["fiber"] += food["fiber"]
        
    # Round everything cleanly to 2 decimal places for the UI output
    for key in totals:
        totals[key] = round(totals[key], 2)
        
    return totals
    