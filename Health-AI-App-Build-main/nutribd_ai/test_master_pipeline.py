# test_master_pipeline.py
from meal_processor import process_user_day_log
import json

# Simulating common Banglish and structural inputs representing a day's menu
sample_user_day = [
    "1 plate bhat",        # 'bhat' should resolve to 'white rice' via your alias engine
    "2 pieces chicken",    # Extracts 100g, matches chicken curry
    "half bowl dal",       # Extracts 100g, matches lentil soup
    "1 cup tea"            # Extracts 200g, matches tea
]

print("--- Running End-to-End Master Processor Pipeline Test ---")
output_results = process_user_day_log(sample_user_day)

# Pretty print the final structured dictionary output layout
print(json.dumps(output_results, indent=4))
