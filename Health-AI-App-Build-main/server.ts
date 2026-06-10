import express from "express";
import path from "path";
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
  { id: "9", name: "Red Rice (Laal Bhaat)", portion: "1 plate (200g)", calories: 230, carbs: 48, protein: 6.0, fat: 1.2, sodium: 4, sugar: 0.1, iron: 1.8 }
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
  const alerts: Array<{
    title: string;
    severity: "low" | "medium" | "high";
    explanation: string;
    actionableSteps: string[];
  }> = [];
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

  if (profile.healthConditions.includes('diabetes') || totalCarbs > 70 || totalSugar > 18) {
    alerts.push({
      title: "Carbohydrate Load and Glucose Spike Risk",
      severity: profile.healthConditions.includes('diabetes') ? "high" : "medium",
      explanation: `Your logged meal has about ${Math.round(totalCarbs)}g carbohydrates and ${Math.round(totalSugar)}g sugar, mostly from refined flour, rice, or sweetened tea patterns common in Bangladesh. This can create sharp post-meal glucose swings, especially when the meal has limited fiber-rich shak, dal, or whole grains.`,
      actionableSteps: [
        "Keep rice to a measured bowl and add dal plus seasonal shak before taking a second serving.",
        "Replace sweetened milk tea with unsweetened lal cha, ginger tea, or lightly sweetened tea.",
        "Choose atta ruti or laal bhaat more often than paratha, white rice, or other refined starches."
      ]
    });
  }

  if (totalFat > 18 || /(fried|paratha|porota|singara|puri|bhaji|rezala)/.test(foodNames)) {
    alerts.push({
      title: "Fried Oil and Saturated Fat Burden",
      severity: totalFat > 30 || profile.healthConditions.includes('cholesterol') ? "high" : "medium",
      explanation: `The current plate contains about ${Math.round(totalFat)}g fat and includes fried or oil-heavy foods. Reheated soybean oil, paratha, bhaji, and street snacks can raise calorie density quickly and may worsen cholesterol or heart-risk patterns over time.`,
      actionableSteps: [
        "Swap oil-fried paratha for dry atta ruti or lightly brushed ruti most weekdays.",
        "Cook bhaji with a measured teaspoon of mustard or rice-bran oil instead of free-pouring oil.",
        "Add cucumber, tomato, or lemon salad beside oily foods to increase volume without adding calories."
      ]
    });
  }

  if (profile.healthConditions.includes('hypertension') || totalSodium > 500) {
    alerts.push({
      title: "Sodium and Blood Pressure Watch",
      severity: profile.healthConditions.includes('hypertension') || totalSodium > 1500 ? "high" : "medium",
      explanation: `This log contains around ${Math.round(totalSodium)}mg sodium before any added table salt. In Bangladeshi meals, achar, spice mixes, fried snacks, and kacha lobon can quietly push sodium much higher than the visible food list suggests.`,
      actionableSteps: [
        "Avoid adding kacha lobon at the table and use lemon, chili, coriander, or roasted cumin for flavor.",
        "Limit packaged spice mixes, achar, chanachur, and salty street snacks on the same day.",
        "Pair lunch or dinner with potassium-rich local foods like lau, pepe, cucumber, and dal when possible."
      ]
    });
  }

  if ((profile.gender === 'female' || profile.healthConditions.includes('anemia')) && totalIron < 5) {
    alerts.push({
      title: "Iron and Micronutrient Gap",
      severity: profile.healthConditions.includes('anemia') ? "high" : "medium",
      explanation: `Your logged foods provide only about ${totalIron.toFixed(1)}mg iron, which is low for many adult women and anemia-prone users. Bangladesh-specific meals can improve this cheaply by combining iron-rich shak, dal, fish, or egg with vitamin C sources that improve absorption.`,
      actionableSteps: [
        "Add lal shak, kolmi shak, kachu shak, or moshur dal to at least one meal daily.",
        "Squeeze lemon over dal, fish, or shak, or eat guava/amra after meals to support iron absorption.",
        "Avoid taking tea immediately with iron-rich meals; keep tea at least one hour away when possible."
      ]
    });
  }

  if (profile.activityLevel === 'sedentary' || (bmi !== null && bmi >= 23)) {
    alerts.push({
      title: "South Asian BMI and Activity Risk",
      severity: bmi !== null && bmi >= 23 ? "medium" : "low",
      explanation: `${bmi !== null ? `Your BMI is approximately ${bmi}, and South Asian risk often starts rising from BMI 23.0 rather than 25.0. ` : ""}A sedentary routine makes refined carbohydrates and oil-heavy snacks harder to balance, even when total calories do not look extreme.`,
      actionableSteps: [
        "Walk briskly for 20-30 minutes after the largest rice-based meal when practical.",
        "Use fish, egg, dal, or chhola to raise protein so meals feel filling with less rice.",
        "Keep fried snacks occasional and pair them with a lighter dinner rather than another starch-heavy meal."
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

  const topAlerts = alerts.slice(0, 4);
  const overallSummary = `Risk profile computed for a ${profile.age}-year-old ${profile.gender}${bmi !== null ? ` with BMI ${bmi}` : ""}. The logged foods total about ${Math.round(totalCalories)} kcal, ${Math.round(totalCarbs)}g carbs, ${Math.round(totalFat)}g fat, ${Math.round(totalProtein)}g protein, ${Math.round(totalSodium)}mg sodium, and ${totalIron.toFixed(1)}mg iron. Detected ${topAlerts.length} prevention priorities using Bangladeshi meal patterns, South Asian BMI thresholds, and the selected health profile.`;

  return {
    alerts: topAlerts,
    overallSummary,
    disclaimer: "DISCLAIMER: This system is powered by AI and exists solely for health awareness and educational purposes. It does NOT claim to provide medical diagnosis, nor should it substitute professional clinical evaluation."
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

  if (!shouldUseGemini()) {
    if (shouldUseOllamaForGeneratedText()) {
      try {
        console.log("Analyzing with local Ollama...");
        return res.json(await runLocalLlm("analyze-food", { foodText }, 30000));
      } catch (err: any) {
        console.warn("Local Ollama analysis unavailable, using deterministic parser:", err.message);
      }
    }

    // Return mock analysis by scanning words
    console.log("Analyzing with fallback parser...");
    const lower = foodText.toLowerCase();
    const detectedItems = [];
    
    // Quick keyword search
    if (lower.includes("paratha") || lower.includes("porota") || lower.includes("parota")) {
      detectedItems.push(FALLBACK_FOODS[0]);
    }
    if (lower.includes("bhaji") || lower.includes("aloo") || lower.includes("potato")) {
      detectedItems.push(FALLBACK_FOODS[1]);
    }
    if (lower.includes("rui") || lower.includes("fish") || lower.includes("maach")) {
      detectedItems.push(FALLBACK_FOODS[2]);
    }
    if (lower.includes("dal") || lower.includes("daal") || lower.includes("lentil")) {
      detectedItems.push(FALLBACK_FOODS[3]);
    }
    if (lower.includes("rice") || lower.includes("bhaat") || lower.includes("bhat")) {
      if (lower.includes("red") || lower.includes("laal")) {
        detectedItems.push(FALLBACK_FOODS[8]);
      } else {
        detectedItems.push(FALLBACK_FOODS[4]);
      }
    }
    if (lower.includes("singara") || lower.includes("shingara")) {
      detectedItems.push(FALLBACK_FOODS[5]);
    }
    if (lower.includes("tea") || lower.includes("chaa") || lower.includes("cha")) {
      detectedItems.push(FALLBACK_FOODS[6]);
    }
    if (lower.includes("beef") || lower.includes("rezala") || lower.includes("meat")) {
      detectedItems.push(FALLBACK_FOODS[7]);
    }

    if (detectedItems.length === 0) {
      // Return a random set of common items
      detectedItems.push(FALLBACK_FOODS[4], FALLBACK_FOODS[2], FALLBACK_FOODS[3]);
    }

    return res.json({
      detectedItems,
      overallComments: `Parsed based on local health records. Added standard nutritional values for typical household servings in Bangladesh (Bhaat, Rui Maach, and Dal). Set your GEMINI API key in Settings > Secrets for active AI recognition.`
    });
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
    return res.status(500).json({ error: "Failed to analyze meals using live AI. Check secrets configuration or continue with Fallback analyzer.", details: err.message });
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

Perform a non-medical prevention and awareness risk assessment. Pay extreme attention to:
1. High-carbohydrate risks (Bhaat/Rice culture leading to Diabetes mellitus risk in Bangladesh).
2. Excess sodium intake (due to tableside salt or processed commercial snacks, leading to coronary arterial issues/hypertension).
3. Local micronutrient gaps like Iron deficiency (highly prevalent in Bangladeshi females) or Vitamin D/Calcium due to limited sunlight/insufficient dairy.
Include a strict disclaimer indicating this is educational and not clinical diagnosis. Keep language constructive, authoritative, and encouraging.`;

    const response = await generateGeminiContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an AI preventive clinical nutritionist specialized in South Asian / Bangladeshi lifestyle, diets and medical risk mitigations.",
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
    console.error("Gemini risk calculation failed:", err);
    return res.status(500).json({ error: "Failed to evaluate health risks. Continue with stable rule-based metrics dashboard.", details: err.message });
  }
});

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
    console.error("Gemini meal planning failed:", err);
    return res.status(500).json({ error: "Failed to generate customized meal plans. Re-check network configurations or enjoy built-in presets.", details: err.message });
  }
});

// 4. Affordable Healthy Alternatives Generator
app.post("/api/healthy-alternatives", async (req, res) => {
  const { customQuery } = req.body;

  if (!shouldUseGemini()) {
    // Return high quality local alternatives data
    console.log("Serving static pre-calculated alternatives...");
    if (customQuery && customQuery.trim().length > 0) {
      // Return custom filtered results or the whole array matching criteria
      const queryLower = customQuery.toLowerCase();
      const filtered = FALLBACK_ALTERNATIVES.filter(
        item => item.unhealthyFood.toLowerCase().includes(queryLower) || item.healthierAlternative.toLowerCase().includes(queryLower)
      );
      if (filtered.length > 0) {
        return res.json({ alternatives: filtered });
      }
    }
    return res.json({ alternatives: FALLBACK_ALTERNATIVES });
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
    return res.status(500).json({ error: "Failed to generate alternatives database. Continue with our pre-built local index.", details: err.message });
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
