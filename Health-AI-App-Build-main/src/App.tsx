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

// Production API URL Mapping. 
// If your Flask/Python server is running as a separate Web Service on Render, replace the text below 
// with your true backend URL (e.g., 'https://nutribd-backend.onrender.com').
// If both your frontend and backend run together, keeping a relative path or your true domain is required.
const BACKEND_API_BASE = import.meta.env.PROD 
  ? 'https://nutribd-1.onrender.com' 
  : ''; 

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

  const [foodTextInput, setFoodTextInput] = useState<string>(
    "I had one oil fried paratha with potato bhaji and roadside sweetened milk tea for breakfast, a plate of white rice with lens dal and rui fish curry for lunch."
  );
  const [isAnalyzingFood, setIsAnalyzingFood] = useState<boolean>(false);
  const [detectedResult, setDetectedResult] = useState<FoodAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [dailyFoodLog, setDailyFoodLog] = useState<FoodItem[]>([
    { id: "log-1", name: "Oil Fried Paratha", portion: "1 piece (60g)", calories: 260, carbs: 36, protein: 4.5, fat: 11.2, sodium: 180, sugar: 0.5, iron: 1.1 },
    { id: "log-2", name: "Aloo Bhaji", portion: "1 cup (150g)", calories: 180, carbs: 22, protein: 3.1, fat: 9.5, sodium: 320, sugar: 1.2, iron: 0.9 },
    { id: "log-3", name: "Roadside Sweetened Tea", portion: "1 cup", calories: 85, carbs: 14, protein: 2.1, fat: 1.8, sodium: 25, sugar: 12, iron: 0.1 }
  ]);

  const [isGeneratingRisks, setIsGeneratingRisks] = useState<boolean>(false);
  const [riskAssessment, setRiskAssessment] = useState<HealthRiskAssessment | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);

  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState<boolean>(false);
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [mealError, setMealError] = useState<string | null>(null);

  const [isGeneratingAlternatives, setIsGeneratingAlternatives] = useState<boolean>(false);
  const [alternativesList, setAlternativesList] = useState<FoodAlternative[]>([]);
  const [alternativeSearch, setAlternativeSearch] = useState<string>("");
  const [alternativeError, setAlternativeError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'tracker' | 'risks' | 'meals' | 'alternatives'>('tracker');
  const [apiActive, setApiActive] = useState<boolean>(false);

  const weightKg = profile.weight;
  const heightM = profile.height / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

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

  const hasDiabetes = profile.healthConditions.includes('diabetes');
  const hasHypertension = profile.healthConditions.includes('hypertension');
  const hasAnemia = profile.healthConditions.includes('anemia') || profile.gender === 'female';

  const limitCalories = tdee;
  const targetCarbs = hasDiabetes ? Math.round((tdee * 0.45) / 4) : Math.round((tdee * 0.55) / 4);
  const targetProtein = Math.round(profile.weight * 1.2); 
  const targetFat = Math.round((tdee * 0.25) / 9);
  const limitSodium = hasHypertension ? 1500 : 2200; 
  const limitSugar = hasDiabetes ? 20 : 35; 
  const targetIron = hasAnemia ? 18 : 8; 

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

  // Test API Availability on mount
  useEffect(() => {
    fetch(`${BACKEND_API_BASE}/api/health`)
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
      const response = await fetch(`${BACKEND_API_BASE}/api/analyze-food`, {
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

  const handleAddQuickPreset = (food: Omit<FoodItem, 'id'>) => {
    const fresh: FoodItem = {
      ...food,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setDailyFoodLog(prev => [...prev, fresh]);
  };

  const handleRemoveLogItem = (id: string) => {
    setDailyFoodLog(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAllLogs = () => {
    if (confirm("Are you sure you want to clear your daily food track list?")) {
      setDailyFoodLog([]);
    }
  };

  // TRIGGER 1: AI Preventive Risks Management
  const triggerPreventiveRiskAssessment = async () => {
    setIsGeneratingRisks(true);
    setRiskError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/calculate-risks`, {
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

      const data = await response.json();
      
      // If the response data contains a string wrapped in Markdown block ticks, sanitize it safely:
      let finalData = data;
      if (typeof data === 'string') {
        const cleanJsonText = data.replace(/```json/g, '').replace(/```/g, '').trim();
        finalData = JSON.parse(cleanJsonText);
      } else if (data && typeof data.result === 'string') {
        const cleanJsonText = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
        finalData = JSON.parse(cleanJsonText);
      }

      setRiskAssessment(finalData);
      setActiveTab('risks');
    } catch (err: any) {
      console.error(err);
      setRiskError(err.message || "Risk engine failed to resolve database analytics.");
    } finally {
      setIsGeneratingRisks(false);
    }
  };

  // TRIGGER 2: Personalized Meal Recommendations & budget checklist
  const triggerMealRecommendations = async () => {
    setIsGeneratingMealPlan(true);
    setMealError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/meal-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });

      if (!response.ok) {
        throw new Error("Failed generating affordable meal recipes for Bangladesh climate.");
      }

      const data = await response.json();
      
      let finalData = data;
      if (typeof data === 'string') {
        const cleanJsonText = data.replace(/```json/g, '').replace(/```/g, '').trim();
        finalData = JSON.parse(cleanJsonText);
      } else if (data && typeof data.result === 'string') {
        const cleanJsonText = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
        finalData = JSON.parse(cleanJsonText);
      }

      setMealPlan(finalData);
      setActiveTab('meals');
    } catch (err: any) {
      console.error(err);
      setMealError(err.message || "High complexity in server nutrition calculation pathways.");
    } finally {
      setIsGeneratingMealPlan(false);
    }
  };

  // TRIGGER 3: Fetch food alternatives
  const fetchAlternatives = async (query: string = "") => {
    setIsGeneratingAlternatives(true);
    setAlternativeError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/healthy-alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customQuery: query })
      });

      if (!response.ok) {
        throw new Error("Alternative food indexing algorithm could not resolve search.");
      }

      const data = await response.json();
      
      let finalData = data;
      if (typeof data === 'string') {
        const cleanJsonText = data.replace(/```json/g, '').replace(/```/g, '').trim();
        finalData = JSON.parse(cleanJsonText);
      } else if (data && typeof data.result === 'string') {
        const cleanJsonText = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
        finalData = JSON.parse(cleanJsonText);
      }

      setAlternativesList(finalData.alternatives || finalData || []);
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
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-inner border border-emerald-500">
              <HeartPulse className="w-6.5 h-6.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-1.5 text-emerald-100">
                  NutriBD <span className="text-emerald-400">AI</span>
                </h1>
                <span className="text-[10px] bg-emerald-850 border border-emerald-700 px-2 py-0.5 rounded-full text-emerald-300 font-semibold tracking-wide">
                  PRODUCTION RELEASE
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
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Disclaimer:</strong> This is a nutritional preventive awareness assistant. It is **NOT** a clinical diagnostic system. It provides helpful dietary plans using affordable Bangladeshi ingredients and alerts regarding nutritional risks.
          </span>
        </div>
      </section>

      {/* Main Body Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <section className="lg:col-span-4 space-y-6">
            <HealthProfileForm
              profile={profile}
              onChange={(next) => setProfile(next)}
              isLoading={isGeneratingMealPlan || isGeneratingRisks}
              onGenerateRecommendations={() => {
                triggerMealRecommendations();
                triggerPreventiveRiskAssessment();
              }}
            />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Scale className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Calculated South Asian RDA</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Body Mass Index (BMI)</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${bmiColor}`}>
                    {bmi} - {bmiCategory}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-yellow-400 h-full" style={{ width: '18%' }} />
                  <div className="bg-emerald-500 h-full" style={{ width: '22%' }} />
                  <div className="bg-orange-400 h-full" style={{ width: '22%' }} />
                  <div className="bg-red-500 h-full" style={{ width: '38%' }} />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed italic pt-1">{bmiAdvice}</p>
              </div>

              <div className="space-y-3.5 pt-2 border-t border-slate-50">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-700">Daily Calorie Target (TDEE)</span>
                    <span className="text-sm font-black text-emerald-600">{limitCalories.toLocaleString()} kcal</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <span className="block text-[11px] font-bold text-slate-600 tracking-wider uppercase mb-1.5">Daily Macronutrient Targets</span>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Carbohydrates Target:</span>
                    <span className="font-semibold text-slate-800">{targetCarbs}g {hasDiabetes ? "(Restricted)" : ""}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Protein Target:</span>
                    <span className="font-semibold text-slate-800">{targetProtein}g</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Healthy Fat Target:</span>
                    <span className="font-semibold text-slate-800">{targetFat}g</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Sodium Limit:</span>
                    <span className="font-bold text-amber-700">{limitSodium} mg</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Free-Sugars Max Limit:</span>
                    <span className="font-bold text-red-600">{limitSugar} g</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Iron Focus Intake:</span>
                    <span className="font-bold text-violet-700">{targetIron} mg</span>
                  </div>
                </div>
              </div>

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

          <section className="lg:col-span-8 space-y-6">
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('tracker')}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'tracker' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Apple className="w-4 h-4" />
                <span>Intake Tracker</span>
              </button>

              <button
                onClick={() => setActiveTab('risks')}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'risks' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Risk Assessment</span>
              </button>

              <button
                onClick={() => setActiveTab('meals')}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'meals' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Meal Planner</span>
              </button>

              <button
                onClick={() => setActiveTab('alternatives')}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'alternatives' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Street Alternatives</span>
              </button>
            </div>

            {/* TAB PANELS RENDERING */}
            {activeTab === 'tracker' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <form onSubmit={handleAnalyzeFoodIntake} className="space-y-3">
                    <label className="block text-sm font-bold text-slate-800">Write food intake diary in natural language</label>
                    <textarea 
                      value={foodTextInput}
                      onChange={(e) => setFoodTextInput(e.target.value)}
                      className="w-full h-24 p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button type="submit" disabled={isAnalyzingFood} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">
                      {isAnalyzingFood ? "Analyzing..." : "Analyze Log Entries"}
                    </button>
                  </form>
                  {analysisError && <p className="text-red-500 text-xs">{analysisError}</p>}
                </div>
              </div>
            )}

            {activeTab === 'risks' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-base">AI Preventive Health Risk Factor Warning Engine</h3>
                {isGeneratingRisks && <p className="text-xs text-slate-500">Computing clinical patterns...</p>}
                {riskError && <p className="text-red-500 text-xs">{riskError}</p>}
                {riskAssessment && (
                  <div className="space-y-4">
                    <p className="text-xs bg-slate-50 p-3 rounded-lg border italic">{riskAssessment.overallSummary}</p>
                    {riskAssessment.alerts?.map((alert: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-xl bg-indigo-50/40 border-indigo-100">
                        <h4 className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-indigo-600" />
                          {alert.title} — <span className="uppercase text-[10px] tracking-wider">{alert.severity} Risk</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-1">{alert.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'meals' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-base">Personalized Meal Recommendations</h3>
                {isGeneratingMealPlan && <p className="text-xs text-slate-500">Generating localized diet matrices...</p>}
                {mealError && <p className="text-red-500 text-xs">{mealError}</p>}
                {mealPlan && (
                  <div className="space-y-4">
                    <p className="text-xs bg-emerald-50 text-emerald-900 p-3 rounded-lg border border-emerald-100 font-medium">{mealPlan.dietaryAdvice}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mealPlan.dailyMealRecommendations?.map((meal: any, idx: number) => (
                        <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{meal.mealType}</span>
                          <h4 className="font-bold text-xs text-slate-800">{meal.title} <span className="text-slate-400 font-normal">({meal.banglaName || ''})</span></h4>
                          <p className="text-[11px] text-slate-500">Cost Index: <span className="font-bold text-slate-700">{meal.estimatedCost}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'alternatives' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-base">Street Food Alternatives Map</h3>
                <form onSubmit={handleSearchAlternative} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Search street foods (e.g. Fuchka, Singara...)" 
                    value={alternativeSearch}
                    onChange={(e) => setAlternativeSearch(e.target.value)}
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-none"
                  />
                  <button type="submit" className="bg-amber-600 text-white font-bold text-xs px-3 rounded-lg cursor-pointer">Search</button>
                </form>
                {isGeneratingAlternatives && <p className="text-xs text-slate-500">Analyzing street items database...</p>}
                {alternativeError && <p className="text-red-500 text-xs">{alternativeError}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alternativesList?.map((item: any, idx: number) => (
                    <div key={idx} className="border border-amber-100 bg-amber-50/20 rounded-xl p-4 space-y-2">
                      <span className="text-red-600 font-bold text-xs line-through">{item.unhealthyFood}</span>
                      <p className="text-emerald-700 font-black text-xs">→ Swap with: {item.healthierAlternative} ({item.banglaAlternativeName || ''})</p>
                      <p className="text-[11px] text-slate-600 leading-relaxed italic"><strong>Why:</strong> {item.whyBetter}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 border-t mt-12 text-center text-xs">
        <p className="text-slate-400 font-semibold tracking-wide flex items-center justify-center gap-1.5">
          <HeartPulse className="w-4 h-4 text-emerald-500" />
          <span>NutriBD AI — Clinically Modeled Nutrition Prevention Hackathon Assistant</span>
        </p>
      </footer>
    </div>
  );
}
