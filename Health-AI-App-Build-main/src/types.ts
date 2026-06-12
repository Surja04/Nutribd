export interface HealthProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number; // in kg
  height: number; // in cm
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  healthConditions: string[]; // e.g., 'diabetes', 'hypertension', 'obesity', 'none', 'cholesterol', 'kidney_risk'
  dietaryPreference: 'none' | 'vegetarian' | 'vegan' | 'halal';
  budgetPreference: 'budget' | 'moderate' | 'premium';
}

export interface FoodItem {
  id: string;
  name: string;
  portion: string; // e.g., "1 plate", "1 plate - 150g", "1 piece"
  calories: number;
  carbs: number; // in grams
  protein: number; // in grams
  fat: number; // in grams
  sodium: number; // in mg
  sugar: number; // in grams
  iron: number; // in mg (important local nutrient)
}

export interface FoodAnalysisResult {
  detectedItems: FoodItem[];
  overallComments: string;
}

export interface HealthRiskAlert {
  title: string;
  severity: 'low' | 'medium' | 'high';
  explanation: string; // Clear, conversational, non-diagnosing explanation
  actionableSteps: string[];
}

export interface HealthRiskAssessment {
  alerts: HealthRiskAlert[];
  overallSummary: string;
  disclaimer: string; // Strict non-medical disclaimer
}

export interface MealRecommendation {
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  title: string;
  banglaName?: string;
  ingredients: string[]; // Local, affordable ingredients
  estimatedCost: string; // e.g. "Low (50-80 BDT)", "Medium (100-150 BDT)"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  preparations: string[];
}

export interface MealPlanResponse {
  dailyMealRecommendations: MealRecommendation[];
  dietaryAdvice: string;
  groceryShoppingList: string[]; // Bangladesh localized, e.g., Shwapno/Local Bazar
}

export interface FoodAlternative {
  unhealthyFood: string;
  healthierAlternative: string;
  banglaAlternativeName?: string;
  whyBetter: string; // Nutrient comparison, glycemic response, portion size
  localAffordability: string; // e.g. "Highly affordable, available at any local tong or grocery shop"
  approximatePriceDiff: string; // comparison, e.g. "Cheap (saves 15 BDT per serving)"
  nutritionComparison: {
    unhealthyCalories: number;
    healthyCalories: number;
    unhealthyBenefits?: string;
    healthyBenefits?: string;
  };
}

export interface TrainingPlanDay {
  dayLabel: string;
  focus: string;
  durationMinutes: number;
  warmup: string[];
  exercises: {
    name: string;
    sets: string;
    repsOrTime: string;
    rest: string;
    notes: string;
  }[];
  cooldown: string[];
}

export interface TrainingPlanResponse {
  goalSummary: string;
  safetyNotes: string[];
  weeklyPlan: TrainingPlanDay[];
  progressionAdvice: string;
  recoveryAdvice: string;
}
