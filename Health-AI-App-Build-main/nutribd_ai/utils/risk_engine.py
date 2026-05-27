# utils/risk_engine.py

def analyze_health_risks(daily_totals):
    """
    Evaluates total daily macro intake against standard thresholds 
    and flags critical dietary health warnings.
    """
    flags = []
    
    # 1. Sodium/Salt Risk (Critical for hypertension in BD)
    if daily_totals["sodium"] > 2300:
        flags.append("CRITICAL: High Sodium Intake (>2300mg). Elevated risk for Hypertension and Cardiovascular issues.")
        
    # 2. Sugar Risk (Diabetes screening threshold)
    if daily_totals["sugar"] > 50:
        flags.append("WARNING: High Sugar Intake (>50g). Increases risk for glycemic spikes and Type 2 Diabetes.")
        
    # 3. High Simple Carbohydrates / Calorie Surplus
    if daily_totals["calories"] > 2500:
        flags.append("NOTICE: Caloric Intake exceeds 2500 kcal. Monitor for unexpected weight gain or metabolic strain.")
        
    # 4. Fiber Deficiency (Common in low-vegetable/processed diets)
    if daily_totals["fiber"] < 20:
        flags.append("DIETARY GAP: Low Fiber Intake (<20g). Recommended to increase whole grains, lentils, or vegetables for digestive health.")
        
    return flags