# meal_processor.py
import pandas as pd
import re # Make sure re is imported at the top!
from utils.food_matcher import match_food
from utils.quantity_parser import extract_quantity
from utils.nutrition_calculator import calculate_food_nutrition
from utils.summary_engine import calculate_daily_summary
from utils.risk_engine import analyze_health_risks
from alias_generator import resolve_alias

def process_user_day_log(raw_meal_strings, csv_path="data/foods.csv"):
    """
    Processes a list of raw user food entries against the production foods.csv.
    """
    # 1. Load the database safely
    try:
        food_db = pd.read_csv(csv_path)
        food_db.columns = food_db.columns.str.strip() 
    except FileNotFoundError:
        return {"error": f"Database file not found at {csv_path}."}
        
    db_food_names = food_db["food_name_en"].dropna().unique().tolist()
    matcher_dict = {name: name for name in db_food_names}
    
    processed_items = []
    unmatched_items = []
    
    # 2. Iterate through each food text line
    for raw_input in raw_meal_strings:
        if not raw_input.strip():
            continue
            
        # A. Extract the quantity grams first using your parser
        parsed_grams = extract_quantity(raw_input)
        
        # B. Clean the text string to isolate the pure food name token
        # This removes digits and common measurement units from the string matching phase
        cleaned_item = raw_input.lower()
        cleaned_item = re.sub(r"\d+", "", cleaned_item) # Remove digits
        cleaned_item = re.sub(r"\b(plate|bowl|cup|piece|pieces|glass|slice|half)\b", "", cleaned_item) # Remove units
        cleaned_item = cleaned_item.strip() # Remove lingering padding spaces
        
        # C. Resolve the clean alias keyword (e.g., "bhat" -> "rice")
        resolved_input = resolve_alias(cleaned_item)
        
        # D. Match against database keys using your dict interface
        matched_db_name = match_food(resolved_input, matcher_dict)
        
        if matched_db_name:
            # Locate row using food_name_en
            food_row = food_db[food_db["food_name_en"] == matched_db_name].iloc[0]
            
            # Map column compatibility for nutrition calculator
            calculator_row = food_row.copy()
            calculator_row["food_name"] = food_row["food_name_en"]
            
            scaled_nutrition = calculate_food_nutrition(calculator_row, parsed_grams)
            scaled_nutrition["original_input"] = raw_input
            processed_items.append(scaled_nutrition)
        else:
            unmatched_items.append(raw_input)
            
    # 3. Aggregations & Screenings
    daily_totals = calculate_daily_summary(processed_items)
    detected_risks = analyze_health_risks(daily_totals)
    
    return {
        "status": "success",
        "logged_items": processed_items,
        "unmatched_items": unmatched_items,
        "daily_totals": daily_totals,
        "health_risk_alerts": detected_risks
    }