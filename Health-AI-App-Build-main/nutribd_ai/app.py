# app.py
import streamlit as st
import pandas as pd
from meal_processor import process_user_day_log

# 1. Page Configuration Setup
st.set_page_config(
    page_title="NutriBD AI - Nutrition Tracker",
    page_icon="🥗",
    layout="wide"
)

# 2. Main Header and App Hero Layout
st.title("🥗 NutriBD AI")
st.subheader("AI-Powered Personalized Nutrition & Health Risk Assistant for Bangladesh")
st.markdown("---")

# Create a two-column dashboard layout
col1, col2 = st.columns([1, 2])

with col1:
    st.header("📝 Log Your Meals")
    st.caption("Enter your food items line-by-line (e.g., '1 plate bhat', '2 pieces chicken')")
    
    # Text area for user entry inputs
    user_input_raw = st.text_area(
        "What did you eat today?",
        value="1 plate bhat\n2 pieces chicken\nhalf bowl dal",
        height=200
    )
    
    analyze_btn = st.button("Analyze Intake & Screen Health Risks", type="primary")

with col2:
    st.header("📊 Nutritional Analysis & Screenings")
    
    if analyze_btn and user_input_raw.strip():
        # Break down raw text area lines into a structured list array
        meal_lines = [line.strip() for line in user_input_raw.split("\n") if line.strip()]
        
        # Fire our master backend processing pipeline engine!
        with st.spinner("Processing local fuzzy matches and scaling nutrient matrix..."):
            results = process_user_day_log(meal_lines)
            
        if "error" in results:
            st.error(results["error"])
        else:
            # --- DISPLAY ACCUMULATED METRICS ---
            totals = results["daily_totals"]
            
            # Display Key Metric Scorecards across the screen
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Calories", f"{totals['calories']} kcal")
            m2.metric("Protein", f"{totals['protein']}g")
            m3.metric("Carbohydrates", f"{totals['carbs']}g")
            m4.metric("Fat", f"{totals['fat']}g")
            
            # --- DISPLAY MEDICAL ALERTS & RISK SCREENINGS ---
            st.subheader("⚠️ Health Risk Screening Output")
            alerts = results["health_risk_alerts"]
            
            if alerts:
                for alert in alerts:
                    if "CRITICAL" in alert:
                        st.error(alert)
                    elif "WARNING" in alert:
                        st.warning(alert)
                    else:
                        st.info(alert)
            else:
                st.success("✅ No critical dietary health risks flagged for this nutritional profile.")
                
            # --- DISPLAY DETAILED LOGGED ITEMS ---
            st.subheader("📋 Logged Food Breakdown")
            logged_foods = results["logged_items"]
            
            if logged_foods:
                # Convert list of dicts to a clean pandas display table
                df_foods = pd.DataFrame(logged_foods)
                
                # List of target column keys we want to showcase
                target_cols = ["food_name", "quantity_g", "calories", "protein", "carbs", "fat", "sodium", "fiber"]
                
                # Safe intersection filtering to prevent unexpected column Index KeyErrors
                df_display = df_foods[[col for col in target_cols if col in df_foods.columns]].copy()
                
                # Formatting column headers to look clean and professional (e.g., 'food_name' -> 'Food Name')
                df_display.columns = [col.replace('_', ' ').title() for col in df_display.columns]
                
                # Render the final interactive dataset view
                st.dataframe(df_display, use_container_width=True)
            
            # --- DISPLAY UNMATCHED ITEMS WARNING ---
            unmatched = results["unmatched_items"]
            if unmatched:
                st.markdown("---")
                st.warning(f"🔍 **Unmatched Items:** The following entries couldn't be accurately matched to our database: {', '.join([f'`{u}`' for u in unmatched])}")
    else:
        st.info("💡 Enter your food entries on the left side panel and click 'Analyze Intake' to compile your hackathon dashboard report.")