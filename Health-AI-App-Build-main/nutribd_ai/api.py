from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# -----------------------------------
# HEALTH CHECK
# -----------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok"
    })


# -----------------------------------
# FOOD ANALYSIS
# -----------------------------------
@app.route("/api/analyze-food", methods=["POST"])
def analyze_food():

    data = request.json

    food_text = data.get("foodText", "")

    # TEMPORARY MOCK RESPONSE
    # Replace later with Gemini parser

    result = {
        "detectedItems": [
            {
                "name": "Rice",
                "portion": "1 plate",
                "calories": 300,
                "carbs": 60,
                "protein": 5,
                "fat": 1,
                "sodium": 10,
                "sugar": 1,
                "iron": 0.5
            },
            {
                "name": "Fish Curry",
                "portion": "1 piece",
                "calories": 180,
                "carbs": 2,
                "protein": 20,
                "fat": 9,
                "sodium": 200,
                "sugar": 0,
                "iron": 1.2
            }
        ],

        "overallComments": "Balanced Bangladeshi meal with moderate protein and carbohydrates."
    }

    return jsonify(result)


# -----------------------------------
# RISK ENGINE
# -----------------------------------
@app.route("/api/calculate-risks", methods=["POST"])
def calculate_risks():

    data = request.json

    food_log = data.get("foodLog", [])

    total_calories = sum(item.get("calories", 0) for item in food_log)
    total_sugar = sum(item.get("sugar", 0) for item in food_log)

    alerts = []

    if total_sugar > 40:
        alerts.append({
            "title": "High Sugar Intake",
            "severity": "high",
            "explanation": "Your recent meals contain high sugar levels which may increase diabetes risk.",
            "actionableSteps": [
                "Reduce sugary tea intake",
                "Avoid packaged snacks",
                "Eat more fruits instead of sweets"
            ]
        })

    result = {
        "overallRisk": "Moderate Risk",
        "alerts": alerts,
        "disclaimer": "NutriBD AI provides preventive wellness guidance only and does not provide medical diagnosis."
    }

    return jsonify(result)


# -----------------------------------
# MEAL RECOMMENDATIONS
# -----------------------------------
@app.route("/api/meal-recommendations", methods=["POST"])
def meal_recommendations():

    result = {
        "dietaryAdvice": "Focus on balanced meals using affordable Bangladeshi foods.",

        "dailyMealRecommendations": [
            {
                "mealType": "breakfast",
                "mealName": "Egg and Roti",
                "foods": ["Egg", "Roti", "Banana"],
                "estimatedCost": "৳80"
            },
            {
                "mealType": "lunch",
                "mealName": "Rice and Fish Curry",
                "foods": ["Rice", "Fish", "Dal", "Vegetables"],
                "estimatedCost": "৳150"
            }
        ]
    }

    return jsonify(result)


# -----------------------------------
# HEALTHY ALTERNATIVES
# -----------------------------------
@app.route("/api/healthy-alternatives", methods=["POST"])
def healthy_alternatives():

    result = {
        "alternatives": [
            {
                "foodName": "Soft Drinks",
                "healthierAlternative": "Lemon Water",
                "benefit": "Lower sugar and more hydration",
                "localAffordability": "Very Affordable"
            }
        ]
    }

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)