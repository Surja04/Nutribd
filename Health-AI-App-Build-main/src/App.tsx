import React, { useState, useEffect } from 'react';
import { HealthProfile, FoodItem, FoodAnalysisResult, HealthRiskAssessment, MealPlanResponse, FoodAlternative } from './types';
import HealthProfileForm from './components/HealthProfileForm';
import DocsPage from './components/DocsPage';
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
  const [activeTab, setActiveTab] = useState<'tracker' | 'risks' | 'meals' | 'alternatives' | 'docs'>('tracker');

  // Server health test indicator
  const [apiActive, setApiActive] = useState<boolean>(false);

  const isProfileValid = profile.age >= 12 && profile.weight >= 30 && profile.height >= 100;

  // Fast calculation indices:
  const weightKg = profile.weight;
  const heightM = profile.height > 0 ? profile.height / 100 : 1;
  const bmi = profile.height > 0 && profile.weight > 0
    ? Number((weightKg / (heightM * heightM)).toFixed(1))
    : 0;

  // Determine BMI category using South Asian Specific thresholds 
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
  if (profile.age > 0 && profile.weight > 0 && profile.height > 0) {
    if (profile.gender === 'male') {
      BMR = 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * profile.age);
    } else {
      BMR = 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * profile.age);
    }
  }

  const multipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725
  };

  const tdee = Math.round(BMR * multipliers[profile.activityLevel]);

  // Adjust macronutrients thresholds for conditions:
  const hasDiabetes = profile.healthConditions.includes('diabetes');
  const hasHypertension = profile.healthConditions.includes('hypertension');
  const hasAnemia = profile.healthConditions.includes('anemia') || profile.gender === 'female';

  const limitCalories = tdee;
  const targetCarbs = tdee > 0 ? (hasDiabetes ? Math.round((tdee * 0.45) / 4) : Math.round((tdee * 0.55) / 4)) : 0;
  const targetProtein = profile.weight > 0 ? Math.round(profile.weight * 1.2) : 0; 
  const targetFat = tdee > 0 ? Math.round((tdee * 0.25) / 9) : 0;
  const limitSodium = hasHypertension ? 1500 : 2200; 
  const limitSugar = hasDiabetes ? 20 : 35; 
  const targetIron = hasAnemia ? 18 : 8; 

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

  // Test API Availability
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
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    }));
    setDailyFoodLog(prev => [...prev, ...itemsWithId]);
    setDetectedResult(null);
    setFoodTextInput("");
  };

  // Quick preset inserts
  const handleAddQuickPreset = (food: Omit<FoodItem, 'id'>) => {
    const fresh: FoodItem = {
      ...food,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
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

  // Trigger Personalized Meal Recommendations
  const triggerMealRecommendations = async () => {
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
                <span className="text-[10px] bg-emerald-900 border border-emerald-700 px-2 py-0.5 rounded-full text-emerald-300 font-semibold tracking-wide">
                  HACKATHON RELEASE
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/90 font-medium">
                Personalized Nutrition &amp; Preventive Health Risk Assistant for Bangladesh
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 border ${
              apiActive 
                ? 'bg-emerald-900/50 border-emerald-600/50 text-emerald-300' 
                : 'bg-amber-950/40 border-amber-700/50 text-amber-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${apiActive ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <span>{apiActive ? "Live Gemini AI Active" : "Local Data Core Active"}</span>
            </div>

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

      {/* Strict Prevention Disclaimer Banner */}
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
          
          {/* LEFT SIDE PANEL */}
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

            {/* Calculator Dashboard Card */}
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
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Carbohydrates Target:</span>
                      <span className="font-semibold text-slate-800">{targetCarbs}g {hasDiabetes ? "(Restricted - Diabetes)" : ""}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Protein Target:</span>
                      <span className="font-semibold text-slate-800">{targetProtein}g (Minimum 1.2g/kg)</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Healthy Fat Target:</span>
                      <span className="font-semibold text-slate-800">{targetFat}g</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Sodium Limit:</span>
                      <span className="font-bold text-amber-700">{limitSodium} mg {hasHypertension ? "(Restricted - Hypertension)" : ""}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Free-Sugars Max Limit:</span>
                      <span className="font-bold text-red-600">{limitSugar} g {hasDiabetes ? "(Strict limit)" : ""}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Iron Focus Intake:</span>
                      <span className="font-bold text-violet-700">{targetIron} mg {profile.gender === 'female' ? "(High Requirement)" : ""}</span>
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

          {/* RIGHT WORKSPACE SECTION */}
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
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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

              <button
                onClick={() => setActiveTab('docs')}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'docs'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Docs</span>
              </button>
            </div>

            {!isProfileValid && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
                <strong>⚠️ Incomplete Profile Boundaries Detected</strong>
                <p className="mt-2 text-xs text-amber-700">
                  Please enter a valid Age (12-120), Height (100-270 cm), and Weight (30-500 kg) above to calculate risk predictions and meal recommendations. The dashboard panels remain visible while you type.
                </p>
              </div>
            )}

            {/* TAB WORKSPACE MODULES */}
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
                    Enter the items you consumed today in chat style. You can write in English or use common transliterated Bangla terms (e.g., \"I ate raw Peyara, Moshur Dal, Laal Bhaat, Aloo Bhaji, and Rui Fish Curry\").
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

                  {/* Detected Foods Result Template Grid */}
                  {detectedResult && (
                    <div className="mt-4 bg-slate-50 rounded-xl border border-dashed border-emerald-300 p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            AI Nutritional Breakdown Findings
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Please review estimated macros before adding to plate trackers.</p>
                        </div>
                        <button
                          onClick={() => setDetectedResult(null)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {detectedResult.detectedItems?.map((item, idx) => (
                          <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center shadow-xs">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{item.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{item.portion} • {item.calories} kcal</p>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Detected</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleAddAllToLog}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          + Add All to Daily Log
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dashboard Active Food Plate Track List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Your Active Daily Plate Logs</h3>
                      <p className="text-xs text-slate-400">Total accumulated macronutrient consumption summary tracker</p>
                    </div>
                    {dailyFoodLog.length > 0 && (
                      <button
                        onClick={handleClearAllLogs}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear All
                      </button>
                    )}
                  </div>

                  {dailyFoodLog.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No foods logged yet for today. Use the text analyzer above or click on quick recommendation presets to begin tracking metrics!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Active items lists */}
                      <div className="divide-y divide-slate-100">
                        {dailyFoodLog.map((item) => (
                          <div key={item.id} className="py-2.5 flex items-center justify-between group">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{item.name}</p>
                              <p className="text-[11px] text-slate-400">{item.portion} — Cal: {item.calories} kcal | C: {item.carbs}g | P: {item.protein}g | F: {item.fat}g</p>
                            </div>
                            <button
                              onClick={() => handleRemoveLogItem(item.id)}
                              className="text-slate-300 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Cumulative progress tracking section */}
                      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Calories</p>
                          <p className="text-sm font-black text-slate-800">{currentTotals.calories} / <span className="text-slate-400 text-xs">{limitCalories} kcal</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Carbs</p>
                          <p className="text-sm font-black text-slate-800">{currentTotals.carbs}g / <span className="text-slate-400 text-xs">{targetCarbs}g</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Protein</p>
                          <p className="text-sm font-black text-slate-800">{currentTotals.protein}g / <span className="text-slate-400 text-xs">{targetProtein}g</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Fats</p>
                          <p className="text-sm font-black text-slate-800">{currentTotals.fat}g / <span className="text-slate-400 text-xs">{targetFat}g</span></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preset local food quick inserts array */}
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Quick Preset Street Food Additions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_LOCAL_FOODS.slice(0, 5).map((food, i) => (
                        <button
                          key={i}
                          onClick={() => handleAddQuickPreset(food)}
                          className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-600 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200/60 transition-all cursor-pointer"
                        >
                          + {food.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB INTERACTIVE EXTENSIONS FALLBACK BLOCKS */}
            {activeTab === 'risks' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-base">AI Preventive Health Assessment</h3>
                {riskAssessment ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl">
                      <p className="font-bold">Primary Risk Factor Alert:</p>
                      <p>{riskAssessment.primaryRiskWarning || "Elevated metabolic load indicator detected on current dietary logs."}</p>
                    </div>
                    <p className="font-medium text-slate-600 leading-relaxed">{riskAssessment.preventiveAdviceString}</p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Click "Generate AI Health Risks" on the left panel to execute an assessment.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'meals' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-base">Affordable Meal Recipes &amp; Recommendations</h3>
                {mealPlan ? (
                  <div className="space-y-3 text-xs">
                    <p className="font-bold text-emerald-800">Custom Daily Budget Menu Plan:</p>
                    <p className="leading-relaxed font-medium text-slate-600">{mealPlan.recommendedPlanDescription}</p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Click "Affordable Meal Recommendations" on the left panel to pull automated recipe guides.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'alternatives' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-base">Healthy Food Alternative Swapping Engine</h3>
                <form onSubmit={handleSearchAlternative} className="flex gap-2">
                  <input
                    type="text"
                    value={alternativeSearch}
                    onChange={(e) => setAlternativeSearch(e.target.value)}
                    placeholder="Search standard local food to swap (e.g., Paratha)"
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                  <button type="submit" className="bg-amber-600 text-white text-xs px-4 py-2 rounded-xl font-bold hover:bg-amber-700 transition-colors cursor-pointer">
                    Search Swaps
                  </button>
                </form>

                <div className="text-xs text-slate-500">
                  {alternativesList.length > 0 ? (
                    <div className="space-y-3">
                      {alternativesList.map((alt, id) => (
                        <div key={id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                          <p className="font-bold text-amber-900">{alt.unhealthyFood} ➔ {alt.healthierAlternative}</p>
                          <p className="mt-1 text-slate-600">{alt.whyBetter}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-slate-400">Type a food above or browse local parameters to match healthier adjustments.</p>
                  )}
                </div>
              </div>
            )}

          </section>
        </div>
      </main>
    </div>
  );
}
