import React, { useState, useEffect } from 'react';
import { HealthProfile, FoodItem, FoodAnalysisResult, HealthRiskAssessment, MealPlanResponse, FoodAlternative } from './types';
import HealthProfileForm from './components/HealthProfileForm';
import { 
  HeartPulse, 
  Activity, 
  BadgeDollarSign, 
  Sparkles, 
  Apple, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  Search, 
  HelpCircle, 
  CheckCircle, 
  ShoppingBag,
  RefreshCw,
  Scale,
  UtensilsCrossed,
  Layers,
  Sparkle
} from 'lucide-react';

// Static preset DB of local street foods for quick mock inserts
const PRESET_LOCAL_FOODS = [
  { name: "White Rice (Bhaat)", portion: "1 plate (200g)", calories: 260, carbs: 58, protein: 5.2, fat: 0.4, sodium: 5, sugar: 0.1, iron: 0.4 },
  { name: "Laal Bhaat (Red Rice)", portion: "1 plate (200g)", calories: 230, carbs: 48, protein: 6.0, fat: 1.2, sodium: 4, sugar: 0.1, iron: 1.8 },
  { name: "Oil Fried Paratha", portion: "1 piece (60g)", calories: 260, carbs: 36, protein: 4.5, fat: 11.2, sodium: 180, sugar: 0.5, iron: 1.1 },
  { name: "Ruti (Flat Homemade Atta)", portion: "1 piece (45g)", calories: 110, carbs: 22, protein: 3.5, fat: 0.5, sodium: 4, sugar: 0.2, iron: 1.2 },
  { name: "Aloo Bhaji", portion: "1 cup (150g)", calories: 180, carbs: 22, protein: 3.1, fat: 9.5, sodium: 320, sugar: 1.2, iron: 0.9 },
  { name: "Rui Fish Curry", portion: "1 piece with gravy", calories: 155, carbs: 2.5, protein: 17.2, fat: 8.4, sodium: 290, sugar: 0.2, iron: 1.4 },
  { name: "Moshur Dal (Thin Lentil)", portion: "1 cup cooked", calories: 140, carbs: 19, protein: 9.4, fat: 2.1, sodium: 240, sugar: 0.8, iron: 2.2 },
  { name: "Singara (Street snack)", portion: "1 piece (75g)", calories: 210, carbs: 28, protein: 3.5, fat: 10.2, sodium: 340, sugar: 0.8, iron: 0.8 },
  { name: "Peyara (Fresh Guava)", portion: "1 fruit (120g)", calories: 60, carbs: 14, protein: 1.4, fat: 0.4, sodium: 2, sugar: 8.9, iron: 0.3 },
  { name: "Roadside Sweetened Tea", portion: "1 cup", calories: 85, carbs: 14, protein: 2.1, fat: 1.8, sodium: 25, sugar: 12, iron: 0.1 },
  { name: "Beef Rezala", portion: "1 plate (150g)", calories: 340, carbs: 6, protein: 24, fat: 24.5, sodium: 450, sugar: 1.1, iron: 2.8 }
];

export default function App() {
  // Localized state corresponding to Bangladeshi health focus conditions and standards
  const [profile, setProfile] = useState<HealthProfile>({
    age: 28,
    gender: 'female',
    weight: 58,
    height: 155,
    activityLevel: 'sedentary',
    healthConditions: ['none'],
    dietaryPreference: 'none',
    budgetPreference: 'budget'
  });

  // Food analysis states
  const [foodTextInput, setFoodTextInput] = useState<string>(
    "I had one oil fried paratha with potato bhaji and roadside sweetened milk tea for breakfast, a plate of white rice with lens dal and rui fish curry for lunch."
  );
  const [isAnalyzingFood, setIsAnalyzingFood] = useState<boolean>(false);
  const [detectedResult, setDetectedResult] = useState<FoodAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Daily logged active dataset
  const [dailyFoodLog, setDailyFoodLog] = useState<FoodItem[]>([
    { id: "log-1", name: "Oil Fried Paratha", portion: "1 piece (60g)", calories: 260, carbs: 36, protein: 4.5, fat: 11.2, sodium: 180, sugar: 0.5, iron: 1.1 },
    { id: "log-2", name: "Aloo Bhaji", portion: "1 cup (150g)", calories: 180, carbs: 22, protein: 3.1, fat: 9.5, sodium: 320, sugar: 1.2, iron: 0.9 },
    { id: "log-3", name: "Roadside Sweetened Tea", portion: "1 cup", calories: 85, carbs: 14, protein: 2.1, fat: 1.8, sodium: 25, sugar: 12, iron: 0.1 }
  ]);

  // AI preventative assessment states
  const [isGeneratingRisks, setIsGeneratingRisks] = useState<boolean>(false);
  const [riskAssessment, setRiskAssessment] = useState<HealthRiskAssessment | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);

  // Personalized meal plan recommendations
  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState<boolean>(false);
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [mealError, setMealError] = useState<string | null>(null);

  // Healthier alternatives states
  const [isGeneratingAlternatives, setIsGeneratingAlternatives] = useState<boolean>(false);
  const [alternativesList, setAlternativesList] = useState<FoodAlternative[]>([]);
  const [alternativeSearch, setAlternativeSearch] = useState<string>("");
  const [alternativeError, setAlternativeError] = useState<string | null>(null);

  // General App Dashboard navigation tabs
  const [activeTab, setActiveTab] = useState<'tracker' | 'risks' | 'meals' | 'alternatives'>('tracker');

  // Server health test indicator
  const [apiActive, setApiActive] = useState<boolean>(false);

  // Fast calculation indices:
  const isProfileValid =
    profile.age >= 12 &&
    profile.age <= 110 &&
    profile.weight >= 30 &&
    profile.weight <= 200 &&
    profile.height >= 100 &&
    profile.height <= 250;

  const weightKg = Math.max(0, profile.weight);
  const heightM = profile.height > 0 ? profile.height / 100 : 1;
  const bmi = profile.height > 0 ? Number((weightKg / (heightM * heightM)).toFixed(1)) : 0;

  // Determine BMI category using South Asian Specific thresholds 
  // Overweight standards in South Asian populations begin lower (at 23.0) due to higher risk of cardiovascular diseases and abdominal visceral adiposity.
  let bmiCategory = "";
  let bmiColor = "";
  let bmiAdvice = "";
  if (bmi < 18.5) {
    bmiCategory = "Underweight";
    bmiColor = "text-amber-600 bg-amber-50 border-amber-200";
    bmiAdvice = "Elevate nutritional density with local healthy fats (Mustard oil, groundnuts).";
  } else if (bmi >= 18.5 && bmi <= 22.9) {
    bmiCategory = "Healthy Range (South Asian standard)";
    bmiColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
    bmiAdvice = "Excellent physical profile. Focus on diet balanced with micronutrients.";
  } else if (bmi >= 23.0 && bmi <= 27.4) {
    bmiCategory = "Overweight Risk Range";
    bmiColor = "text-orange-700 bg-orange-50 border-orange-200";
    bmiAdvice = "Overweight risks on South Asian criteria trigger early insulin resistance. Reduce heavy rice starch.";
  } else {
    bmiCategory = "Obese Range";
    bmiColor = "text-red-700 bg-red-50 border-red-200";
    bmiAdvice = "Urgent clinical risk warning. Substitute high-fat commercial foods with vegetables.";
  }

  // Calculate energy needs using Harris-Benedict formula 
  let BMR = 0;
  if (profile.gender === 'male') {
    BMR = 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * profile.age);
  } else {
    BMR = 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * profile.age);
  }

  const multipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725
  };

  const tdee = Math.round(BMR * multipliers[profile.activityLevel]);

  // Adjust macronutrients thresholds for conditions:
  // e.g., low-carb for Diabetes, low-sodium for Hypertension, high-sugar penalties
  const hasDiabetes = profile.healthConditions.includes('diabetes');
  const hasHypertension = profile.healthConditions.includes('hypertension');
  const hasAnemia = profile.healthConditions.includes('anemia') || profile.gender === 'female';

  const limitCalories = tdee;
  const targetCarbs = hasDiabetes ? Math.round((tdee * 0.45) / 4) : Math.round((tdee * 0.55) / 4);
  const targetProtein = Math.round(profile.weight * 1.2); // 1.2g per kg rule of thumb
  const targetFat = Math.round((tdee * 0.25) / 9);
  const limitSodium = hasHypertension ? 1500 : 2200; // stricter limit in mg for hypertension
  const limitSugar = hasDiabetes ? 20 : 35; // stricter limit in grams for diabetic patients
  const targetIron = hasAnemia ? 18 : 8; // high target in mg for vulnerable anemia metrics

  // Compute live current totals from current log:
  const currentTotals = dailyFoodLog.reduce((acc, current) => {
    return {
      calories: acc.calories + (current.calories || 0),
      carbs: acc.carbs + (current.carbs || 0),
      protein: acc.protein + (current.protein || 0),
      fat: acc.fat + (current.fat || 0),
      sodium: acc.sodium + (current.sodium || 0),
      sugar: acc.sugar + (current.sugar || 0),
      iron: acc.iron + (current.iron || 0)
    };
  }, { calories: 0, carbs: 0, protein: 0, fat: 0, sodium: 0, sugar: 0, iron: 0 });

  // Test API Availability on mount and whenever profile modifications occur
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'ok') {
          setApiActive(true);
        }
      })
      .catch(err => {
        console.warn("NutriBD AI Server check failed, fallback mode activated natively.", err);
        setApiActive(false);
      });
  }, []);

  // Fetch initial food alternatives
  useEffect(() => {
    fetchAlternatives();
  }, []);

  // Handle Natural Language Food Intake Analysis
  const handleAnalyzeFoodIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodTextInput.trim()) return;

    setIsAnalyzingFood(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodText: foodTextInput })
      });

      if (!response.ok) {
        throw new Error("Analysis requested returned an error response from server.");
      }

      const data: FoodAnalysisResult = await response.json();
      setDetectedResult(data);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || "Failed to analyze meals. Check server health.");
    } finally {
      setIsAnalyzingFood(false);
    }
  };

  // Add all detected items to personal daily list log
  const handleAddAllToLog = () => {
    if (!detectedResult || !detectedResult.detectedItems) return;
    const itemsWithId = detectedResult.detectedItems.map(item => ({
      ...item,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    setDailyFoodLog(prev => [...prev, ...itemsWithId]);
    setDetectedResult(null);
    setFoodTextInput("");
  };

  // Quick preset inserts
  const handleAddQuickPreset = (food: Omit<FoodItem, 'id'>) => {
    const fresh: FoodItem = {
      ...food,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setDailyFoodLog(prev => [...prev, fresh]);
  };

  // Remove individual log
  const handleRemoveLogItem = (id: string) => {
    setDailyFoodLog(prev => prev.filter(item => item.id !== id));
  };

  // Clear entire user food log
  const handleClearAllLogs = () => {
    if (confirm("Are you sure you want to clear your daily food track list?")) {
      setDailyFoodLog([]);
    }
  };

  // Trigger AI preventive risks
  const triggerPreventiveRiskAssessment = async () => {
    if (!isProfileValid) {
      setRiskError("Complete a valid Age, Weight, and Height before running risk assessment.");
      return;
    }

    setIsGeneratingRisks(true);
    setRiskError(null);

    try {
      const response = await fetch('/api/calculate-risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: profile,
          foodLog: dailyFoodLog
        })
      });

      if (!response.ok) {
        throw new Error("Unable to parse risk parameters cleanly from health record.");
      }

      const data: HealthRiskAssessment = await response.json();
      setRiskAssessment(data);
      setActiveTab('risks');
    } catch (err: any) {
      console.error(err);
      setRiskError(err.message || "Risk engine failed to resolve database analytics.");
    } finally {
      setIsGeneratingRisks(false);
    }
  };

  // Trigger Personalized Meal Recommendations & budget checklist
  const triggerMealRecommendations = async () => {
    if (!isProfileValid) {
      setMealError("Complete a valid Age, Weight, and Height before generating meal recommendations.");
      return;
    }

    setIsGeneratingMealPlan(true);
    setMealError(null);

    try {
      const response = await fetch('/api/meal-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });

      if (!response.ok) {
        throw new Error("Failed generating affordable meal recipes for Bangladesh climate.");
      }

      const data: MealPlanResponse = await response.json();
      setMealPlan(data);
      setActiveTab('meals');
    } catch (err: any) {
      console.error(err);
      setMealError(err.message || "High complexity in server nutrition calculation pathways.");
    } finally {
      setIsGeneratingMealPlan(false);
    }
  };

  // Fetch food alternatives
  const fetchAlternatives = async (query: string = "") => {
    setIsGeneratingAlternatives(true);
    setAlternativeError(null);

    try {
      const response = await fetch('/api/healthy-alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customQuery: query })
      });

      if (!response.ok) {
        throw new Error("Alternative food indexing algorithm could not resolve search.");
      }

      const data = await response.json();
      setAlternativesList(data.alternatives || []);
    } catch (err: any) {
      console.error(err);
      setAlternativeError(err.message || "Failed pulling alternatives array statistics.");
    } finally {
      setIsGeneratingAlternatives(false);
    }
  };

  const handleSearchAlternative = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAlternatives(alternativeSearch);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-700 font-sans antialiased">
      {/* Visual Header Banner */}
      <header className="sticky top-0 z-30 bg-emerald-950 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-inner border border-emerald-500 animate-pulse">
              <HeartPulse className="w-6.5 h-6.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-1.5 text-emerald-100">
                  NutriBD <span className="text-emerald-400">AI</span>
                </h1>
                <span className="text-[10px] bg-emerald-850 border border-emerald-700 px-2 py-0.5 rounded-full text-emerald-300 font-semibold tracking-wide">
                  HACKATHON RELEASE
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/90 font-medium">
                Personalized Nutrition &amp; Preventive Health Risk Assistant for Bangladesh
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* AI License State Indicator */}
            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 border ${
              apiActive 
                ? 'bg-emerald-900/50 border-emerald-600/50 text-emerald-300' 
                : 'bg-amber-950/40 border-amber-700/50 text-amber-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${apiActive ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <span>{apiActive ? "Live Gemini AI Active" : "Local Data Core Active"}</span>
            </div>

            {/* Quick Refresh */}
            <button 
              onClick={() => window.location.reload()}
              title="Reset Application"
              className="bg-emerald-900 hover:bg-emerald-800 border border-emerald-800 text-emerald-200 hover:text-white p-2 rounded-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Non-Medical Strict Prevention Disclaimer Banner */}
      <section className="bg-amber-50 border-y border-amber-100 py-2.5 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2 text-xs text-amber-900 font-medium">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0" id="disclaimer-alert-icon" />
          <span>
            <strong>Disclaimer:</strong> This is a nutritional preventive awareness assistant. It is **NOT** a clinical diagnostic system. It provides helpful dietary plans using affordable Bangladeshi ingredients and alerts regarding nutritional risks.
          </span>
        </div>
      </section>

      {/* Main Body Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6" id="main-section">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE PANEL (4 cols): User health profiling, BMI tracker & energy target calculators */}
          <section className="lg:col-span-4 space-y-6" id="left-sidebar">
            <HealthProfileForm
              profile={profile}
              onChange={(next) => setProfile(next)}
              isLoading={isGeneratingMealPlan || isGeneratingRisks}
              onGenerateRecommendations={() => {
                triggerMealRecommendations();
                triggerPreventiveRiskAssessment();
              }}
            />

            {/* Local South Asian Nutrition Calculator Dashboard Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Scale className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Calculated South Asian RDA</h3>
              </div>

              {/* BMI Panel */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Body Mass Index (BMI)</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${bmiColor}`}>
                    {bmi} - {bmiCategory}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-yellow-400 h-full" style={{ width: '18%' }} title="Underweight" />
                  <div className="bg-emerald-500 h-full" style={{ width: '22%' }} title="Healthy" />
                  <div className="bg-orange-400 h-full" style={{ width: '22%' }} title="South Asian Overweight" />
                  <div className="bg-red-500 h-full" style={{ width: '38%' }} title="Obese" />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed italic pt-1">{bmiAdvice}</p>
              </div>

              {/* TDEE Tracker & Macro Goals Breakdown */}
              <div className="space-y-3.5 pt-2 border-t border-slate-50">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-700">Daily Calorie Target (TDEE)</span>
                    <span className="text-sm font-black text-emerald-600">{limitCalories.toLocaleString()} kcal</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">Calculated specifically based on daily activity and bodily energy budgets.</p>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <span className="block text-[11px] font-bold text-slate-600 tracking-wider uppercase mb-1.5">Daily Macronutrient Limits & Targets</span>
                  
                  {/* Carbs */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Carbohydrates Target:</span>
                      <span className="font-semibold text-slate-800">{targetCarbs}g {hasDiabetes ? "(Restricted - Diabetes)" : ""}</span>
                    </div>
                  </div>

                  {/* Protein */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Protein Target:</span>
                      <span className="font-semibold text-slate-800">{targetProtein}g (Minimum 1.2g/kg)</span>
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Healthy Fat Target:</span>
                      <span className="font-semibold text-slate-800">{targetFat}g</span>
                    </div>
                  </div>

                  {/* Sodium */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Sodium Limit:</span>
                      <span className="font-semibold text-amber-700 font-bold">{limitSodium} mg {hasHypertension ? "(Restricted - Hypertension)" : ""}</span>
                    </div>
                  </div>

                  {/* Sugar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Free-Sugars Max Limit:</span>
                      <span className="font-semibold text-red-600 font-bold">{limitSugar} g {hasDiabetes ? "(Strict limit)" : ""}</span>
                    </div>
                  </div>

                  {/* Iron */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Iron Focus Intake:</span>
                      <span className="font-semibold text-violet-700 font-bold">{targetIron} mg {profile.gender === 'female' ? "(High Requirement)" : ""}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="pt-4 border-t border-slate-150 flex flex-col gap-2">
                <button
                  onClick={triggerPreventiveRiskAssessment}
                  disabled={isGeneratingRisks}
                  className="w-full text-left bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold py-2.5 px-3 rounded-xl border border-indigo-100 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Generate AI Health Risks</span>
                  </div>
                  <span>→</span>
                </button>

                <button
                  onClick={triggerMealRecommendations}
                  disabled={isGeneratingMealPlan}
                  className="w-full text-left bg-violet-50 hover:bg-violet-100 text-violet-900 text-xs font-semibold py-2.5 px-3 rounded-xl border border-violet-100 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkle className="w-3.5 h-3.5 text-violet-600" />
                    <span>Affordable Meal Recommendations</span>
                  </div>
                  <span>→</span>
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT WORKSPACE SECTION (8 cols): Interactive Application Core */}
          <section className="lg:col-span-8 space-y-6" id="right-workspace">
            
            {/* Navigation Tabs */}
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('tracker')}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'tracker'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Apple className="w-4 h-4" />
                <span>Intake Tracker</span>
              </button>

              <button
                onClick={() => {
                  if (!riskAssessment) {
                    triggerPreventiveRiskAssessment();
                  }
                  setActiveTab('risks');
                }}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'risks'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-100/90 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Risk Assessment</span>
                {riskAssessment && (
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => {
                  if (!mealPlan) {
                    triggerMealRecommendations();
                  }
                  setActiveTab('meals');
                }}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'meals'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Meal &amp; Grocery Plan</span>
              </button>

              <button
                onClick={() => setActiveTab('alternatives')}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'alternatives'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Healthy Swapping</span>
              </button>
            </div>

            {/* TAB INTERACTIVE WORKSPACE PAGES */}
            
            {/* VIEW 1: DAILY DIETARY LOG & ANALYZER */}
            {activeTab === 'tracker' && (
              <div className="space-y-6" id="tracker-pane">
                
                {/* Natural Language Prompting Box */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-slate-800 text-base">Write food intake diary in natural language</h3>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md">
                      AI Powered Analyzer
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter the items you consumed today in chat style. You can write in English or use common transliterated Bangla terms (e.g., "I ate raw Peyara, Moshur Dal, Laal Bhaat, Aloo Bhaji, and Rui Fish Curry").
                  </p>

                  <form onSubmit={handleAnalyzeFoodIntake} className="space-y-3">
                    <textarea
                      value={foodTextInput}
                      onChange={(e) => setFoodTextInput(e.target.value)}
                      placeholder="e.g. For breakfast I ate paratha with a fried egg and a cup of sweet tea. For dinner, I ate white rice with beef curry and roasted lentils."
                      rows={3}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium placeholder-slate-400"
                    />

                    {analysisError && (
                      <div className="text-xs bg-red-50 border border-red-100 text-red-600 rounded-lg p-3">
                        {analysisError}
                      </div>
                    )}

                    <div className="flex justify-end space-x-2.5">
                      <button
                        type="button"
                        onClick={() => setFoodTextInput("I had dry tea with 2 puffed rice cookies in morning, thin lentil daal, 1 plate of brown rice and standard size silver carp fish with spinach for lunch.")}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold hover:underline py-2 px-2.5 cursor-pointer"
                      >
                        Try different text demo
                      </button>
                      
                      <button
                        type="submit"
                        disabled={isAnalyzingFood || !foodTextInput.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow flex items-center space-x-2 cursor-pointer"
                      >
                        {isAnalyzingFood ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Analyzing and calculating metrics...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Analyze Food Intake</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Detected Foods from API Result Box */}
                  {detectedResult && (
                    <div className="mt-4 bg-slate-50 rounded-xl border border-dashed border-emerald-300 p-5 space-y-4 animate-fade-in">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            AI Nutritional Breakdown Findings
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Please review estimated macros of foods matched by the AI before adding to daily plate tracking logs.</p>
                        </div>
                        <button
                          onClick={() => setDetectedResult(null)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {detectedResult.detectedItems.map((item, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-150 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-xs text-slate-800 pragmatist-label">{item.name}</span>
                              <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-semibold">{item.portion}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-500 font-medium mt-3 border-t border-slate-50 pt-2">
                              <div>
                                <span className="block text-[8px] text-slate-400 uppercase">Cal</span>
                                <span className="font-bold text-slate-700">{Math.round(item.calories)} kcal</span>
                              </div>
                              <div>
                                <span className="block text-[8px] text-slate-400 uppercase">Carb</span>
                                <span className="font-bold text-slate-700">{Math.round(item.carbs)}g</span>
                              </div>
                              <div>
                                <span className="block text-[8px] text-slate-400 uppercase">Pro</span>
                                <span className="font-bold text-slate-700">{Math.round(item.protein)}g</span>
                              </div>
                              <div>
                                <span className="block text-[8px] text-slate-400 uppercase">Fat</span>
                                <span className="font-bold text-slate-700">{Math.round(item.fat)}g</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-400 mt-2 pt-1 border-t border-slate-50">
                              <span>Sodium: {Math.round(item.sodium)}mg</span>
                              <span>Sugar: {Math.round(item.sugar)}g</span>
                              <span className="text-violet-700 font-bold">Iron: {item.iron}mg</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 italic">
                        <strong>AI Clinical Note: </strong> {detectedResult.overallComments}
                      </p>

                      <button
                        onClick={handleAddAllToLog}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Confirm and Add Detected Items to Daily Tracker Plate</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Dashboard: Daily Nutrition Balance Sheet against calculated thresholds */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Scale className="w-5 h-5 text-emerald-600" />
                        My Daily Plate Tracking &amp; Macro Balance
                      </h3>
                      <p className="text-xs text-slate-500">Compare calculated nutrient aggregates consumed to your personalized RDA thresholds.</p>
                    </div>

                    {dailyFoodLog.length > 0 && (
                      <button
                        onClick={handleClearAllLogs}
                        className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Today's Plate Log</span>
                      </button>
                    )}
                  </div>

                  {dailyFoodLog.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-3">
                      <Apple className="w-9 h-9 text-slate-300 mx-auto" />
                      <p className="text-sm text-slate-500 font-medium">Your diet plate is currently empty for today.</p>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">Use the AI analysis diary above, or add common traditional Bangladeshi food presets from the quick selection shelf below!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Interactive Visual Meters block */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        
                        {/* Calories ring indicator using custom beautiful animated SVG */}
                        <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Calories Intake</span>
                          
                          <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="48" cy="48" r="38" strokeWidth="6" stroke="#e2e8f0" fill="transparent" />
                              <circle 
                                cx="48" 
                                cy="48" 
                                r="38" 
                                strokeWidth="6.5" 
                                stroke={currentTotals.calories > limitCalories ? "#ef4444" : "#10b981"} 
                                fill="transparent" 
                                strokeDasharray={2 * Math.PI * 38}
                                strokeDashoffset={2 * Math.PI * 38 * (1 - Math.min(1, currentTotals.calories / limitCalories))}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                              />
                            </svg>
                            <div className="absolute text-center">
                              <span className="block text-base font-black text-slate-800 leading-none">{Math.round(currentTotals.calories)}</span>
                              <span className="text-[9px] text-slate-400">of {limitCalories}</span>
                            </div>
                          </div>

                          <span className="text-[10px] text-slate-500 font-medium mt-2">
                            {currentTotals.calories > limitCalories ? (
                              <span className="text-red-600 font-bold">Surpassed Target ({Math.round(currentTotals.calories - limitCalories)} excess)</span>
                            ) : (
                              <span>{Math.round(limitCalories - currentTotals.calories)} kcal remaining</span>
                            )}
                          </span>
                        </div>

                        {/* Carb vs Limit */}
                        <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 flex flex-col justify-between space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Carb balance</span>
                            <span className="text-xs font-bold text-slate-800">{Math.round(currentTotals.carbs)}g / {targetCarbs}g limit</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="w-full bg-slate-250 h-3.5 rounded-full overflow-hidden relative">
                              <div 
                                className={`h-full transition-all duration-500 ${currentTotals.carbs > targetCarbs ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (currentTotals.carbs / targetCarbs) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">0g</span>
                              <span className="text-slate-400">{Math.round((currentTotals.carbs / targetCarbs) * 100)}% Consumed</span>
                              <span className="text-slate-400">Max limit</span>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-500 italic leading-tight">
                            {hasDiabetes ? "🎯 Strictly restricted to safeguard pancreatic blood insulin spike ranges." : "Standard carbs threshold."}
                          </p>
                        </div>

                        {/* Sodium and Micronutrients panel */}
                        <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 flex flex-col justify-between space-y-3">
                          <div className="flex justify-between items-center animate-fade-in">
                            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Sodium &amp; Sugar</span>
                            <span className="text-[10px] text-slate-500 font-semibold">Targets Check</span>
                          </div>

                          <div className="space-y-2 text-[11px]">
                            {/* Sodium bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Sodium (Salt):</span>
                                <span className={currentTotals.sodium > limitSodium ? "text-red-600 font-bold" : "text-slate-800 font-bold"}>
                                  {Math.round(currentTotals.sodium)}mg / {limitSodium}mg
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${currentTotals.sodium > limitSodium ? 'bg-red-500' : 'bg-amber-500'}`}
                                  style={{ width: `${Math.min(100, (currentTotals.sodium / limitSodium) * 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Sugar bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Added Sugars:</span>
                                <span className={currentTotals.sugar > limitSugar ? "text-red-500 font-bold" : "text-slate-800 font-bold"}>
                                  {Math.round(currentTotals.sugar)}g / {limitSugar}g
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${currentTotals.sugar > limitSugar ? 'bg-red-500' : 'bg-red-400'}`}
                                  style={{ width: `${Math.min(100, (currentTotals.sugar / limitSugar) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <span className="text-[9px] text-slate-400 block leading-none">High sodium drives arterial damage. Lower tableside salt (Kacha Lobon).</span>
                        </div>
                      </div>

                      {/* Secondary Quick Micro status elements */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500">Protein:</span>
                          <span className="font-bold text-xs text-emerald-700">{Math.round(currentTotals.protein)}g <span className="text-[10px] text-slate-400">/ {targetProtein}g</span></span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500">Fats total:</span>
                          <span className="font-bold text-xs text-amber-700">{Math.round(currentTotals.fat)}g <span className="text-[10px] text-slate-400">/ {targetFat}g</span></span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between col-span-2 sm:col-span-1">
                          <span className="text-xs text-slate-500 font-bold text-violet-900">Iron (Fe):</span>
                          <span className="font-bold text-xs text-violet-700">{currentTotals.iron}mg <span className="text-[10px] text-slate-400">/ {targetIron}mg</span></span>
                        </div>
                      </div>

                      {/* Concrete Food Log Grid with precise deletion action */}
                      <div className="space-y-2">
                        <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1">Plate Items Logged Today</span>
                        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
                          {dailyFoodLog.map((food) => (
                            <div key={food.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-all text-xs">
                              <div className="space-y-1">
                                <div className="font-bold text-slate-800">{food.name}</div>
                                <div className="text-[10px] text-slate-400">Serving size: {food.portion}</div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="grid grid-cols-4 gap-2 text-right text-[10px] font-medium text-slate-500">
                                  <div>
                                    <span className="block text-[8px] text-slate-400">KCAL</span>
                                    <span className="text-slate-800 font-semibold">{food.calories}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[8px] text-slate-400">CARB</span>
                                    <span>{food.carbs}g</span>
                                  </div>
                                  <div>
                                    <span className="block text-[8px] text-slate-400">PRO</span>
                                    <span>{food.protein}g</span>
                                  </div>
                                  <div className="text-violet-700">
                                    <span className="block text-[8px] text-slate-400">IRON</span>
                                    <span className="font-semibold">{food.iron || 0}mg</span>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => handleRemoveLogItem(food.id)}
                                  className="p-1 px-1.5 rounded bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                                  title="Remove from plate log"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Local Food Presets Quick Shelf panel - Excellent for simple quick testing! */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Quick selection shelf: Bangladesh Local Foods
                    </h3>
                    <p className="text-xs text-slate-500">Click any traditional food matching your meal to instantly add it to your tracking logs. No manual input required.</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {PRESET_LOCAL_FOODS.map((food, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddQuickPreset(food)}
                        className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-150 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all text-left cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <div>
                          <span>{food.name}</span>
                          <span className="text-[9px] text-slate-400 font-medium block">{food.portion} ({food.calories} kcal)</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: AI CLINICAL RISK ASSESSMENT */}
            {activeTab === 'risks' && (
              <div className="space-y-6 animate-fade-in" id="risks-pane">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                  
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">AI Preventive Health Risk Factor Warning Engine</h3>
                        <p className="text-xs text-slate-500">Reviews demographics, focuses, and food intake records against regional epidemiologic statistics.</p>
                      </div>
                    </div>

                    <button
                      onClick={triggerPreventiveRiskAssessment}
                      disabled={isGeneratingRisks}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      {isGeneratingRisks ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Computing...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-calculate Risks</span>
                        </>
                      )}
                    </button>
                  </div>

                  {riskError && (
                    <div className="text-xs bg-red-50 border border-red-100 text-red-600 rounded-lg p-3">
                      {riskError}
                    </div>
                  )}

                  {!riskAssessment && !isGeneratingRisks ? (
                    <div className="text-center py-10 space-y-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <AlertTriangle className="w-9 h-9 text-slate-400 mx-auto" id="alert-no-risk" />
                      <p className="text-sm text-slate-600 font-bold">No Risk Warnings Calculated Yet.</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">Generate recommendations or click "Re-calculate Risks" to launch clinical-prevention algorithms tailored to Bangladesh.</p>
                      <button
                        onClick={triggerPreventiveRiskAssessment}
                        className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Run Assessment Now
                      </button>
                    </div>
                  ) : isGeneratingRisks ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                      <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                      <p className="text-sm font-bold text-slate-700">Running AI Preventative Risk Classifiers...</p>
                      <p className="text-xs text-slate-400 text-center max-w-sm">Comparing local diet plate records against indices for high sodium, diabetes hazards, and iron deficiency parameters in women.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Overall Clinicians Summary Statement */}
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 space-y-2">
                        <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest block">Executive Summary</span>
                        <p className="text-sm text-indigo-900 leading-relaxed font-medium">
                          {riskAssessment.overallSummary}
                        </p>
                      </div>

                      {/* Health Risk Alerts list items */}
                      <div className="space-y-4">
                        <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest pl-1">Identified Potential Risk Warnings</span>
                        
                        {riskAssessment.alerts.map((alert, idx) => {
                          const isHigh = alert.severity === 'high';
                          const isMed = alert.severity === 'medium';
                          
                          let badgeBg = "bg-blue-50 text-blue-800 border-blue-150";
                          if (isHigh) badgeBg = "bg-red-50 text-red-800 border-red-150";
                          if (isMed) badgeBg = "bg-amber-50 text-amber-800 border-amber-150";

                          return (
                            <div key={idx} className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden text-xs transition-all hover:shadow">
                              <div className="p-4 flex items-start justify-between gap-3 bg-slate-50/45 border-b border-slate-100">
                                <div className="space-y-1">
                                  <h4 className="font-extrabold text-sm text-slate-800">{alert.title}</h4>
                                  <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold border capitalize ${badgeBg}`}>
                                    Severity Level: {alert.severity}
                                  </span>
                                </div>
                                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${isHigh ? 'text-red-500' : isMed ? 'text-amber-500' : 'text-blue-500'}`} id={`risk-alert-icon-${idx}`} />
                              </div>

                              <div className="p-4 space-y-3.5">
                                <p className="text-slate-600 leading-relaxed">
                                  {alert.explanation}
                                </p>

                                {/* Actionable preventive hacks */}
                                <div className="space-y-2 pt-2 border-t border-slate-50">
                                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Localized Preventative Habits Tips:</span>
                                  <ul className="space-y-1.5 pl-4 list-disc text-slate-700 leading-relaxed font-medium">
                                    {alert.actionableSteps.map((step, sIdx) => (
                                      <li key={sIdx}>{step}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Sticky medical diagnostic warnings */}
                      <div className="bg-red-50/30 border border-red-200/55 rounded-xl p-4 text-[11px] text-red-950/90 leading-relaxed space-y-1">
                        <span className="font-extrabold text-red-800 block uppercase tracking-wider">🚨 Safe Usage &amp; Accountability Protocol</span>
                        <p>{riskAssessment.disclaimer}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 3: PERSONALIZED DAILY MEAL PLANNER & SHOPPING bazar CHECKLIST */}
            {activeTab === 'meals' && (
              <div className="space-y-6 animate-fade-in" id="meals-pane">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 bg-violet-50 text-violet-700 rounded-xl">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">One-Day Budget-Conscious Dietary Planner</h3>
                        <p className="text-xs text-slate-500">Generates custom meals using easily accessible ingredients from local Bangladesh markets.</p>
                      </div>
                    </div>

                    <button
                      onClick={triggerMealRecommendations}
                      disabled={isGeneratingMealPlan}
                      className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      {isGeneratingMealPlan ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Planning...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-generate Meal Diet</span>
                        </>
                      )}
                    </button>
                  </div>

                  {mealError && (
                    <div className="text-xs bg-red-50 border border-red-100 text-red-600 rounded-lg p-3">
                      {mealError}
                    </div>
                  )}

                  {!mealPlan && !isGeneratingMealPlan ? (
                    <div className="text-center py-10 space-y-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <ShoppingBag className="w-9 h-9 text-slate-400 mx-auto" />
                      <p className="text-sm text-slate-600 font-bold">No Meal Suggestion Generated Yet.</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">Input your health conditions and select BDT budget choices, then click "Re-generate Meal Diet".</p>
                      <button
                        onClick={triggerMealRecommendations}
                        className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Generate Meal Recommendations
                      </button>
                    </div>
                  ) : isGeneratingMealPlan ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                      <RefreshCw className="w-10 h-10 text-violet-600 animate-spin" />
                      <p className="text-sm font-bold text-slate-700">Drafting personalized cooking schedules...</p>
                      <p className="text-xs text-slate-400 text-center max-w-sm">Mapping local market items fitting BDT criteria for Bangladesh families with safe, fast cooking limits.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Overall Dietary Advice banner statement */}
                      <div className="bg-violet-50/70 border border-violet-100 rounded-2xl p-5 text-slate-800 text-xs leading-relaxed space-y-1">
                        <span className="text-[10px] font-bold text-violet-800 uppercase tracking-widest block">Dietary &amp; Hydration Strategy</span>
                        <p className="font-semibold text-violet-950">{mealPlan.dietaryAdvice}</p>
                      </div>

                      {/* Meal recommendations bento block map */}
                      <div className="space-y-4">
                        <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest pl-1">1-Day Eating Plan Checklist</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {mealPlan.dailyMealRecommendations.map((rec, idx) => {
                            let typeBg = "bg-amber-50 text-amber-900 border-amber-100";
                            if (rec.mealType === 'lunch') typeBg = "bg-sky-50 text-sky-900 border-sky-101";
                            if (rec.mealType === 'snack') typeBg = "bg-emerald-50 text-emerald-900 border-emerald-110";
                            if (rec.mealType === 'dinner') typeBg = "bg-indigo-50 text-indigo-900 border-indigo-110";

                            return (
                              <div key={idx} className="bg-white rounded-xl border border-slate-150 p-4 space-y-3 hover:shadow-sm transition-all flex flex-col justify-between">
                                <div className="space-y-2">
                                  {/* Meal type header banner */}
                                  <div className="flex justify-between items-center">
                                    <span className={`text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full border ${typeBg}`}>
                                      {rec.mealType}
                                    </span>
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                                      {rec.estimatedCost}
                                    </span>
                                  </div>

                                  <div className="space-y-0.5">
                                    <h4 className="font-extrabold text-sm text-slate-800">{rec.title}</h4>
                                    {rec.banglaName && (
                                      <span className="block text-xs font-bold text-emerald-800 font-bengali leading-none">{rec.banglaName}</span>
                                    )}
                                  </div>

                                  {/* Metrics parameters list */}
                                  <div className="grid grid-cols-4 gap-1 text-[10px] py-1 px-2.5 bg-slate-50 border border-slate-100 rounded-lg text-center font-bold text-slate-600">
                                    <div>
                                      <span className="block text-[8px] text-slate-400 font-medium">CAL</span>
                                      <span>{rec.calories}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[8px] text-slate-400 font-medium">CARBS</span>
                                      <span>{rec.carbs}g</span>
                                    </div>
                                    <div>
                                      <span className="block text-[8px] text-slate-400 font-medium">PRO</span>
                                      <span>{rec.protein}g</span>
                                    </div>
                                    <div>
                                      <span className="block text-[8px] text-slate-400 font-medium">FAT</span>
                                      <span>{rec.fat}g</span>
                                    </div>
                                  </div>

                                  {/* Ingredients list block */}
                                  <div className="space-y-1 text-xs">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Ingredients list:</span>
                                    <ul className="list-inside list-disc space-y-0.5 text-slate-600 pl-1 font-semibold leading-relaxed">
                                      {rec.ingredients.map((ing, iIdx) => (
                                        <li key={iIdx} className="truncate" title={ing}>{ing}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                {/* Cooking hints */}
                                <div className="space-y-1 text-xs pt-3 mt-3 border-t border-slate-50">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Aesthetic Preparation:</span>
                                  <ul className="space-y-1 text-slate-500 italic leading-snug">
                                    {rec.preparations.map((prep, pIdx) => (
                                      <li key={pIdx} className="pl-1.5 border-l-2 border-emerald-500">{prep}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bazar Shopping list block */}
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-3.5">
                        <div className="flex items-center space-x-2">
                          <ShoppingBag className="w-4.5 h-4.5 text-indigo-700" />
                          <h4 className="font-extrabold text-sm text-slate-800">Fresh Kacha Bazar Grocery shopping list:</h4>
                        </div>
                        <p className="text-[11px] text-slate-500">Pick these up at your local neighborhood shop or wet market in Bangladesh to quickly prep your meals.</p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {mealPlan.groceryShoppingList.map((item, idx) => (
                            <div key={idx} className="bg-white px-3 py-2 border border-slate-100 rounded-lg flex items-center space-x-2 text-xs font-semibold">
                              <input type="checkbox" className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 pointer-events-auto cursor-pointer" id={`shop-${idx}`} />
                              <label htmlFor={`shop-${idx}`} className="truncate text-slate-700 select-none cursor-pointer">{item}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 4: HEALTHIER FOOD SUBSTITUTIONS ("FOOD SWAPPING") */}
            {activeTab === 'alternatives' && (
              <div className="space-y-6 animate-fade-in" id="alternatives-pane">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                        <UtensilsCrossed className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">Smart Healthy Swaps &amp; Street-Food Hacking</h3>
                        <p className="text-xs text-slate-500">Exchange oily starches and sugar traps with cheap local superfoods of equivalent BDT value.</p>
                      </div>
                    </div>

                    {/* Fast custom search bar */}
                    <form onSubmit={handleSearchAlternative} className="flex space-x-2 w-full sm:w-auto">
                      <input
                        type="text"
                        value={alternativeSearch}
                        onChange={(e) => setAlternativeSearch(e.target.value)}
                        placeholder="e.g. Beguni, Porota, Biryani, Rosgulla"
                        className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-400 w-full sm:w-48"
                      />
                      <button
                        type="submit"
                        disabled={isGeneratingAlternatives}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Search</span>
                      </button>
                    </form>
                  </div>

                  {alternativeError && (
                    <div className="text-xs bg-red-50 border border-red-101 text-red-600 p-3 rounded-lg">
                      {alternativeError}
                    </div>
                  )}

                  {isGeneratingAlternatives ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
                      <p className="text-xs font-bold text-slate-600">Cross-referencing glycemic indices of Bangladesh snacks...</p>
                    </div>
                  ) : alternativesList.length === 0 ? (
                    <div className="text-center py-10 space-y-2 bg-slate-50 rounded-xl border border-slate-100">
                      <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" id="help-icon" />
                      <p className="text-sm font-bold text-slate-600">No alternatives matches your custom search criteria.</p>
                      <button
                        onClick={() => {
                          setAlternativeSearch("");
                          fetchAlternatives();
                        }}
                        className="text-xs text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Reset and show all default swaps
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Selected Substitution Alternatives Panel</span>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {alternativesList.map((item, idx) => {
                          const calPreserved = (item.nutritionComparison.unhealthyCalories - item.nutritionComparison.healthyCalories);

                          return (
                            <div key={idx} className="bg-white rounded-xl border border-slate-150 overflow-hidden shadow-sm hover:shadow-md transition-all text-xs">
                              
                              <div className="grid grid-cols-1 md:grid-cols-12 select-none border-b border-slate-100 bg-slate-50/50">
                                
                                {/* Unhealthy Side */}
                                <div className="md:col-span-5 p-4 space-y-1.5 border-r border-slate-100">
                                  <span className="text-[9px] uppercase font-bold text-red-600 tracking-wider">Traditional Unhealthy Choice:</span>
                                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1">
                                    <span>🚫 {item.unhealthyFood}</span>
                                  </h4>
                                  <span className="inline-block text-[10px] text-red-700 bg-red-50/50 px-2.5 py-0.5 rounded-full font-bold">
                                    {item.nutritionComparison.unhealthyCalories} Calories per serving
                                  </span>
                                  {item.nutritionComparison.unhealthyBenefits && (
                                    <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">{item.nutritionComparison.unhealthyBenefits}</p>
                                  )}
                                </div>

                                {/* Comparison separator badge */}
                                <div className="md:col-span-2 p-3 flex flex-row md:flex-col items-center justify-center bg-amber-50/30 text-amber-800 text-center border-y md:border-y-0 md:border-r border-slate-100 gap-1">
                                  <TrendingUp className="w-4 h-4 text-emerald-600 rotate-90" id={`trend-icon-${idx}`} />
                                  <span className="text-[10px] font-black uppercase text-emerald-700 leading-tight">Saves:</span>
                                  <span className="text-xs font-black text-emerald-600">{calPreserved} Cal</span>
                                </div>

                                {/* Healthy Swap Side */}
                                <div className="md:col-span-5 p-4 space-y-1.5">
                                  <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">Recommended Smart Swap:</span>
                                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center justify-between">
                                    <span>✅ {item.healthierAlternative}</span>
                                    {item.banglaAlternativeName && (
                                      <span className="text-xs font-bold text-emerald-800 font-bengali">{item.banglaAlternativeName}</span>
                                    )}
                                  </h4>
                                  <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                                    {item.nutritionComparison.healthyCalories} Calories per serving
                                  </span>
                                  {item.nutritionComparison.healthyBenefits && (
                                    <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">{item.nutritionComparison.healthyBenefits}</p>
                                  )}
                                </div>

                              </div>

                              <div className="p-4 space-y-2">
                                <p className="text-slate-600 leading-relaxed font-medium">
                                  <strong>Why it makes an impact:</strong> {item.whyBetter}
                                </p>

                                <div className="flex flex-col sm:flex-row justify-between pt-2.5 border-t border-slate-50 text-[11px] text-slate-500 gap-2">
                                  <div className="flex items-center space-x-1.5 font-semibold text-emerald-800 bg-emerald-50/50 px-2.5 py-1 rounded-lg">
                                    <span>💲 Cost Analysis:</span>
                                    <span>{item.approximatePriceDiff}</span>
                                  </div>

                                  <div className="flex items-center space-x-1.5 text-slate-600">
                                    <span>🏪 Availability:</span>
                                    <span className="font-bold">{item.localAffordability}</span>
                                  </div>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Healthy local tips summary box */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-900 leading-relaxed flex items-start space-x-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" id="alternative-alert-icon" />
                    <div>
                      <strong className="block text-amber-950 font-bold mb-0.5">💡 Traditional Cooking oil replacement advisory:</strong>
                      In Bangladesh, commercial street snacks are often deep fried in cheaper, highly high-heat refined soybean oil (often re-boiled multiple times, accumulating highly dangerous cardiovascular toxic aldehydes). Whenever preparing snacks at home, substitute with expeller-pressed mustard oil (Shorishar Tel) or spray cook oils to protect target blood vessel wellness.
                    </div>
                  </div>

                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Trust footer context */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-850 mt-12 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-3.5">
          <p className="text-[11px] text-slate-400 font-semibold tracking-wide flex items-center justify-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-emerald-500" />
            <span>NutriBD AI — Clinically Modeled Nutrition Prevention Hackathon Assistant for Bangladesh</span>
          </p>
          <p className="max-w-2xl mx-auto text-[10px] text-slate-500 leading-relaxed">
            Models configured based on South-Asian BMI classification guidelines (overweight ranges established starting at 23.0 BMI value limits). Developed utilizing Google Gemini AI API core token vectors to deliver fast, explainable preventative dietary meal recommendations, budget mapping indices, and interactive street food substitution metrics.
          </p>
          <div className="text-[9px] text-slate-600 pt-2.5 border-t border-slate-800">
            &copy; 2026 NutriBD Project Team. All rights to datasets and frameworks reserved under Apache Licences.
          </div>
        </div>
      </footer>
    </div>
  );
}
