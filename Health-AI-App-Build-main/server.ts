import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";

dotenv.config({ path: ".env.local" });
dotenv.config();
const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;
const LOCAL_LLM_MODEL = process.env.OLLAMA_MODEL || "gemma2:2b";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30000;
const USE_OLLAMA_FOR_RISKS = process.env.USE_OLLAMA_FOR_RISKS === "true";
const LOCAL_LLM_RISK_TIMEOUT_MS = Number(process.env.LOCAL_LLM_RISK_TIMEOUT_MS) || 8000;
const PYTHON_COMMAND = process.env.PYTHON_COMMAND || (process.platform === "win32" ? "python" : "python3");
const LOCAL_LLM_SCRIPT = path.join(process.cwd(), "nutribd_ai", "local_llm.py");
const HEALTH_TIP_PROMPT = "Give one practical health tip for people in Bangladesh. Focus on affordable local foods like dal, shak, and fish. Under 80 words. Be specific and culturally relevant.";
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || "";
const apiKeySource = process.env.GEMINI_API_KEY
  ? "GEMINI_API_KEY"
  : process.env.GOOGLE_API_KEY
    ? "GOOGLE_API_KEY"
    : process.env.API_KEY
      ? "API_KEY"
      : null;
type ModelMode = "gemini" | "ollama";
const MODEL_MODES = new Set<ModelMode>(["gemini", "ollama"]);
let modelMode: ModelMode = MODEL_MODES.has(process.env.MODEL_MODE as ModelMode)
  ? process.env.MODEL_MODE as ModelMode
  : apiKey
    ? "gemini"
    : "ollama";

function runLocalLlm(action: string, payload: Record<string, unknown> = {}, timeoutMs = 120000): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_COMMAND, [LOCAL_LLM_SCRIPT, action], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Local LLM timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timeout);
      try {
        const parsed = JSON.parse(stdout.trim() || "{}");
        if (code === 0) {
          resolve(parsed);
        } else {
          reject(new Error(parsed.error || stderr.trim() || `Local LLM exited with code ${code}.`));
        }
      } catch {
        reject(new Error(stderr.trim() || "Local LLM returned invalid JSON."));
      }
    });
    child.stdin.end(JSON.stringify({ ...payload, model: LOCAL_LLM_MODEL }));
  });
}

function shouldUseGemini(): boolean {
  return !!aiClient && modelMode === "gemini";
}

function shouldUseOllamaForGeneratedText(): boolean {
  return modelMode === "ollama";
}

function getActiveProvider(): "gemini" | "ollama" {
  if (shouldUseGemini()) return "gemini";
  return "ollama";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    })
  ]);
}

function generateGeminiContent(request: any): Promise<any> {
  if (!aiClient) {
    return Promise.reject(new Error("Gemini client is not configured."));
  }
  return withTimeout(aiClient.models.generateContent(request), GEMINI_TIMEOUT_MS, "Gemini request");
}

// Initialize GoogleGenAI from @google/genai
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log(`NutriBD AI: GoogleGenAI SDK initialized successfully from ${apiKeySource}.`);
  } catch (err) {
    console.error("NutriBD AI: Failed to initialize GoogleGenAI:", err);
  }
} else {
  console.warn("NutriBD AI Warning: no Gemini key found. Set GEMINI_API_KEY, GOOGLE_API_KEY, or API_KEY in .env.local to enable Gemini locally.");
}

// -------------------------------------------------------------
// Core Food Dataset / Mock fallback data for stable local demo
// -------------------------------------------------------------
const FALLBACK_FOODS = [
  { id: "1", name: "Paratha (Oil fried)", portion: "1 piece (60g)", calories: 260, carbs: 36, protein: 4.5, fat: 11.2, sodium: 180, sugar: 0.5, iron: 1.1 },
  { id: "2", name: "Aloo Bhaji (Potato fry)", portion: "1 cup (150g)", calories: 180, carbs: 22, protein: 3.1, fat: 9.5, sodium: 320, sugar: 1.2, iron: 0.9 },
  { id: "3", name: "Rui Fish Curry", portion: "1 piece with gravy", calories: 155, carbs: 2.5, protein: 17.2, fat: 8.4, sodium: 290, sugar: 0.2, iron: 1.4 },
  { id: "4", name: "Lens/Moshur Dal", portion: "1 cup cooked (150g)", calories: 140, carbs: 19, protein: 9.4, fat: 2.1, sodium: 240, sugar: 0.8, iron: 2.2 },
  { id: "5", name: "White Rice (Bhaat)", portion: "1 plate (200g)", calories: 260, carbs: 58, protein: 5.2, fat: 0.4, sodium: 5, sugar: 0.1, iron: 0.4 },
  { id: "6", name: "Singara (Street snack)", portion: "1 piece (75g)", calories: 210, carbs: 28, protein: 3.5, fat: 10.2, sodium: 340, sugar: 0.8, iron: 0.8 },
  { id: "7", name: "Sweetened Milk Tea (Chaa)", portion: "1 cup", calories: 85, carbs: 14, protein: 2.1, fat: 1.8, sodium: 25, sugar: 12, iron: 0.1 },
  { id: "8", name: "Beef Rezala", portion: "1 plate (150g)", calories: 340, carbs: 6, protein: 24, fat: 24.5, sodium: 450, sugar: 1.1, iron: 2.8 },
  { id: "9", name: "Red Rice (Laal Bhaat)", portion: "1 plate (200g)", calories: 230, carbs: 48, protein: 6.0, fat: 1.2, sodium: 4, sugar: 0.1, iron: 1.8 },
  { id: "10", name: "Kacchi Biryani", portion: "1 serving (250g)", calories: 360, carbs: 46, protein: 18, fat: 14, sodium: 620, sugar: 2.4, iron: 2.2 },
  { id: "11", name: "Fried Chicken", portion: "1 piece (150g)", calories: 444, carbs: 18, protein: 16, fat: 22, sodium: 520, sugar: 1.8, iron: 1.1 },
  { id: "12", name: "Chicken Curry", portion: "1 piece with gravy (120g)", calories: 240, carbs: 6, protein: 22, fat: 14, sodium: 430, sugar: 1.5, iron: 1.0 },
  { id: "13", name: "Boiled Egg (Siddho Dim)", portion: "1 egg", calories: 78, carbs: 0.6, protein: 6.3, fat: 5.3, sodium: 62, sugar: 0.6, iron: 0.6 },
  { id: "14", name: "Fried Egg", portion: "1 egg", calories: 110, carbs: 0.8, protein: 6.5, fat: 8.5, sodium: 95, sugar: 0.5, iron: 0.7 }
];

const FALLBACK_ALTERNATIVES = [
  {
    unhealthyFood: "Oil Fried Paratha",
    healthierAlternative: "Whole Wheat Atta Ruti (Dry Bread)",
    banglaAlternativeName: "আটা রুটি",
    whyBetter: "Atta ruti is made with whole wheat flour directly on a tawa with zero added cooking oil, dramatically cutting down saturated fat content and helping maintain stable blood sugar levels without oil-induced calorie spikes.",
    localAffordability: "Extremely affordable, standard daily household diet across Bangladesh.",
    approximatePriceDiff: "Cheaper (saves 5-10 BDT per ruti as oil is skipped)",
    nutritionComparison: {
      unhealthyCalories: 260,
      healthyCalories: 110,
      unhealthyBenefits: "High fat, high calorie, refined flour causes glucose levels to rise rapidly.",
      healthyBenefits: "Rich in dietary fiber, digests slowly, excellent for long-term weight management."
    }
  },
  {
    unhealthyFood: "Deep Fried Singara",
    healthierAlternative: "Steamed Chhola Boot (with ginger and green chillies)",
    banglaAlternativeName: "ছোলা বুট",
    whyBetter: "Singara is deep-fried in high-heat commercial soybean oil, containing highly damaging trans-fats and excessive refined flour. Spiced steamed chickpea or Chhola Boot is loaded with plant-protein, raw fiber, and essential minerals.",
    localAffordability: "Readily available at any local market, street corner or easily prepared at home",
    approximatePriceDiff: "Comparable price, high protein yield",
    nutritionComparison: {
      unhealthyCalories: 210,
      healthyCalories: 130,
      unhealthyBenefits: "Trans-fats, highly processed refined flour, high sodium coating.",
      healthyBenefits: "Outstanding plant protein, high dietary fiber, iron, good fats."
    }
  },
  {
    unhealthyFood: "Commercial Sweetened Tea (Maler Chaa / Roadside)",
    healthierAlternative: "Ginger Cinnamon Black Tea (Lal Chaa) or Green Tea",
    banglaAlternativeName: "রং চা (আদা-দারুচিনি)",
    whyBetter: "Roadside tea stalls heavily boil loose tea leaves and add generous amounts of condensed milk and white sugar (often 2-3 teaspoons). Lal Chaa naturally provides protective flavonoids and metabolic enhancers without blood sugar spikes.",
    localAffordability: "Very cheap, available in every corner of Bangladesh for 5-10 BDT.",
    approximatePriceDiff: "Highly cheap (saves 5 BDT per cup compared to condensed milk tea)",
    nutritionComparison: {
      unhealthyCalories: 85,
      healthyCalories: 5,
      unhealthyBenefits: "High refined sugar burden, lipid imbalance risk due to reconstituted milk fat.",
      healthyBenefits: "Zero calorie hydration, anti-inflammatory herbs, clears throat."
    }
  }
];

function buildFallbackRiskAssessment(profile: any, foodLog: any[] = []) {
  console.log("Generating fallback risk factors...");
  type RiskAlert = {
    title: string;
    severity: "low" | "medium" | "high";
    explanation: string;
    actionableSteps: string[];
  };
  const alerts: RiskAlert[] = [];
  const conditions = new Set<string>(Array.isArray(profile.healthConditions) ? profile.healthConditions : []);
  const hasCondition = (condition: string) => conditions.has(condition);
  const hasAnyCondition = [...conditions].some(condition => condition !== "none");
  const heightM = Number(profile.height || 0) / 100;
  const bmi = heightM > 0 ? Number((Number(profile.weight || 0) / (heightM * heightM)).toFixed(1)) : null;
  const foodNames = foodLog.map((f: any) => String(f.name || "").toLowerCase()).join(" ");

  let totalCalories = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalProtein = 0;
  let totalIron = 0;
  let totalSodium = 0;
  let totalSugar = 0;
  foodLog.forEach((f: any) => {
    totalCalories += (f.calories || 0);
    totalCarbs += (f.carbs || 0);
    totalFat += (f.fat || 0);
    totalProtein += (f.protein || 0);
    totalIron += (f.iron || 0);
    totalSodium += (f.sodium || 0);
    totalSugar += (f.sugar || 0);
  });

  const hasFriedOrOilHeavyFood = /(fried|paratha|porota|singara|puri|luchi|bhaji|rezala|burger|pizza|chips)/.test(foodNames);
  const hasRiceHeavyFood = /(rice|bhaat|bhat|polao|biryani|khichuri|tehari|noodle)/.test(foodNames);
  const hasTeaFood = /(tea|cha|chaa)/.test(foodNames);
  const hasPulseOrShak = /(dal|lentil|shak|spinach|kolmi|lal shak|chhola|boot)/.test(foodNames);
  const calorieHigh = totalCalories >= 750;
  const carbHigh = totalCarbs >= 80 || totalSugar >= 25;
  const sodiumHigh = totalSodium >= 1400;
  const fatHigh = totalFat >= 35;
  const ironLow = totalIron < 5;

  const addAlert = (alert: RiskAlert) => {
    if (!alerts.some(existing => existing.title === alert.title)) {
      alerts.push(alert);
    }
  };

  if (hasCondition("diabetes")) {
    addAlert({
      title: "Diabetes Glucose Control Priority",
      severity: carbHigh || totalSugar >= 18 ? "high" : "medium",
      explanation: `Your current plate shows about ${Math.round(totalCarbs)}g carbohydrates and ${Math.round(totalSugar)}g sugar. For diabetes or elevated glucose, the main priority is reducing glucose spikes by controlling rice/flour portions and pairing carbs with protein, dal, shak, and vegetables.`,
      actionableSteps: [
        "Keep rice, polao, khichuri, or ruti to one measured serving instead of taking a second starch serving.",
        "Add egg, fish, chicken, dal, or chhola before increasing rice so the meal digests more steadily.",
        "Avoid sweet tea, soft drinks, and dessert with the same meal; choose unsweetened lal cha or water."
      ]
    });

    if (!hasPulseOrShak || totalProtein < 18) {
      addAlert({
        title: "Low Protein and Fiber Support for Glucose Stability",
        severity: "medium",
        explanation: `This log has about ${Math.round(totalProtein)}g protein. Diabetes-friendly Bangladeshi meals usually work better when rice or ruti is balanced with dal, shak, vegetables, fish, egg, or chicken.`,
        actionableSteps: [
          "Add one palm-size protein source such as egg, fish, chicken, tofu, or chhola.",
          "Include one serving of shak or non-starchy vegetables before taking more rice.",
          "Choose whole wheat ruti or measured red rice more often than paratha, polao, or plain white rice."
        ]
      });
    }
  }

  if (hasCondition("hypertension")) {
    addAlert({
      title: "Blood Pressure and Sodium Control Priority",
      severity: totalSodium >= 1500 ? "high" : "medium",
      explanation: `Your logged food contains about ${Math.round(totalSodium)}mg sodium before any added table salt. With hypertension, kacha lobon, achar, salty snacks, sauces, and restaurant foods can push sodium up quickly even when the main food looks ordinary.`,
      actionableSteps: [
        "Do not add kacha lobon at the table; use lemon, chili, coriander, roasted cumin, or garlic for flavor.",
        "Avoid combining achar, chanachur, packaged snacks, and restaurant curry on the same day.",
        "Add potassium-rich local foods like lau, pepe, cucumber, dal, banana, or coconut water when appropriate."
      ]
    });

    if (hasFriedOrOilHeavyFood || fatHigh) {
      addAlert({
        title: "Hypertension-Friendly Oil and Weight Load Watch",
        severity: fatHigh ? "medium" : "low",
        explanation: `Oil-heavy foods can make blood pressure management harder over time by increasing calorie density and weight pressure. This meal has about ${Math.round(totalFat)}g fat.`,
        actionableSteps: [
          "Pick grilled, boiled, or light curry preparations instead of deep-fried items most days.",
          "Measure cooking oil with a spoon instead of free-pouring.",
          "Walk 10-20 minutes after the largest meal if your doctor has not restricted activity."
        ]
      });
    }
  }

  if (hasCondition("cholesterol")) {
    addAlert({
      title: "Cholesterol and Fried Fat Priority",
      severity: fatHigh || hasFriedOrOilHeavyFood ? "high" : "medium",
      explanation: `For high cholesterol, the key issue is repeated fried food, fatty meat, bakery items, and low-fiber plates. This log has about ${Math.round(totalFat)}g fat${hasFriedOrOilHeavyFood ? " and includes fried or oil-heavy foods" : ""}.`,
      actionableSteps: [
        "Choose fish curry, grilled chicken, dal, or chhola more often than fried chicken, paratha, rezala, or burger.",
        "Use mustard, rice-bran, or soybean oil sparingly and avoid reheated deep-fry oil.",
        "Add soluble-fiber foods such as oats, dal, chhola, vegetables, guava, or apple during the day."
      ]
    });

    if (!hasPulseOrShak) {
      addAlert({
        title: "Fiber Gap for Lipid Control",
        severity: "medium",
        explanation: "This meal does not clearly show enough dal, shak, vegetables, or fruit. Fiber helps reduce LDL cholesterol risk and improves fullness without adding much cost.",
        actionableSteps: [
          "Add one bowl of dal or chhola with lunch or dinner.",
          "Include seasonal shak, lau, pepe, cabbage, or cucumber with oily meals.",
          "Use fruit like peyara or apple as the default sweet snack."
        ]
      });
    }
  }

  if (hasCondition("anemia")) {
    addAlert({
      title: "Iron Deficiency and Absorption Priority",
      severity: ironLow ? "high" : "medium",
      explanation: `Your logged foods provide about ${totalIron.toFixed(1)}mg iron. For anemia risk, the priority is not just eating iron-rich food, but improving absorption with vitamin C and avoiding tea close to meals.`,
      actionableSteps: [
        "Add lal shak, kolmi shak, kachu shak, moshur dal, chhola, egg, fish, or liver when culturally appropriate.",
        "Squeeze lemon over dal, fish, or shak, or eat guava/amra after meals for vitamin C.",
        "Keep tea or coffee at least one hour away from iron-rich meals."
      ]
    });

    if (hasTeaFood) {
      addAlert({
        title: "Tea Timing May Reduce Iron Absorption",
        severity: "medium",
        explanation: "Tea with or immediately after meals can reduce non-heme iron absorption, which matters more for anemia-prone users.",
        actionableSteps: [
          "Drink tea between meals rather than with lunch or dinner.",
          "Pair dal or shak with lemon, amra, orange, or peyara.",
          "Avoid taking calcium-heavy drinks at the same time as iron-rich meals if anemia is a focus."
        ]
      });
    }
  }

  if (hasCondition("obesity")) {
    addAlert({
      title: "Weight Management and Calorie Density Priority",
      severity: calorieHigh || (bmi !== null && bmi >= 27.5) ? "high" : "medium",
      explanation: `${bmi !== null ? `Your BMI is approximately ${bmi}. ` : ""}For South Asian users, metabolic risk often rises earlier, and calorie-dense combinations like rice plus fried foods, burgers, sweets, or sweet tea can slow weight progress.`,
      actionableSteps: [
        "Use the plate method: half vegetables, one quarter protein, and one quarter rice or ruti.",
        "Keep fried snacks, burger, biryani, polao, or paratha occasional rather than daily.",
        "Add 20-30 minutes of walking most days, especially after the largest meal."
      ]
    });

    if (profile.activityLevel === "sedentary") {
      addAlert({
        title: "Sedentary Routine Increases Weight-Regain Risk",
        severity: "medium",
        explanation: "A low-activity routine makes even normal Bangladeshi meal portions easier to overconsume because daily energy use stays low.",
        actionableSteps: [
          "Start with 10 minutes of brisk walking after lunch or dinner and build gradually.",
          "Use stairs, household walking, or short movement breaks every 60-90 minutes.",
          "Prioritize protein at breakfast so hunger is lower later in the day."
        ]
      });
    }
  }

  if (!hasAnyCondition) {
    if (carbHigh || (hasRiceHeavyFood && totalCarbs >= 60)) {
      addAlert({
        title: "Carbohydrate Balance Watch",
        severity: carbHigh ? "medium" : "low",
        explanation: `This meal has about ${Math.round(totalCarbs)}g carbohydrates. That is not automatically bad, but prevention-focused users should keep rice, ruti, noodles, polao, and khichuri portions measured.`,
        actionableSteps: [
          "Measure rice or ruti first, then fill the rest of the plate with vegetables and protein.",
          "Choose dal, fish, egg, chicken, or chhola to make the meal more filling.",
          "Keep sweet tea or dessert separate from already starch-heavy meals."
        ]
      });
    }

    if (hasFriedOrOilHeavyFood || fatHigh) {
      addAlert({
        title: "Fried Food Frequency Watch",
        severity: fatHigh ? "medium" : "low",
        explanation: `This log includes oil-heavy foods or about ${Math.round(totalFat)}g fat. Occasional fried food can fit, but frequent deep-fried meals raise long-term calorie and heart-risk burden.`,
        actionableSteps: [
          "Choose dry ruti, light curry, grilled fish/chicken, or dal on most weekdays.",
          "Keep fried snacks to smaller portions and avoid pairing them with another oily dinner.",
          "Add salad, cucumber, tomato, or seasonal vegetables beside oily meals."
        ]
      });
    }
  }

  if (!hasCondition("hypertension") && sodiumHigh) {
    alerts.push({
      title: "High Sodium Intake Today",
      severity: totalSodium >= 2000 ? "high" : "medium",
      explanation: `This log contains about ${Math.round(totalSodium)}mg sodium before any added table salt, which is high even without a hypertension flag.`,
      actionableSteps: [
        "Avoid adding kacha lobon or achar today.",
        "Choose home-cooked dal, shak, rice, or light curry for the next meal.",
        "Drink water and avoid salty packaged snacks for the rest of the day."
      ]
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Balanced Maintenance Plan",
      severity: "low",
      explanation: "Your current log does not show a major single nutrient warning, but prevention depends on consistency across the week. Keep variety high with dal, fish or egg, seasonal vegetables, and measured rice portions.",
      actionableSteps: [
        "Build most plates around half vegetables, one quarter protein, and one quarter rice or ruti.",
        "Use fruit such as peyara, banana, or papaya as the default sweet snack.",
        "Keep daily water intake steady, especially in hot Bangladeshi weather."
      ]
    });
  }

  const topAlerts = alerts.slice(0, 3);
  const overallSummary = `Risk profile computed for a ${profile.age}-year-old ${profile.gender}${bmi !== null ? ` with BMI ${bmi}` : ""}. The logged foods total about ${Math.round(totalCalories)} kcal, ${Math.round(totalCarbs)}g carbs, ${Math.round(totalFat)}g fat, ${Math.round(totalProtein)}g protein, ${Math.round(totalSodium)}mg sodium, and ${totalIron.toFixed(1)}mg iron. Detected ${topAlerts.length} prevention priorities using Bangladeshi meal patterns, South Asian BMI thresholds, and the selected health profile.`;

  return {
    alerts: topAlerts,
    overallSummary,
    disclaimer: "DISCLAIMER: This system is powered by AI and exists solely for health awareness and educational purposes. It does NOT claim to provide medical diagnosis, nor should it substitute professional clinical evaluation."
  };
}

type NutritionFood = {
  food_id: string;
  food_name_bn: string;
  food_name_en: string;
  aliases: string;
  category: string;
  serving_size_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
  fiber: number;
};

type AliasEntry = {
  alias: string;
  normalizedAlias: string;
  food: NutritionFood;
};

const NUTRITION_FOODS_CSV = path.join(process.cwd(), "nutribd_ai", "data", "foods.csv");

function normalizeFoodText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_/()]/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadNutritionFoods(): NutritionFood[] {
  try {
    const raw = fs.readFileSync(NUTRITION_FOODS_CSV, "utf-8").trim();
    const [headerLine, ...rows] = raw.split(/\r?\n/);
    const headers = headerLine.split(",");

    return rows
      .map(row => {
        const values = row.split(",");
        const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
        return {
          food_id: record.food_id,
          food_name_bn: record.food_name_bn,
          food_name_en: record.food_name_en,
          aliases: record.aliases,
          category: record.category,
          serving_size_g: Number(record.serving_size_g) || 100,
          calories: Number(record.calories) || 0,
          protein: Number(record.protein) || 0,
          carbs: Number(record.carbs) || 0,
          fat: Number(record.fat) || 0,
          sugar: Number(record.sugar) || 0,
          sodium: Number(record.sodium) || 0,
          fiber: Number(record.fiber) || 0,
        };
      })
      .filter(food => food.food_id && food.food_name_en);
  } catch (err: any) {
    console.warn(`NutriBD AI: unable to load ${NUTRITION_FOODS_CSV}:`, err.message);
    return [];
  }
}

function buildAliasEntries(foods: NutritionFood[]): AliasEntry[] {
  const extraAliases: Record<string, string[]> = {
    "white rice": ["bhat", "shada bhaat", "sada bhat"],
    "khichuri": ["khichuri", "kichuri", "khicuri", "khichdi"],
    "kacchi biryani": ["kacchi", "kachi", "kacchi biryani", "kachi biryani"],
    "fried chicken": ["crispy chicken", "chicken fry"],
    "chicken burger": ["burger"],
    "chicken curry": ["murgi", "morog", "murgi mangsho", "morog mangsho"],
    "luchi": ["puri", "poori"],
  };

  const entries: AliasEntry[] = [];
  const seen = new Set<string>();

  foods.forEach(food => {
    const aliases = [
      food.food_name_en,
      food.food_name_bn,
      ...String(food.aliases || "").split("|"),
      ...(extraAliases[food.food_name_en] || []),
    ];

    aliases.forEach(alias => {
      const trimmedAlias = alias.trim();
      const normalizedAlias = normalizeFoodText(trimmedAlias);
      if (normalizedAlias.length < 3) return;

      const key = `${normalizedAlias}:${food.food_id}`;
      if (seen.has(key)) return;

      seen.add(key);
      entries.push({ alias: trimmedAlias, normalizedAlias, food });
    });
  });

  return entries.sort((a, b) => {
    if (b.normalizedAlias.length !== a.normalizedAlias.length) {
      return b.normalizedAlias.length - a.normalizedAlias.length;
    }
    return Number(a.food.food_id) - Number(b.food.food_id);
  });
}

const NUTRITION_FOODS = loadNutritionFoods();
const NUTRITION_ALIAS_ENTRIES = buildAliasEntries(NUTRITION_FOODS);
const MEAL_FILLER_WORDS = new Set([
  "a", "an", "and", "ate", "breakfast", "dinner", "for", "had", "i", "in", "lunch",
  "my", "of", "one", "plate", "snack", "the", "two", "with",
]);

function findAliasSpan(normalizedInput: string, normalizedAlias: string) {
  const start = normalizedInput.indexOf(normalizedAlias);
  if (start < 0) return null;

  const end = start + normalizedAlias.length;
  const isLatinAlias = /^[a-z0-9\s]+$/.test(normalizedAlias);
  if (isLatinAlias) {
    const before = start === 0 ? " " : normalizedInput[start - 1];
    const after = end >= normalizedInput.length ? " " : normalizedInput[end];
    if (before !== " " || after !== " ") return null;
  }

  return { start, end };
}

function levenshteinDistance(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function fuzzyScore(a: string, b: string) {
  const left = normalizeFoodText(a);
  const right = normalizeFoodText(b);
  if (!left || !right) return 0;

  const distance = levenshteinDistance(left, right);
  return (1 - distance / Math.max(left.length, right.length)) * 100;
}

function normalizedSoundKey(value: string) {
  return normalizeFoodText(value)
    .split(" ")
    .map(word => word
      .replace(/[aeiou]+/g, "a")
      .replace(/sh/g, "s")
      .replace(/ch/g, "c")
      .replace(/ph/g, "f")
      .replace(/(.)\1+/g, "$1")
    )
    .join(" ");
}

function fuzzyPhoneticScore(a: string, b: string) {
  return Math.max(
    fuzzyScore(a, b),
    fuzzyScore(normalizedSoundKey(a), normalizedSoundKey(b))
  );
}

function tokenWindows(normalizedInput: string, tokenCount: number) {
  const tokens: Array<{ text: string; start: number; end: number }> = [];
  const matcher = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(normalizedInput)) !== null) {
    tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }

  if (tokenCount <= 0 || tokenCount > tokens.length) return [];

  const windows: Array<{ text: string; start: number; end: number }> = [];
  for (let index = 0; index <= tokens.length - tokenCount; index += 1) {
    const windowTokens = tokens.slice(index, index + tokenCount);
    windows.push({
      text: windowTokens.map(token => token.text).join(" "),
      start: windowTokens[0].start,
      end: windowTokens[windowTokens.length - 1].end,
    });
  }

  return windows;
}

function findFuzzyAliasSpan(normalizedInput: string, normalizedAlias: string) {
  const isLatinAlias = /^[a-z0-9\s]+$/.test(normalizedAlias);
  if (!isLatinAlias || normalizedAlias.length < 4) return null;

  const aliasTokenCount = normalizedAlias.split(" ").length;
  const windows = tokenWindows(normalizedInput, aliasTokenCount);
  const threshold = aliasTokenCount === 1 ? 88 : 74;
  let best: { start: number; end: number; score: number } | null = null;

  windows.forEach(window => {
    if (window.text.length < 4) return;
    if (window.text.split(" ").some(word => MEAL_FILLER_WORDS.has(word))) return;
    const score = aliasTokenCount === 1
      ? fuzzyScore(window.text, normalizedAlias)
      : fuzzyPhoneticScore(window.text, normalizedAlias);
    if (score >= threshold && (!best || score > best.score)) {
      best = { start: window.start, end: window.end, score };
    }
  });

  return best;
}

function findBestAliasSpan(normalizedInput: string, normalizedAlias: string) {
  return findAliasSpan(normalizedInput, normalizedAlias) || findFuzzyAliasSpan(normalizedInput, normalizedAlias);
}

function spansOverlap(span: { start: number; end: number }, spans: Array<{ start: number; end: number }>) {
  return spans.some(existing => span.start < existing.end && span.end > existing.start);
}

function nutritionFoodToFoodItem(food: NutritionFood) {
  const displayName = food.food_name_bn
    ? `${food.food_name_en} (${food.food_name_bn})`
    : food.food_name_en;

  return {
    id: `csv-${food.food_id}`,
    name: displayName,
    portion: `1 serving (${Math.round(food.serving_size_g)}g)`,
    calories: Math.round(food.calories),
    carbs: Number(food.carbs.toFixed(1)),
    protein: Number(food.protein.toFixed(1)),
    fat: Number(food.fat.toFixed(1)),
    sodium: Math.round(food.sodium),
    sugar: Number(food.sugar.toFixed(1)),
    iron: 0,
  };
}

function matchFoodsFromCsv(foodText: string) {
  const normalizedInput = normalizeFoodText(foodText);
  const occupiedSpans: Array<{ start: number; end: number }> = [];
  const matchedFoodIds = new Set<string>();
  const detectedItems: any[] = [];

  const addMatchedFood = (entry: AliasEntry, span: { start: number; end: number } | null) => {
    if (matchedFoodIds.has(entry.food.food_id)) return;
    if (!span || spansOverlap(span, occupiedSpans)) return;

    occupiedSpans.push(span);
    matchedFoodIds.add(entry.food.food_id);
    detectedItems.push(nutritionFoodToFoodItem(entry.food));
  };

  NUTRITION_ALIAS_ENTRIES.forEach(entry => {
    if (entry.normalizedAlias.split(" ").length <= 1) return;
    addMatchedFood(entry, findAliasSpan(normalizedInput, entry.normalizedAlias));
  });

  NUTRITION_ALIAS_ENTRIES.forEach(entry => {
    addMatchedFood(entry, findFuzzyAliasSpan(normalizedInput, entry.normalizedAlias));
  });

  NUTRITION_ALIAS_ENTRIES.forEach(entry => {
    if (entry.normalizedAlias.split(" ").length > 1) return;
    addMatchedFood(entry, findAliasSpan(normalizedInput, entry.normalizedAlias));
  });

  return detectedItems;
}

function getUnmatchedFoodWords(foodText: string) {
  const normalizedInput = normalizeFoodText(foodText);
  const covered = Array.from(normalizedInput).map(char => char === " " ? " " : char);

  NUTRITION_ALIAS_ENTRIES.forEach(entry => {
    const span = findBestAliasSpan(normalizedInput, entry.normalizedAlias);
    if (!span) return;
    for (let index = span.start; index < span.end; index += 1) {
      covered[index] = " ";
    }
  });

  return covered
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(word => word && !MEAL_FILLER_WORDS.has(word) && !/^\d+$/.test(word));
}

function parseFoodTextFallback(foodText: string) {
  console.log("Analyzing with fallback parser...");
  const lower = foodText.toLowerCase();
  const hasAny = (terms: string[]) => terms.some(term => lower.includes(term.toLowerCase()));
  const wantsSimpleEgg = hasAny(["egg", "dim", "à¦¡à¦¿à¦®"])
    && !hasAny(["egg roll", "egg curry", "dim roll", "à¦¡à¦¿à¦® à¦°à§‹à¦²"]);
  const csvDetectedItems = matchFoodsFromCsv(foodText)
    .filter(item => !(wantsSimpleEgg && String(item.name || "").toLowerCase().includes("egg roll")));

  if (wantsSimpleEgg && csvDetectedItems.length > 0) {
    const simpleEgg = hasAny(["fried egg", "dim bhaji", "egg fry"])
      ? FALLBACK_FOODS[13]
      : FALLBACK_FOODS[12];
    csvDetectedItems.push(simpleEgg);
  }

  if (csvDetectedItems.length > 0) {
    return {
      detectedItems: csvDetectedItems,
      overallComments: "Matched directly from NutriBD's foods.csv aliases, so the intake tracker is using the local Bangladesh food database for this estimate."
    };
  }

  const detectedItems: any[] = [...csvDetectedItems];
  const addFood = (food: any) => {
    if (!detectedItems.some(item => item.name === food.name)) {
      detectedItems.push(food);
    }
  };

  if (hasAny(["kacchi", "kachi", "kacchi biryani", "kachi biryani", "কাচ্চি", "কাচ্চি বিরিয়ানি", "কাচ্চি বিরিয়ানি"])) {
    addFood(FALLBACK_FOODS[9]);
  }
  if (hasAny(["fried chicken", "crispy chicken", "chicken fry", "চিকেন ফ্রাই", "ফ্রাইড চিকেন", "মুরগি ফ্রাই"])) {
    addFood(FALLBACK_FOODS[10]);
  } else if (hasAny(["chicken", "murgi", "murgir mangsho", "মুরগি", "মুরগির মাংস", "চিকেন"])) {
    addFood(FALLBACK_FOODS[11]);
  }
  if (hasAny(["siddho dim", "siddo dim", "boiled egg", "egg boiled", "ডিম সিদ্ধ", "সিদ্ধ ডিম", "সেদ্ধ ডিম"])) {
    addFood(FALLBACK_FOODS[12]);
  } else if (hasAny(["fried egg", "dim bhaji", "egg fry", "ডিম ভাজি", "ডিম ফ্রাই"])) {
    addFood(FALLBACK_FOODS[13]);
  } else if (hasAny(["dim", "egg", "ডিম"])) {
    addFood(FALLBACK_FOODS[12]);
  }

  if (hasAny(["paratha", "porota", "parota", "পরোটা", "পারাঠা", "পরোটা"])) {
    addFood(FALLBACK_FOODS[0]);
  }
  if (hasAny(["bhaji", "aloo", "potato", "ভাজি", "আলু", "আলু ভাজি"])) {
    addFood(FALLBACK_FOODS[1]);
  }
  if (hasAny(["rui", "rui fish", "rui fish curry", "fish curry", "maach", "রুই", "মাছ", "মাছের", "মাছ curry"])) {
    addFood(FALLBACK_FOODS[2]);
  }
  if (hasAny(["dal", "daal", "lentil", "ডাল", "মসুর", "মসুর ডাল", "ডালভাত"])) {
    addFood(FALLBACK_FOODS[3]);
  }
  if (!hasAny(["kacchi", "kachi", "biryani", "কাচ্চি", "বিরিয়ানি", "বিরিয়ানি"]) && hasAny(["rice", "bhaat", "bhat", "ভাত", "চাল", "সাদা ভাত", "ভাত খেয়েছি", "ভাত খেয়েছি"])) {
    if (hasAny(["red", "laal", "লাল", "লাল চাল", "লাল ভাত"])) {
      addFood(FALLBACK_FOODS[8]);
    } else {
      addFood(FALLBACK_FOODS[4]);
    }
  }
  if (hasAny(["singara", "shingara", "সিঙ্গারা", "শিঙাড়া", "সমুচা", "সামুচা"])) {
    addFood(FALLBACK_FOODS[5]);
  }
  if (hasAny(["tea", "chaa", "cha", "চা", "দুধ চা", "দুধচা", "মিল্ক টি", "milk tea"])) {
    addFood(FALLBACK_FOODS[6]);
  }
  if (hasAny(["beef", "rezala", "meat", "গরু", "গরুর", "রেজালা", "মাংস", "গরুর মাংস"])) {
    addFood(FALLBACK_FOODS[7]);
  }
  if (hasAny(["peyara", "guava", "পেয়ারা", "পেয়ারা"])) {
    addFood({ id: "10", name: "Peyara (Fresh Guava)", portion: "1 fruit (120g)", calories: 60, carbs: 14, protein: 1.4, fat: 0.4, sodium: 2, sugar: 8.9, iron: 0.3 });
  }

  return {
    detectedItems,
    overallComments: detectedItems.length > 0
      ? "Parsed with NutriBD's Bangla-aware local food matcher. বাংলা বা English দুই ভাষাতেই সাধারণ বাংলাদেশি খাবারের আনুমানিক পুষ্টিমান দেখানো হয়েছে."
      : "No confident local food match found. Please try a clearer food name such as 'siddho dim', 'kacchi', 'fried chicken', 'rui fish curry', or 'bhaat'."
  };
}

// -------------------------------------------------------------
// Endpoints Definition
// -------------------------------------------------------------

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    apiActive: !!aiClient,
    geminiKeyPresent: !!apiKey,
    apiKeySource,
    modelMode,
    localTime: new Date().toISOString()
  });
});

app.get("/api/local-llm-status", async (req, res) => {
  try {
    const status = await runLocalLlm("status", {}, 5000);
    res.json(status);
  } catch {
    res.json({ ollama: false, model: LOCAL_LLM_MODEL });
  }
});

app.get("/api/models-status", async (req, res) => {
  let ollama = false;
  try {
    ollama = !!(await runLocalLlm("status", {}, 5000)).ollama;
  } catch {
    ollama = false;
  }
  res.json({
    gemini: !!aiClient,
    geminiKeyPresent: !!apiKey,
    apiKeySource,
    ollama,
    ollamaModel: LOCAL_LLM_MODEL,
    modelMode,
    activeProvider: getActiveProvider()
  });
});

app.post("/api/model-mode", async (req, res) => {
  const nextMode = req.body?.mode as ModelMode;
  if (!MODEL_MODES.has(nextMode)) {
    return res.status(400).json({ error: "Invalid model mode. Use gemini or ollama." });
  }
  if (nextMode === "gemini" && !aiClient) {
    return res.status(409).json({
      error: "Gemini is not configured locally. Add GEMINI_API_KEY, GOOGLE_API_KEY, or API_KEY to .env.local and restart the dev server."
    });
  }
  if (nextMode === "ollama") {
    try {
      const status = await runLocalLlm("status", {}, 5000);
      if (!status.ollama) {
        return res.status(409).json({ error: "Ollama is not running locally. Start Ollama, then try again." });
      }
    } catch {
      return res.status(409).json({ error: "Ollama is not reachable locally. Start Ollama, then try again." });
    }
  }
  modelMode = nextMode;
  res.json({ modelMode, activeProvider: getActiveProvider() });
});

app.post("/api/health-tip", async (req, res) => {
  try {
    if (shouldUseGemini()) {
      const response = await generateGeminiContent({
        model: GEMINI_MODEL,
        contents: HEALTH_TIP_PROMPT,
      });
      return res.json({ tip: response.text.trim(), model_used: "gemini" });
    }

    return res.json({
      tip: "Keep rice portions measured and add affordable dal, seasonal shak, and fish when possible. This improves fiber and protein while keeping everyday meals practical for a Bangladeshi household.",
      model_used: "local-static",
    });
  } catch (err: any) {
    console.error("Health tip generation failed:", err);
    return res.status(500).json({ error: "Failed to generate a health tip.", details: err.message });
  }
});

// 1. Food Intake Analyzer
app.post("/api/analyze-food", async (req, res) => {
  const { foodText } = req.body;
  if (!foodText || typeof foodText !== 'string' || !foodText.trim()) {
    return res.status(400).json({ error: "Please submit description of recent meals." });
  }

  const localParsed = parseFoodTextFallback(foodText);
  if (localParsed.detectedItems.length > 0 && getUnmatchedFoodWords(foodText).length === 0) {
    return res.json(localParsed);
  }

  const normalizedFoodText = foodText.toLowerCase();
  if (/(kacchi|kachi|biryani|fried chicken|crispy chicken|chicken fry|siddho dim|siddo dim|boiled egg|egg|dim|কাচ্চি|বিরিয়ানি|বিরিয়ানি|ফ্রাইড চিকেন|চিকেন ফ্রাই|ডিম|সিদ্ধ ডিম|সেদ্ধ ডিম)/.test(normalizedFoodText)) {
    return res.json(parseFoodTextFallback(foodText));
  }

  if (!shouldUseGemini()) {
    if (shouldUseOllamaForGeneratedText()) {
      try {
        console.log("Analyzing with local Ollama...");
        return res.json(await runLocalLlm("analyze-food", { foodText }, 30000));
      } catch (err: any) {
        console.warn("Local Ollama analysis unavailable, using deterministic parser:", err.message);
      }
    }

    return res.json(parseFoodTextFallback(foodText));
  }

  try {
    const prompt = `Analyze the nutritional intake described in this text: "${foodText}".
Keep in mind Bangladesh common culinary preparation methods. Make sure typical local spices, cooking oil use, and traditional side dishes are taken into account.
Provide a clean breakdown of specific foods detected, giving:
- Name (e.g., "Moshur Dal", "White Rice", "Paratha")
- Ideal portion estimate in common serving sizing (e.g. "1 plate (200g)", "1 piece (60g)")
- Calorie estimation, carbohydrates (g), protein (g), fat (g), sodium (mg), sugar (g), iron (mg)
Make sure the metrics are realistic. Also write a short overall friendly clinical review comment.`;

    const response = await generateGeminiContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a professional nutrition calculation engine optimized for typical Bangladeshi regional foods and recipes. You translate local names (e.g., ruti, bhaat, rezala, tehari, chorchori, bhorta) to their estimated health metrics accurately.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING, description: "Descriptive name of the food item in English with Bengali in parenthesis if appropriate" },
                  portion: { type: Type.STRING, description: "Typical serving portion description" },
                  calories: { type: Type.INTEGER },
                  carbs: { type: Type.NUMBER, description: "Carbohydrates in grams" },
                  protein: { type: Type.NUMBER, description: "Protein in grams" },
                  fat: { type: Type.NUMBER, description: "Fat in grams" },
                  sodium: { type: Type.NUMBER, description: "Sodium in mg" },
                  sugar: { type: Type.NUMBER, description: "Sugar in grams" },
                  iron: { type: Type.NUMBER, description: "Iron in mg" },
                },
                required: ["name", "portion", "calories", "carbs", "protein", "fat", "sodium", "sugar", "iron"]
              }
            },
            overallComments: { type: Type.STRING, description: "Short overall comments summarizing meal's highlights, deficiency flags or nutritional wins." }
          },
          required: ["detectedItems", "overallComments"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    // Assign random or simple IDs to foods if they lack them
    parsed.detectedItems = parsed.detectedItems.map((item: any, idx: number) => ({
      ...item,
      id: item.id || String(idx + 1)
    }));
    return res.json(parsed);
  } catch (err: any) {
    console.error("Gemini food analysis failed:", err);
    return res.json(parseFoodTextFallback(foodText));
  }
});

// 2. AI Risk Prediction Engine
app.post("/api/calculate-risks", async (req, res) => {
  const { profile, foodLog } = req.body;
  
  if (!profile) {
    return res.status(400).json({ error: "Missing Health Profile for calculations." });
  }

  const itemsString = foodLog && foodLog.length > 0 
    ? foodLog.map((f: any) => `${f.name} (${f.portion}): ${f.calories}kcal, ${f.carbs}g Carbs, ${f.protein}g Protein, ${f.fat}g Fat, ${f.sodium}mg Sodium).`).join(" ")
    : "No recent logs captured.";

  if (!shouldUseGemini()) {
    if (modelMode === "ollama" || USE_OLLAMA_FOR_RISKS) {
      try {
        console.log(`Generating health risks with local Ollama fallback (${LOCAL_LLM_RISK_TIMEOUT_MS}ms timeout)...`);
        return res.json(await runLocalLlm("calculate-risks", { profile, foodLog }, LOCAL_LLM_RISK_TIMEOUT_MS));
      } catch (err: any) {
        console.warn("Local Ollama risk analysis unavailable, using deterministic rules:", err.message);
      }
    }

    return res.json(buildFallbackRiskAssessment(profile, foodLog || []));
  }

  try {
    const prompt = `Assess the nutritional health risks based on this target user profile:
- Age: ${profile.age}
- Gender: ${profile.gender}
- Weight: ${profile.weight} kg
- Height: ${profile.height} cm
- Activity Level: ${profile.activityLevel}
- Health Conditions: ${profile.healthConditions.join(", ")}
- Dietary Preference: ${profile.dietaryPreference}
- Budget: ${profile.budgetPreference}

Recent food intake log to review:
"${itemsString}"

Perform a non-medical prevention and awareness risk assessment that changes based on the selected health conditions.
Do NOT always return the same carbohydrate/sodium/iron checklist. Prioritize alerts this way:
- If diabetes/elevated glucose is selected: focus on glucose spikes, carb portion control, added sugar, protein/fiber pairing, and Bangladeshi rice/ruti habits.
- If hypertension is selected: focus on sodium, kacha lobon, achar, processed snacks, restaurant foods, potassium-rich local foods, and BP-friendly cooking.
- If high cholesterol is selected: focus on fried food, saturated/trans fat, reheated oil, fatty meat, and fiber from dal, shak, chhola, oats, fruit.
- If anemia is selected: focus on iron intake, vitamin-C pairing, tea timing, dal/shak/egg/fish/liver options, and absorption barriers.
- If overweight/obesity is selected: focus on calorie density, portion size, activity, South Asian BMI threshold, and sustainable weight management.
- If none/general prevention is selected: show only the biggest measured risks from the food log; avoid disease-specific alarm language.
Only include a nutrient warning outside the selected condition if the value is clearly high or low, not merely because it exists.
Return 2-3 highly relevant alerts, not a generic list.
Include a strict disclaimer indicating this is educational and not clinical diagnosis. Keep language constructive, authoritative, and encouraging.`;

    const response = await generateGeminiContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an AI preventive nutrition assistant specialized in South Asian and Bangladeshi lifestyle. You must tailor risk alerts to the user's selected health conditions and avoid repeating the same default warnings for every profile.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Scientific yet easy warning title (e.g. 'Elevated Saturated Fats / Cardiovascular Strain')" },
                  severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
                  explanation: { type: Type.STRING, description: "Detailed, friendly, explainable reason context" },
                  actionableSteps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["title", "severity", "explanation", "actionableSteps"]
              }
            },
            overallSummary: { type: Type.STRING, description: "A summarizing review of how health profile inputs and eating habits combine to impact health outcomes." },
            disclaimer: { type: Type.STRING, description: "A mandatory friendly disclaimer that this is not medical diagnosis." }
          },
          required: ["alerts", "overallSummary", "disclaimer"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return res.json(parsed);
  } catch (err: any) {
    console.error("Gemini risk calculation failed, using deterministic risk fallback:", err);
    return res.json(buildFallbackRiskAssessment(profile, foodLog || []));
  }
});

type PriceFood = {
  item_key: string;
  name: string;
  bangla_name: string;
  category: string;
  tier: "budget" | "moderate" | "premium";
  unit: string;
  unit_price_bdt: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const FOOD_PRICE_CSV = path.join(process.cwd(), "data", "bangladesh_food_prices.csv");

function loadFoodPrices(): Record<string, PriceFood> {
  try {
    const raw = fs.readFileSync(FOOD_PRICE_CSV, "utf-8").trim();
    const [headerLine, ...rows] = raw.split(/\r?\n/);
    const headers = headerLine.split(",");
    return rows.reduce<Record<string, PriceFood>>((acc, row) => {
      const values = row.split(",");
      const record = Object.fromEntries(headers.map((header, idx) => [header, values[idx]]));
      acc[record.item_key] = {
        item_key: record.item_key,
        name: record.name,
        bangla_name: record.bangla_name,
        category: record.category,
        tier: record.tier as PriceFood["tier"],
        unit: record.unit,
        unit_price_bdt: Number(record.unit_price_bdt),
        calories: Number(record.calories),
        protein: Number(record.protein),
        carbs: Number(record.carbs),
        fat: Number(record.fat),
      };
      return acc;
    }, {});
  } catch (err: any) {
    console.warn("Food price CSV unavailable, using embedded fallback prices:", err.message);
    return {};
  }
}

const FOOD_PRICES = loadFoodPrices();

function buildFallbackMealPlan(profile: any) {
  const budget = profile?.budgetPreference === "premium"
    ? "premium"
    : profile?.budgetPreference === "moderate"
      ? "moderate"
      : "budget";
  const hasAnemia = profile?.healthConditions?.includes("anemia");
  const hasDiabetes = profile?.healthConditions?.includes("diabetes");
  const isVeg = profile?.dietaryPreference === "vegetarian" || profile?.dietaryPreference === "vegan";

  const recipesByBudget: Record<string, any[]> = {
    budget: [
      { mealType: "breakfast", title: "Budget Ruti, Egg & Shak Breakfast", banglaName: "রুটি, ডিম ও শাক", items: [["atta_ruti", 2], ["egg", isVeg ? 0 : 1], ["lal_shak", 1]], preparations: ["Dry-fry ruti and keep oil minimal.", "Add shak to improve iron and fiber without raising cost."] },
      { mealType: "lunch", title: "Measured Rice, Dal & Seasonal Shak", banglaName: "মাপা ভাত, ডাল ও শাক", items: [["white_rice", 1], ["moshur_dal", 1], ["kolmi_shak", 1], ["mustard_oil", 1]], preparations: ["Keep rice measured and make dal/shak the filling part of the plate.", "Use only a small amount of mustard oil."] },
      { mealType: "snack", title: "Muri, Guava & Peanuts", banglaName: "মুড়ি, পেয়ারা ও বাদাম", items: [["muri", 1], ["guava", 1], ["peanut", 1]], preparations: ["Keep this sugar-free.", "Guava helps vitamin C intake and supports iron absorption."] },
      { mealType: "dinner", title: "Thin Dal Khichuri with Egg or Chhola", banglaName: "পাতলা ডাল খিচুড়ি ও ডিম/ছোলা", items: [["white_rice", 0.7], ["moshur_dal", 1], [isVeg ? "chhola" : "egg", 1], ["mixed_veg", 1]], preparations: ["Use more dal and vegetables than rice.", "Keep dinner lighter if lunch was rice-heavy."] },
    ],
    moderate: [
      { mealType: "breakfast", title: "Ruti, Egg Bhurji & Seasonal Vegetables", banglaName: "রুটি, ডিম ভুরজি ও সবজি", items: [["atta_ruti", 2], ["egg", isVeg ? 0 : 2], ["mixed_veg", 1], ["rice_bran_oil", 1]], preparations: ["Use onion, chili, and vegetables to make the egg more filling.", "Keep added salt low."] },
      { mealType: "lunch", title: "Red Rice, Rui Fish, Dal & Shak", banglaName: "লাল চাল, রুই মাছ, ডাল ও শাক", items: [["red_rice", 1], [isVeg ? "chhola" : "rui_fish", 1], ["moshur_dal", 1], ["lal_shak", 1]], preparations: ["Use red rice for extra fiber when available.", "Cook fish in light curry instead of deep frying."] },
      { mealType: "snack", title: "Tok Doi with Banana or Amra", banglaName: "টক দই ও ফল", items: [["tok_doi", isVeg ? 0 : 1], ["banana", 1], ["amra", 1]], preparations: ["Choose unsweetened tok doi.", "Keep tea away from iron-rich meals if anemia is a concern."] },
      { mealType: "dinner", title: "Vegetable Khichuri with Chicken or Chhola", banglaName: "সবজি খিচুড়ি ও মুরগি/ছোলা", items: [["red_rice", 0.7], ["moshur_dal", 1], [isVeg ? "chhola" : "chicken", 1], ["salad", 1]], preparations: ["Keep rice moderate and increase dal/vegetables.", "Add salad for volume without heavy calories."] },
    ],
    premium: [
      { mealType: "breakfast", title: "Oats, Tok Doi, Egg & Fruit Plate", banglaName: "ওটস, টক দই, ডিম ও ফল", items: [["oats", 1], ["tok_doi", isVeg ? 0 : 1], ["egg", isVeg ? 0 : 2], ["apple", 1], ["chia", 1]], preparations: ["Use unsweetened tok doi and fruit instead of sugar.", "This option gives higher protein and more variety."] },
      { mealType: "lunch", title: "Red Rice with Katla/Rui, Dal & Premium Greens", banglaName: "লাল চাল, মাছ, ডাল ও সবুজ সবজি", items: [["red_rice", 1], [isVeg ? "chhola" : "katla_fish", 1], ["moshur_dal", 1], ["broccoli", 1], ["salad", 1]], preparations: ["Keep the rice portion controlled even in premium mode.", "Use fish or chhola as the main protein."] },
      { mealType: "snack", title: "Fruit, Tok Doi & Nuts Bowl", banglaName: "ফল, টক দই ও বাদাম", items: [["tok_doi", isVeg ? 0 : 1], ["apple", 1], ["guava", 1], ["peanut", 1], ["chia", 1]], preparations: ["Keep it unsweetened.", "This is a higher-fiber snack with better micronutrient variety."] },
      { mealType: "dinner", title: "Lean Protein Dinner with Vegetables", banglaName: "লিন প্রোটিন ও সবজির ডিনার", items: [[isVeg ? "chhola" : "chicken", 1], ["moshur_dal", 1], ["broccoli", 1], ["salad", 1], ["rice_bran_oil", 1]], preparations: ["Keep dinner protein-forward and lighter on starch.", "Use vegetables and dal for fullness."] },
    ],
  };

  const makeMeal = (template: any) => {
    const chosen = template.items
      .filter(([, qty]: [string, number]) => qty > 0)
      .map(([key, qty]: [string, number]) => ({ food: FOOD_PRICES[key], qty }))
      .filter(({ food }: { food?: PriceFood }) => food);
    const totals = chosen.reduce((acc, { food, qty }: { food: PriceFood; qty: number }) => ({
      cost: acc.cost + food.unit_price_bdt * qty,
      calories: acc.calories + food.calories * qty,
      protein: acc.protein + food.protein * qty,
      carbs: acc.carbs + food.carbs * qty,
      fat: acc.fat + food.fat * qty,
    }), { cost: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });
    const minCost = Math.max(10, Math.round(totals.cost * 0.9));
    const maxCost = Math.round(totals.cost * 1.15);

    return {
      mealType: template.mealType,
      title: template.title,
      banglaName: template.banglaName,
      ingredients: chosen.map(({ food, qty }: { food: PriceFood; qty: number }) => `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${food.unit} ${food.name} (${food.bangla_name})`),
      estimatedCost: `${minCost}-${maxCost} BDT`,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      preparations: template.preparations,
    };
  };

  const meals = recipesByBudget[budget].map(makeMeal);
  const shoppingSet = new Set<string>();
  meals.forEach((meal: any) => meal.ingredients.forEach((ingredient: string) => shoppingSet.add(ingredient.replace(/^\d+(\.\d+)? [^ ]+ /, ""))));
  const budgetLabel = budget === "premium" ? "premium variety" : budget === "moderate" ? "moderate budget" : "budget-conscious";
  const healthAdvice = [
    `This ${budgetLabel} meal plan is selected from local Bangladesh food price data in data/bangladesh_food_prices.csv.`,
    hasDiabetes ? "Rice portions are kept measured and paired with dal/protein to reduce sharp glucose spikes." : "Rice and ruti portions are balanced with dal, protein, vegetables, and fruit.",
    hasAnemia ? "Iron-supportive foods like shak, dal, fish/egg/chhola, and vitamin C fruits are prioritized." : "Use seasonal vegetables and local fruits to keep micronutrients practical.",
  ].join(" ");

  return {
    dailyMealRecommendations: meals,
    dietaryAdvice: healthAdvice,
    groceryShoppingList: Array.from(shoppingSet).slice(0, 12),
  };
}

// 3. Personalized Meal Suggestion
app.post("/api/meal-recommendations", async (req, res) => {
  const { profile } = req.body;
  if (!profile) {
    return res.status(400).json({ error: "Providing a Health Profile is required to generate meal recommendations." });
  }

  if (!shouldUseGemini()) {
    // Generate lovely localized recommendations according to budget preference
    console.log("Serving local fallback meal plan...");
    const isBudget = profile.budgetPreference === 'budget';
    const mealRecs = [
      {
        mealType: "breakfast",
        title: "High Fiber Atta Ruti & Egg Scramble",
        banglaName: "ডিমসহ আটার লাল রুটি এবং সবজি",
        ingredients: [
          "2 whole wheat flour flatbread (atta ruti)",
          "1 farm egg (scrambled with negligible soybean oil, onions, and chillies)",
          "Mixed local seasonal vegetables (Papaya, Sweet Pumpkin, Sponge Gourd) steamed without excess oil"
        ],
        estimatedCost: isBudget ? "40-60 BDT" : "80-100 BDT",
        calories: 380,
        protein: 16,
        carbs: 48,
        fat: 12,
        preparations: [
          "Roll whole wheat dough thin and dry-fry on a clean pan without any oil.",
          "Use a tiny tablespoon of mustard oil to stir-fry the vegetables with zero table salt added afterwards."
        ]
      },
      {
        mealType: "lunch",
        title: "Traditional Healthy Fish Meal with Laal Bhaat",
        banglaName: "লাল চালের ভাত, রুই মাছ এবং শাক",
        ingredients: [
          "1 medium bowl of Red Rice (Laal Bhaat - 180g)",
          "1 piece of pan-seared Rui Maach with light turmeric and tomato curry",
          "1 side portion of Lal Shak or Kolmi Shak",
          "1 cup of thin yellow split peas soup (Moshur Dal)"
        ],
        estimatedCost: isBudget ? "65-90 BDT" : "120-160 BDT",
        calories: 510,
        protein: 28,
        carbs: 65,
        fat: 14,
        preparations: [
          "Use unpolished Red Rice to preserve crucial vitamin complex and raw dietary fiber.",
          "Lightly pan-sear the rui fish rather than deep burning in rancid cooking oils to retain heart-healthy omega-3 fats."
        ]
      },
      {
        mealType: "snack",
        title: "Nutritional Fresh Local Fruit Bowl",
        banglaName: "পেয়ারা ও আমড়া ফল",
        ingredients: [
          "1 medium fresh Guava (Peyara) or Hog Plum (Amra)",
          "1 small cup of light dry popped rice (Muri) with 5-6 domestic raw roasted nuts"
        ],
        estimatedCost: isBudget ? "15-25 BDT" : "30-50 BDT",
        calories: 140,
        protein: 3,
        carbs: 26,
        fat: 3,
        preparations: [
          "Excellent afternoon bite, highly rich in soluble vitamin C to facilitate nutritional iron absorption from lunch.",
          "Keep completely dry and sugar-free."
        ]
      },
      {
        mealType: "dinner",
        title: "Light Lentil Khichuri with Chicken and Salad",
        banglaName: "পাতলা সবজি খিচুড়ি ও মুরগি",
        ingredients: [
          "1 cup of high-protein Oats/Rice Lentil Khichuree with mixed papaya and pumpkin",
          "1 piece of skinless chicken breast curry cooked in mild spice broth",
          "Sliced cucumbers, tomatoes, and key lime"
        ],
        estimatedCost: isBudget ? "70-100 BDT" : "150-200 BDT",
        calories: 440,
        protein: 26,
        carbs: 52,
        fat: 13,
        preparations: [
          "Prepare using premium red lentils (Moshur) alongside short-grain aromatic rice or oats for slower carb absorption with generous vegetable toppings."
        ]
      }
    ];

    return res.json({
      dailyMealRecommendations: mealRecs,
      dietaryAdvice: "Ensure high-hydration limits: Drink at least 2.5 - 3 liters of pure filtered water daily, especially in tropical Bangladeshi heat. Utilize safe oils like cold-pressed mustard oil (Shorishar Tel) or rice bran oil in limited portions rather than high-refined commercial soybean oil.",
      groceryShoppingList: ["Laal Bhaat (Red Rice)", "Fresh Rui/Katla Maach", "Farm Eggs", "Whole Wheat Atta", "Lal Shak (Red Amaranth)", "Peyara (Guava)", "Cucumber", "Red Lentils"]
    });
  }

  try {
    const prompt = `Formulate a detailed, delicious, 1-day personalized healthy diet plan tailored to a ${profile.age}-year-old ${profile.gender} living in Bangladesh:
- Weight: ${profile.weight} kg, Height: ${profile.height} cm
- Activity: ${profile.activityLevel}
- Dietary restrictions/habits: ${profile.dietaryPreference}
- Budget Category: ${profile.budgetPreference} (crucial: if 'budget', recommend extremely economical local ingredients available in local bazars)
- Health Concerns: ${profile.healthConditions.join(", ")}

Generate exactly 4 entries covering Breakfast, Lunch, afternoon Snack, and Dinner.
Recommendations MUST use common, local, easily accessible items in Bangladesh (like ruti, khichuri, ruit fish, shoila bhorta, lal shak, muri, tok doi, local banana, guava, green chili, turmeric). Mention both English and Bangla sounding names.
Keep estimated cost realistic (express values in BDT - Bangladeshi Taka). Provide total protein, carbohydrates, calories, fat, and clear, simple preparation instructions.`;

    const response = await generateGeminiContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert culinary creator and nutritionist fluent in traditional Bangladeshi home cooking, local vegetable bazars, and affordable, healthy ingredients. You focus on delicious, highly accessible recommendations.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dailyMealRecommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  mealType: { type: Type.STRING, enum: ["breakfast", "lunch", "snack", "dinner"] },
                  title: { type: Type.STRING },
                  banglaName: { type: Type.STRING, description: "Bengali characters name e.g. লাল চালের ভাত" },
                  ingredients: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  estimatedCost: { type: Type.STRING, description: "Economical range in BDT e.g., '40-60 BDT'" },
                  calories: { type: Type.INTEGER },
                  protein: { type: Type.INTEGER, description: "Protein in grams" },
                  carbs: { type: Type.INTEGER, description: "Carbs in grams" },
                  fat: { type: Type.INTEGER, description: "Fat in grams" },
                  preparations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Step-by-step simple cooking hacks in English"
                  }
                },
                required: ["mealType", "title", "ingredients", "estimatedCost", "calories", "protein", "carbs", "fat", "preparations"]
              }
            },
            dietaryAdvice: { type: Type.STRING, description: "General guidelines on hydration, portion sizes, tea intake times, or salt intake limitations." },
            groceryShoppingList: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Items to purchase in local kacha bazar"
            }
          },
          required: ["dailyMealRecommendations", "dietaryAdvice", "groceryShoppingList"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return res.json(parsed);
  } catch (err: any) {
    console.error("Gemini meal planning failed, using local meal fallback:", err);
    return res.json(buildFallbackMealPlan(profile));
  }
});

// 4. Affordable Healthy Alternatives Generator
type HealthyAlternative = {
  unhealthyFood: string;
  healthierAlternative: string;
  banglaAlternativeName?: string;
  searchText?: string;
  whyBetter: string;
  localAffordability: string;
  approximatePriceDiff: string;
  nutritionComparison: {
    unhealthyCalories: number;
    healthyCalories: number;
    unhealthyBenefits?: string;
    healthyBenefits?: string;
  };
};

function displayFoodName(food: NutritionFood) {
  return food.food_name_bn ? `${food.food_name_en} (${food.food_name_bn})` : food.food_name_en;
}

function findNutritionFood(names: string[]) {
  for (const name of names) {
    const normalizedName = normalizeFoodText(name);
    const exact = NUTRITION_FOODS.find(food => normalizeFoodText(food.food_name_en) === normalizedName);
    if (exact) return exact;

    const aliasMatch = NUTRITION_FOODS.find(food => {
      const aliases = String(food.aliases || "").split("|").map(alias => normalizeFoodText(alias));
      return aliases.includes(normalizedName);
    });
    if (aliasMatch) return aliasMatch;
  }

  return undefined;
}

function isUnhealthySwapCandidate(food: NutritionFood) {
  const name = normalizeFoodText(`${food.food_name_en} ${food.aliases} ${food.category}`);
  const baseName = normalizeFoodText(food.food_name_en).replace(/^spicy\s+/, "");
  const hasBaseDuplicate = normalizeFoodText(food.food_name_en).startsWith("spicy ")
    && NUTRITION_FOODS.some(candidate => normalizeFoodText(candidate.food_name_en) === baseName);
  if (hasBaseDuplicate) return false;

  const unhealthyNamePattern = /(fried|fry|crispy|deep|paratha|porota|luchi|puri|biryani|biriyani|tehari|polao|rezala|burger|pizza|hot dog|roll|sandwich|kebab|wings|nugget|fries|momo|shawarma|chips|chanachur|biscuit|cookies|cake|cupcake|muffin|donut|brownie|wafer|jilapi|jalebi|roshogolla|laddu|kalojam|chomchom|payesh|firni|gulab|ice cream|custard|halwa|faluda|soft drink|energy drink|milk tea|juice|milkshake|sweet)/;
  if (unhealthyNamePattern.test(name)) return true;

  if (food.category === "fast_food" || food.category === "street_food" || food.category === "dessert") return true;
  if (food.category === "snack") {
    return /(chips|chanachur|biscuit|cookies|bar|fried|wafer|cake|muffin|donut|brownie|salted)/.test(name);
  }
  if (food.category === "drink") {
    return /(milk tea|soft drink|energy drink|juice|milkshake|faluda|sweet)/.test(name);
  }

  return false;
}

function pickHealthySwap(food: NutritionFood) {
  const name = normalizeFoodText(`${food.food_name_en} ${food.aliases}`);
  const category = food.category;

  if (/(egg|dim)/.test(name)) {
    return findNutritionFood(["boiled egg", "egg curry", "plain salad"]);
  }
  if (/(chicken|meat|beef|mutton|burger|kebab|roll|sandwich|nugget|wings)/.test(name)) {
    return findNutritionFood(["grilled chicken", "chicken soup", "rui fish curry", "masoor dal"]);
  }
  if (/(fish|shrimp|hilsha|rui|katla|pangash|tilapia|chingri)/.test(name)) {
    return findNutritionFood(["grilled fish", "rui fish curry", "plain salad"]);
  }
  if (/(biryani|biriyani|tehari|polao|fried rice|noodle|pasta)/.test(name) || category === "grain") {
    return findNutritionFood(["khichuri", "brown rice", "white rice", "plain salad"]);
  }
  if (/(paratha|porota|luchi|puri|naan|bread|bun)/.test(name) || category === "bread") {
    return findNutritionFood(["roti", "chapati", "whole wheat bread", "plain salad"]);
  }
  if (category === "dessert" || /(sweet|jilapi|jalebi|roshogolla|laddu|cake|donut|ice cream|halwa|payesh|firni|faluda)/.test(name)) {
    return findNutritionFood(["guava", "banana", "papaya", "mishti doi"]);
  }
  if (category === "drink" || /(tea|coffee|soft drink|juice|lassi|borhani|milkshake|energy drink)/.test(name)) {
    return findNutritionFood(["black tea", "green tea", "coconut water", "lemon juice"]);
  }
  if (category === "snack" || category === "street_food" || category === "fast_food") {
    return findNutritionFood(["boot dal", "guava", "cucumber", "plain salad"]);
  }

  return findNutritionFood(["plain salad", "boot dal", "guava", "cucumber"]);
}

function describeUnhealthyFood(food: NutritionFood) {
  const flags = [];
  if (food.calories >= 280) flags.push("calorie dense");
  if (food.fat >= 18) flags.push("high fat");
  if (food.sugar >= 18) flags.push("high sugar");
  if (food.sodium >= 650) flags.push("high sodium");
  if (/(fried|fry|crispy|paratha|porota|burger|pizza|chips|biscuit|sweet|dessert|drink)/.test(normalizeFoodText(`${food.food_name_en} ${food.aliases}`))) {
    flags.push("easy to overeat");
  }
  return flags.length > 0 ? `${flags.slice(0, 3).join(", ")}.` : "Higher-risk everyday choice for frequent intake.";
}

function describeHealthyFood(food: NutritionFood) {
  const benefits = [];
  if (["fruit", "vegetable"].includes(food.category)) benefits.push("more fiber and micronutrients");
  if (["lentil", "fish", "meat", "main_meal"].includes(food.category)) benefits.push("better protein support");
  if (food.sugar < 8) benefits.push("lower sugar load");
  if (food.fat < 12) benefits.push("lighter fat profile");
  return benefits.length > 0 ? `${benefits.slice(0, 3).join(", ")}.` : "More balanced local option for routine meals.";
}

function buildCsvHealthyAlternatives(): HealthyAlternative[] {
  const generated: HealthyAlternative[] = [];
  const seen = new Set<string>();

  NUTRITION_FOODS.forEach(food => {
    if (!isUnhealthySwapCandidate(food)) return;

    const swap = pickHealthySwap(food);
    if (!swap || swap.food_id === food.food_id) return;

    const key = normalizeFoodText(food.food_name_en);
    if (seen.has(key)) return;
    seen.add(key);

    const calorieDelta = Math.round(food.calories - swap.calories);
    generated.push({
      unhealthyFood: displayFoodName(food),
      healthierAlternative: displayFoodName(swap),
      banglaAlternativeName: swap.food_name_bn || "",
      searchText: `${food.food_name_en} ${food.food_name_bn} ${food.aliases} ${food.category}`,
      whyBetter: `${displayFoodName(swap)} is a more routine-friendly Bangladeshi swap for ${displayFoodName(food)} because it reduces the main risk pattern in the original item while keeping the choice locally available and familiar.`,
      localAffordability: "Common in local bazars, home kitchens, restaurants, or everyday Bangladeshi meal settings.",
      approximatePriceDiff: calorieDelta > 20
        ? `Usually similar or cheaper, and saves about ${calorieDelta} calories per serving.`
        : "Usually comparable cost; the main win is a cleaner nutrient profile.",
      nutritionComparison: {
        unhealthyCalories: Math.round(food.calories),
        healthyCalories: Math.round(swap.calories),
        unhealthyBenefits: describeUnhealthyFood(food),
        healthyBenefits: describeHealthyFood(swap),
      },
    });
  });

  return generated.sort((a, b) => b.nutritionComparison.unhealthyCalories - a.nutritionComparison.unhealthyCalories);
}

function getHealthyAlternatives(customQuery?: string): HealthyAlternative[] {
  const allAlternatives = [...FALLBACK_ALTERNATIVES, ...buildCsvHealthyAlternatives()];
  const deduped = allAlternatives.filter((item, index, array) => {
    const key = normalizeFoodText(item.unhealthyFood);
    return array.findIndex(candidate => normalizeFoodText(candidate.unhealthyFood) === key) === index;
  });

  const query = normalizeFoodText(customQuery || "").replace(/\bbiriyani\b/g, "biryani");
  if (!query) return deduped;

  return deduped.filter(item => {
    const haystack = normalizeFoodText([
      item.unhealthyFood,
      item.healthierAlternative,
      item.banglaAlternativeName || "",
      item.searchText || "",
      item.whyBetter,
      item.nutritionComparison.unhealthyBenefits || "",
      item.nutritionComparison.healthyBenefits || "",
    ].join(" "));
    return haystack.includes(query);
  });
}

app.post("/api/healthy-alternatives", async (req, res) => {
  const { customQuery } = req.body;
  const localAlternatives = getHealthyAlternatives(customQuery);

  if (!shouldUseGemini() || localAlternatives.length > 0) {
    console.log("Serving CSV-backed local healthy alternatives...");
    return res.json({ alternatives: localAlternatives });
  }

  try {
    const prompt = customQuery 
      ? `Give me healthy local alternatives to this user query: "${customQuery}" in Bangladesh.`
      : "Provide a comprehensive index of common unhealthy Bangladeshi street food snacks or daily starches (like Paratha, Singara, Puri, Sweet Rosgulla, Piyaju, sweetened road milk tea, refined white rice), alongside much healthier, budget-friendly and accessible local alternatives.";

    const response = await generateGeminiContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a creative food-hacking expert in Dhaka, Bangladesh. You specialize in converting calorie-intensive oily foods and highly sweetened delicacies to local nutritional superfoods (such as muri, chhola boot, peyara, attar ruti, laal bhaat, tok doi, wood-pressed oils) seamlessly.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  unhealthyFood: { type: Type.STRING, description: "The unhealthy traditional choice (e.g. 'Stall-bought Beguni')" },
                  healthierAlternative: { type: Type.STRING, description: "Perfect, accessible alternative (e.g. 'Air-fried/roasted Beguni or Roasted Chickpeas')" },
                  banglaAlternativeName: { type: Type.STRING, description: "Bangla writing word name" },
                  whyBetter: { type: Type.STRING, description: "Nutritional rationale comparison detailing glycemic spike impacts, fats, or sodium" },
                  localAffordability: { type: Type.STRING, description: "Cost or availability comment, localized" },
                  approximatePriceDiff: { type: Type.STRING, description: "Price delta in BDT e.g., 'Saves 20 BDT per portion'" },
                  nutritionComparison: {
                    type: Type.OBJECT,
                    properties: {
                      unhealthyCalories: { type: Type.INTEGER },
                      healthyCalories: { type: Type.INTEGER },
                      unhealthyBenefits: { type: Type.STRING },
                      healthyBenefits: { type: Type.STRING }
                    },
                    required: ["unhealthyCalories", "healthyCalories"]
                  }
                },
                required: ["unhealthyFood", "healthierAlternative", "whyBetter", "localAffordability", "approximatePriceDiff", "nutritionComparison"]
              }
            }
          },
          required: ["alternatives"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return res.json(parsed);
  } catch (err: any) {
    console.error("Gemini healthy alternatives generation failed:", err);
    return res.json({ alternatives: localAlternatives.length > 0 ? localAlternatives : getHealthyAlternatives() });
  }
});

function buildFallbackTrainingPlan(profile: any, trainingGoal: string, trainingContext: string, language = "en") {
  const goal = `${trainingGoal || "general fitness"} ${trainingContext || ""}`.toLowerCase();
  const wantsMuscle = /(muscle|muscular|bulk|strength|masculin|masculine|bodybuild|gain|stronger|মাসল|পেশি|পেশী|শক্ত|শক্তি|বডি|জিম)/.test(goal);
  const wantsSlim = /(slim|fat loss|lose weight|weight loss|cut|lean|belly|স্লিম|মেদ|ভুঁড়ি|ভুড়ি|ওজন কম|চিকন|ফ্যাট)/.test(goal);
  const hasHypertension = profile?.healthConditions?.includes("hypertension");
  const hasDiabetes = profile?.healthConditions?.includes("diabetes");
  const isBeginner = profile?.activityLevel === "sedentary" || profile?.activityLevel === "lightly_active";
  const wantsBangla = language === "bn";

  const planType = wantsMuscle ? "muscle gain and strength" : wantsSlim ? "fat loss and lean conditioning" : "balanced fitness";
  const planTypeBn = wantsMuscle ? "মাসল গেইন আর শক্তি বাড়ানো" : wantsSlim ? "ফ্যাট কমানো আর লিন ফিটনেস" : "ব্যালান্সড ফিটনেস";
  const activityLevel = profile?.activityLevel?.replace("_", " ") || "unknown";
  const genderBn = profile?.gender === "male" ? "পুরুষ" : profile?.gender === "female" ? "নারী" : "ব্যবহারকারী";
  const activityBn: Record<string, string> = {
    sedentary: "কম নড়াচড়া",
    lightly_active: "হালকা অ্যাক্টিভ",
    moderately_active: "মাঝারি অ্যাক্টিভ",
    very_active: "খুব অ্যাক্টিভ",
  };
  const activityLevelBn = activityBn[profile?.activityLevel] || "যেটা দেওয়া হয়েছে";
  const strengthExercises = wantsMuscle
    ? (wantsBangla
        ? [
            ["স্কোয়াট বা চেয়ার স্কোয়াট", "4", "৮-১২ বার", "৭৫ সেকেন্ড", "বডিওয়েট সহজ লাগলে ব্যাগে বই ভরে ধীরে ধীরে ওজন বাড়ান।"],
            ["পুশ-আপ বা ইনক্লাইন পুশ-আপ", "4", "৬-১২ বার", "৭৫ সেকেন্ড", "কাঁধ থেকে পা পর্যন্ত শরীর সোজা রাখবেন।"],
            ["ব্যাকপ্যাক রো", "4", "১০-১২ বার", "৭৫ সেকেন্ড", "কনুই পেছনে টানুন, কাঁধের ব্লেড হালকা চেপে ধরুন।"],
            ["গ্লুট ব্রিজ", "3", "১২-১৫ বার", "৬০ সেকেন্ড", "উপরে গিয়ে এক সেকেন্ড থামবেন।"],
          ]
        : [
            ["Squat or chair squat", "4", "8-12 reps", "75 sec", "Use a backpack with books when bodyweight feels easy."],
            ["Push-up or incline push-up", "4", "6-12 reps", "75 sec", "Keep a straight line from shoulder to ankle."],
            ["Backpack row", "4", "10-12 reps", "75 sec", "Pull elbows back and squeeze shoulder blades."],
            ["Glute bridge", "3", "12-15 reps", "60 sec", "Pause at the top for one second."],
          ])
    : (wantsBangla
        ? [
            ["দ্রুত হাঁটার ইন্টারভ্যাল", "6", "২ মিনিট দ্রুত + ১ মিনিট সহজ", "৩০ সেকেন্ড", "গতি এমন রাখুন যেন কষ্ট হয়, কিন্তু কথা বলা যায়।"],
            ["বডিওয়েট স্কোয়াট", "3", "১২-১৫ বার", "৪৫ সেকেন্ড", "হিপ পেছনে নিন, হাঁটু আরামদায়ক রাখুন।"],
            ["সিঁড়িতে স্টেপ-আপ", "3", "প্রতি পায়ে ১০ বার", "৪৫ সেকেন্ড", "প্রয়োজন হলে রেলিং ধরুন।"],
            ["প্ল্যাঙ্ক", "3", "২০-৪০ সেকেন্ড", "৪৫ সেকেন্ড", "কোমর নিচে ঝুলে গেলে থেমে যাবেন।"],
          ]
        : [
            ["Brisk walk intervals", "6", "2 min fast + 1 min easy", "30 sec", "Keep pace challenging but conversational."],
            ["Bodyweight squat", "3", "12-15 reps", "45 sec", "Sit hips back and keep knees comfortable."],
            ["Step-up on stairs", "3", "10 reps each leg", "45 sec", "Use a railing if needed."],
            ["Plank", "3", "20-40 sec", "45 sec", "Stop before lower back sags."],
          ]);

  const weeklyPlan = [
    {
      dayLabel: wantsBangla ? "দিন ১" : "Day 1",
      focus: wantsBangla
        ? wantsMuscle ? "পুরো শরীরের শক্তির বেস" : wantsSlim ? "লো-ইমপ্যাক্ট ফ্যাট কমানোর কন্ডিশনিং" : "পুরো শরীরের মুভমেন্ট"
        : wantsMuscle ? "Full body strength foundation" : wantsSlim ? "Low-impact fat-loss conditioning" : "Full body movement",
      durationMinutes: isBeginner ? 35 : 45,
      warmup: wantsBangla ? ["৫ মিনিট সহজ হাঁটা", "আর্ম সার্কেল আর হিপ সার্কেল", "১০টা ধীরে বডিওয়েট স্কোয়াট"] : ["5 minutes easy walk", "Arm circles and hip circles", "10 slow bodyweight squats"],
      exercises: strengthExercises.map(([name, sets, repsOrTime, rest, notes]) => ({ name, sets, repsOrTime, rest, notes })),
      cooldown: wantsBangla ? ["৫ মিনিট ধীরে হাঁটা", "ক্যাফ স্ট্রেচ", "চেস্ট আর শোল্ডার স্ট্রেচ"] : ["5 minutes slow walk", "Calf stretch", "Chest and shoulder stretch"],
    },
    {
      dayLabel: wantsBangla ? "দিন ২" : "Day 2",
      focus: wantsBangla ? "কার্ডিও, মবিলিটি আর কোর" : "Cardio, mobility, and core",
      durationMinutes: isBeginner ? 30 : 40,
      warmup: wantsBangla ? ["৫ মিনিট সহজ হাঁটা", "অ্যাঙ্কেল রোল", "এক জায়গায় হালকা মার্চ"] : ["5 minutes easy walk", "Ankle rolls", "Gentle marching in place"],
      exercises: wantsBangla ? [
        { name: "দ্রুত হাঁটা", sets: "1", repsOrTime: isBeginner ? "২০ মিনিট" : "৩০ মিনিট", rest: "প্রয়োজনমতো", notes: "সকালের নাস্তা বা দুপুরের খাবারের পর, আবহাওয়া ঠান্ডা থাকলে ভালো।" },
        { name: "ডেড বাগ", sets: "3", repsOrTime: "প্রতি পাশে ৮-১০ বার", rest: "৪৫ সেকেন্ড", notes: "নিচের পিঠ মাটির দিকে হালকা চেপে রাখুন।" },
        { name: "সাইড প্ল্যাঙ্ক", sets: "2", repsOrTime: "প্রতি পাশে ১৫-৩০ সেকেন্ড", rest: "৪৫ সেকেন্ড", notes: "প্রয়োজন হলে হাঁটু মাটিতে রেখে করবেন।" },
      ] : [
        { name: "Brisk walking", sets: "1", repsOrTime: isBeginner ? "20 minutes" : "30 minutes", rest: "as needed", notes: "Best after breakfast or lunch when weather is cooler." },
        { name: "Dead bug", sets: "3", repsOrTime: "8-10 reps each side", rest: "45 sec", notes: "Keep lower back gently pressed down." },
        { name: "Side plank", sets: "2", repsOrTime: "15-30 sec each side", rest: "45 sec", notes: "Use knees down if needed." },
      ],
      cooldown: wantsBangla ? ["হ্যামস্ট্রিং স্ট্রেচ", "২ মিনিট গভীর শ্বাস"] : ["Hamstring stretch", "Deep breathing for 2 minutes"],
    },
    {
      dayLabel: wantsBangla ? "দিন ৩" : "Day 3",
      focus: wantsBangla ? wantsMuscle ? "আপার বডি আর পোস্টার" : "মেটাবলিক সার্কিট" : wantsMuscle ? "Upper body and posture" : "Metabolic circuit",
      durationMinutes: isBeginner ? 35 : 45,
      warmup: wantsBangla ? ["শোল্ডার রোল", "ওয়াল স্লাইড", "৫ মিনিট সহজ হাঁটা"] : ["Shoulder rolls", "Wall slides", "5 minutes easy walk"],
      exercises: wantsBangla ? [
        { name: "ইনক্লাইন পুশ-আপ", sets: "3-4", repsOrTime: "৮-১২ বার", rest: "৬০ সেকেন্ড", notes: "টেবিল বা দেয়ালের উচ্চতা এমন নিন যেন নিয়ন্ত্রণ রেখে শেষ করতে পারেন।" },
        { name: "ব্যাকপ্যাক রো", sets: "3-4", repsOrTime: "১০-১২ বার", rest: "৬০ সেকেন্ড", notes: "ধীরে ধীরে বোতল বা বই যোগ করে প্রোগ্রেশন করুন।" },
        { name: "রিভার্স লাঞ্জ বা স্প্লিট স্কোয়াট", sets: "3", repsOrTime: "প্রতি পায়ে ৮-১০ বার", rest: "৬০ সেকেন্ড", notes: "ব্যালান্সের জন্য দেয়াল ধরতে পারেন।" },
        { name: "স্লো টেম্পো মাউন্টেন ক্লাইম্বার", sets: "3", repsOrTime: "২০-৩০ সেকেন্ড", rest: "৬০ সেকেন্ড", notes: hasHypertension ? "গতি মাঝারি রাখুন; শ্বাস আটকে রাখবেন না।" : "মুভমেন্ট স্মুথ রাখুন, খুব তাড়াহুড়া না।" },
      ] : [
        { name: "Incline push-up", sets: "3-4", repsOrTime: "8-12 reps", rest: "60 sec", notes: "Use table or wall height that lets you finish with control." },
        { name: "Backpack row", sets: "3-4", repsOrTime: "10-12 reps", rest: "60 sec", notes: "Add bottles/books gradually for progression." },
        { name: "Reverse lunge or split squat", sets: "3", repsOrTime: "8-10 reps each leg", rest: "60 sec", notes: "Hold a wall for balance." },
        { name: "Mountain climber slow tempo", sets: "3", repsOrTime: "20-30 sec", rest: "60 sec", notes: hasHypertension ? "Keep pace moderate; do not hold breath." : "Move smoothly, not wildly." },
      ],
      cooldown: wantsBangla ? ["কোয়াড স্ট্রেচ", "ল্যাট স্ট্রেচ", "ধীরে শ্বাস নেওয়া"] : ["Quad stretch", "Lat stretch", "Slow breathing"],
    },
    {
      dayLabel: wantsBangla ? "দিন ৪" : "Day 4",
      focus: wantsBangla ? "রিকভারি হাঁটা আর ফ্লেক্সিবিলিটি" : "Recovery walk and flexibility",
      durationMinutes: 25,
      warmup: wantsBangla ? ["৩ মিনিট সহজ হাঁটা"] : ["Easy walk for 3 minutes"],
      exercises: wantsBangla ? [
        { name: "আরামদায়ক হাঁটা", sets: "1", repsOrTime: "১৫-২০ মিনিট", rest: "নেই", notes: "এটা সহজ রাখুন; রিকভারি ধারাবাহিকতা ধরে রাখতে সাহায্য করে।" },
        { name: "মবিলিটি ফ্লো", sets: "2", repsOrTime: "৫ মিনিট", rest: "নেই", notes: "ক্যাট-কাউ, হিপ ফ্লেক্সর স্ট্রেচ, শোল্ডার ওপেনার।" },
      ] : [
        { name: "Comfortable walk", sets: "1", repsOrTime: "15-20 minutes", rest: "none", notes: "Keep this easy; recovery helps consistency." },
        { name: "Mobility flow", sets: "2", repsOrTime: "5 minutes", rest: "none", notes: "Cat-cow, hip flexor stretch, shoulder opener." },
      ],
      cooldown: wantsBangla ? ["হালকা স্ট্রেচিং", "পানি পান করুন"] : ["Light stretching", "Hydrate with water"],
    },
    {
      dayLabel: wantsBangla ? "দিন ৫" : "Day 5",
      focus: wantsBangla ? wantsMuscle ? "স্ট্রেংথ প্রোগ্রেশন ডে" : "কন্ডিশনিং আর স্ট্রেংথ" : wantsMuscle ? "Strength progression day" : "Conditioning plus strength",
      durationMinutes: isBeginner ? 35 : 45,
      warmup: wantsBangla ? ["৫ মিনিট সহজ হাঁটা", "ডাইনামিক লেগ সুইং", "১০টা গ্লুট ব্রিজ"] : ["5 minutes easy walk", "Dynamic leg swings", "10 glute bridges"],
      exercises: wantsBangla ? [
        { name: "স্কোয়াট প্যাটার্ন", sets: "4", repsOrTime: wantsMuscle ? "৮-১০ বার" : "১২-১৫ বার", rest: wantsMuscle ? "৭৫ সেকেন্ড" : "৪৫ সেকেন্ড", notes: wantsMuscle ? "ফর্ম ঠিক থাকলে ব্যাকপ্যাকে ওজন যোগ করুন।" : "গতি নিয়ন্ত্রণে রাখুন।" },
        { name: "হিপ হিঞ্জ বা ব্যাকপ্যাক ডেডলিফট", sets: "3", repsOrTime: "১০-১২ বার", rest: "৬০ সেকেন্ড", notes: "হিপ পেছনে নিন; পিঠ নিউট্রাল রাখুন।" },
        { name: "পুশ-আপ ভ্যারিয়েশন", sets: "3", repsOrTime: "ভালো ফর্মে যত পারেন, তার চেয়ে ২ বার কম", rest: "৬০ সেকেন্ড", notes: "ফর্ম ভাঙার আগেই থামবেন।" },
        { name: "দ্রুত হাঁটা ফিনিশার", sets: "1", repsOrTime: wantsSlim ? "১০ মিনিট" : "৫ মিনিট", rest: "নেই", notes: "নিরাপদ রাস্তা বা সিঁড়ির ল্যান্ডিং ব্যবহার করুন।" },
      ] : [
        { name: "Squat pattern", sets: "4", repsOrTime: wantsMuscle ? "8-10 reps" : "12-15 reps", rest: wantsMuscle ? "75 sec" : "45 sec", notes: wantsMuscle ? "Add backpack load if form is strong." : "Keep tempo steady." },
        { name: "Hip hinge or backpack deadlift", sets: "3", repsOrTime: "10-12 reps", rest: "60 sec", notes: "Push hips back; keep back neutral." },
        { name: "Push-up variation", sets: "3", repsOrTime: "max clean reps minus 2", rest: "60 sec", notes: "Stop before form breaks." },
        { name: "Fast walk finisher", sets: "1", repsOrTime: wantsSlim ? "10 minutes" : "5 minutes", rest: "none", notes: "Use a safe route or stairs landing." },
      ],
      cooldown: wantsBangla ? ["ধীরে হাঁটা", "লোয়ার-বডি স্ট্রেচ"] : ["Slow walk", "Lower-body stretch"],
    },
  ];

  if (wantsBangla) {
    return {
      goalSummary: `ভাই, Tagra Bhai আছে। এই প্ল্যানটা ${profile?.age} বছর বয়সী ${genderBn} ইউজারের জন্য ${planTypeBn} লক্ষ্য করে বানানো। আপনার নড়াচড়া এখন ${activityLevelBn}; তাই প্ল্যানটা বাস্তবসম্মত, বাসায় করা যায়, আর ধীরে ধীরে অভ্যাস বানানোর মতো করে সাজানো।`,
      safetyNotes: [
        hasHypertension ? "শ্বাস আটকে রাখবেন না, আর একদম জোরে স্প্রিন্ট এড়িয়ে চলুন; চাপ নিয়ন্ত্রণে রাখুন।" : "প্রতি সেটে নিয়মিতভাবে শ্বাস নেবেন; শ্বাস আটকে রাখবেন না।",
        hasDiabetes ? "গ্লুকোজ কমে যাওয়ার প্রবণতা থাকলে কাছে ছোট একটা স্ন্যাক রাখুন, আর একদম খালি পেটে ট্রেনিং করবেন না।" : "বুকে ব্যথা, মাথা ঘোরা, বা অস্বাভাবিক শ্বাসকষ্ট হলে সাথে সাথে থামবেন।",
        "ধীরে এগোবেন ভাই: আগে রিপ বাড়ান, তারপর ব্যাকপ্যাকে ওজন বা অতিরিক্ত সেট যোগ করুন। দেখানোর জন্য বেশি ওজন নেওয়া যাবে না।",
      ],
      weeklyPlan,
      progressionAdvice: wantsMuscle
        ? "ভাই, মাসল গেইনের জন্য প্রতি সপ্তাহে ১-২টা করে রিপ বাড়ান। যখন নির্ধারিত সংখ্যার উপরের দিকটা সহজ লাগবে, তখন ব্যাকপ্যাকে অল্প ওজন যোগ করবেন। ডিম, মাছ, ডাল, মুরগি, দুধ বা ছোলা থেকে প্রোটিন ঠিক রাখবেন। ধীরে এগোলেও এগোনোই আসল।"
        : wantsSlim
          ? "ভাই, স্লিম হওয়ার জন্য প্রতিদিন হাঁটা consistent রাখুন আর weekly movement ধীরে ধীরে বাড়ান। ভাত মেপে খান, ডাল-শাক রাখুন, আর ভাজাপোড়া কমান—না খেয়ে থাকা লাগবে না।"
          : "ভাই, ব্যালান্সড ফিটনেসের জন্য সপ্তাহে তিন দিন শক্তির ব্যায়াম আর দুই দিন হাঁটা/শরীর নমনীয় রাখার ব্যায়াম রাখুন। ঘুম আর শরীরের বিশ্রাম ভালো থাকলেই শুধু ব্যায়ামের পরিমাণ বাড়াবেন।",
      recoveryAdvice: "ভাই, সম্ভব হলে ৭-৮ ঘণ্টা ঘুমাবেন, পানি ঠিকমতো খাবেন, আর জয়েন্টে ব্যথা থাকলে একদিন পুরো বিশ্রাম নেবেন। কষ্ট করবেন, কিন্তু বুদ্ধি করে শরীরকে ফিরে আসার সময় দেবেন। এটা ব্যায়ামের সাধারণ পরামর্শ, ডাক্তারি রোগ নির্ণয় না।",
    };
  }

  return {
    goalSummary: `Bhai, Tagra Bhai got you. This plan targets ${planType} for a ${profile?.age}-year-old ${profile?.gender} with ${activityLevel} activity level. We will keep it practical, home-friendly, and steady so you can build the habit without needing a fancy gym.`,
    safetyNotes: [
      hasHypertension ? "Avoid breath-holding and all-out sprints; keep effort controlled." : "Breathe steadily during each set; do not hold your breath.",
      hasDiabetes ? "Keep a small snack available and avoid training on an empty stomach if glucose tends to drop." : "Stop if you feel chest pain, dizziness, or unusual shortness of breath.",
      "Progress slowly: add reps first, then add backpack weight or extra sets. No ego lifting, bhai.",
    ],
    weeklyPlan,
    progressionAdvice: wantsMuscle
      ? "Bhai, for muscle gain, add 1-2 reps each week until the top of the range feels easy, then add a small backpack load. Eat enough protein from egg, fish, dal, chicken, milk, or chhola. Slow progress is still progress."
      : wantsSlim
        ? "Bhai, for slimming, keep daily walking consistent and increase total weekly movement gradually. Keep rice portions measured, add dal/shak, and reduce fried snacks without starving yourself."
        : "Bhai, for balanced fitness, keep three strength days and two walking/mobility days each week. Increase volume only when recovery and sleep feel good.",
    recoveryAdvice: "Bhai, sleep 7-8 hours when possible, drink enough water, and take one full rest day if joints feel sore. Train hard, but recover smart. This is fitness guidance, not medical diagnosis.",
  };
}

app.post("/api/training-plan", async (req, res) => {
  const { profile, trainingGoal, trainingContext, language = "en" } = req.body;
  if (!profile) {
    return res.status(400).json({ error: "Health profile is required to generate a training plan." });
  }

  if (!shouldUseGemini()) {
    return res.json(buildFallbackTrainingPlan(profile, trainingGoal, trainingContext, language));
  }

  try {
    const normalizedTrainingGoal = `${trainingGoal || ""} ${trainingContext || ""}`.toLowerCase();
    const wantsMuscle = /(muscle|muscular|bulk|strength|masculin|masculine|bodybuild|gain|stronger|মাসল|পেশি|পেশী|শক্ত|শক্তি|বডি|জিম)/.test(normalizedTrainingGoal);
    const wantsSlim = /(slim|fat loss|lose weight|weight loss|cut|lean|belly|স্লিম|মেদ|ভুঁড়ি|ভুড়ি|ওজন কম|চিকন|ফ্যাট)/.test(normalizedTrainingGoal);
    const detectedGoalCategory = wantsMuscle ? "muscle_gain_strength" : wantsSlim ? "fat_loss_slimming" : "balanced_fitness";
    const prompt = `Create a personalized daily physical training plan for this user in Bangladesh.
Profile: ${JSON.stringify(profile)}
Training goal: ${trainingGoal || "general fitness"}
Extra needs or limitations: ${trainingContext || "none"}
Detected goal category: ${detectedGoalCategory}
Response language: ${language === "bn" ? "Bengali/Bangla. Use natural Bangladeshi Bengali script for every user-facing field, including dayLabel, focus, warmup, exercise names, repsOrTime, rest, notes, cooldown, safetyNotes, progressionAdvice, and recoveryAdvice. Keep the persona name Tagra Bhai in English. Avoid English sentences in Bengali mode." : "English."}

Interpret goals like "get masculine", "muscle", "muscular", "bulk", "strength", "মাসল", "পেশি", "পেশী", "শক্তি", or "বডি" as muscle gain/strength training. Interpret "slim", "fat loss", "lose belly", "weight loss", "স্লিম", "মেদ", "ভুঁড়ি", "ওজন কম", or "চিকন" as fat loss and conditioning. The detected goal category above should be treated as authoritative if the user phrasing is mixed-language.
Use mostly home or low-cost exercises suitable for Bangladesh unless the user asks for gym. Respect age, BMI, activity level, and health conditions. Avoid unsafe medical claims.
Coach persona: Tagra Bhai, a warm Bangladeshi boro bhai. Sound affectionate, motivating, practical, and lightly conversational in goalSummary, exercise notes, progressionAdvice, recoveryAdvice, and safetyNotes. Do not insult, shame, or overpromise. If the user asks for muscular/masculine, focus on strength, muscle gain, consistency, and food support. Keep the JSON structure exactly valid.`;

    const response = await generateGeminiContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: language === "bn"
          ? "You are Tagra Bhai, a careful Bangladeshi boro-bhai fitness coach. Generate safe, practical, goal-specific physical training plans in natural Bangladeshi Bengali while keeping the response as valid JSON."
          : "You are Tagra Bhai, a careful Bangladeshi boro-bhai fitness coach. Generate safe, practical, goal-specific physical training plans with warm, affectionate, motivating advice while keeping the response as valid JSON.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goalSummary: { type: Type.STRING },
            safetyNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            weeklyPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayLabel: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                  warmup: { type: Type.ARRAY, items: { type: Type.STRING } },
                  exercises: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        sets: { type: Type.STRING },
                        repsOrTime: { type: Type.STRING },
                        rest: { type: Type.STRING },
                        notes: { type: Type.STRING },
                      },
                      required: ["name", "sets", "repsOrTime", "rest", "notes"],
                    },
                  },
                  cooldown: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["dayLabel", "focus", "durationMinutes", "warmup", "exercises", "cooldown"],
              },
            },
            progressionAdvice: { type: Type.STRING },
            recoveryAdvice: { type: Type.STRING },
          },
          required: ["goalSummary", "safetyNotes", "weeklyPlan", "progressionAdvice", "recoveryAdvice"],
        },
      },
    });

    return res.json(JSON.parse(response.text.trim()));
  } catch (err: any) {
    console.error("Training plan generation failed:", err);
    return res.json(buildFallbackTrainingPlan(profile, trainingGoal, trainingContext, language));
  }
});

// Serve frontend assets
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("NutriBD AI: Vite middleware mounted for development mode.");
  })();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`NutriBD AI Full Stack Server listening on http://0.0.0.0:${PORT}`);
});
