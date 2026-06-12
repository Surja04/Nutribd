import React, { useState, useEffect } from 'react';
import { HealthProfile, FoodItem, FoodAnalysisResult, HealthRiskAssessment, MealPlanResponse, FoodAlternative, TrainingPlanResponse } from './types';
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
  Sparkle,
  Dumbbell,
  Send,
  X,
  PlayCircle
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

type ExerciseGuide = {
  title: string;
  titleBn: string;
  motion: 'walk' | 'floor' | 'plank' | 'squat' | 'stepup' | 'push' | 'row' | 'bridge' | 'lunge' | 'climber' | 'hinge';
  steps: string[];
  stepsBn: string[];
  cues: string[];
  cuesBn: string[];
};

const EXERCISE_GUIDES: ExerciseGuide[] = [
  {
    title: "Brisk walk intervals",
    titleBn: "দ্রুত হাঁটার ইন্টারভ্যাল",
    motion: "walk",
    steps: ["Walk tall with relaxed shoulders.", "Move faster for the work interval, then slow down for recovery.", "Keep the pace hard enough to breathe faster but still speak short sentences."],
    stepsBn: ["কাঁধ ঢিলা রেখে সোজা হয়ে হাঁটুন।", "ওয়ার্ক ইন্টারভ্যালে দ্রুত হাঁটুন, তারপর রিকভারি সময়ে গতি কমান।", "গতি এমন রাখুন যেন শ্বাস একটু বাড়ে, কিন্তু ছোট বাক্য বলা যায়।"],
    cues: ["Land softly on the heel-to-midfoot.", "Use arms naturally.", "Avoid sprinting if you are a beginner."],
    cuesBn: ["পা নরমভাবে ফেলুন।", "হাত স্বাভাবিকভাবে নাড়ুন।", "বিগিনার হলে দৌড়াবেন না।"],
  },
  {
    title: "Dead bug",
    titleBn: "ডেড বাগ",
    motion: "floor",
    steps: ["Lie on your back with knees over hips and arms up.", "Tighten your belly gently so the lower back stays close to the floor.", "Slowly lower the opposite arm and leg, then return and switch sides."],
    stepsBn: ["চিৎ হয়ে শুয়ে হাঁটু হিপের ওপর, হাত ওপরে রাখুন।", "পেট হালকা টানুন যেন নিচের পিঠ মাটির কাছে থাকে।", "বিপরীত হাত-পা ধীরে নামান, তারপর ফিরে এসে পাশ বদলান।"],
    cues: ["Move slowly.", "Stop if your lower back arches.", "Breathing should stay smooth."],
    cuesBn: ["ধীরে করবেন।", "কোমর বেশি বাঁকলে থামুন।", "শ্বাস স্বাভাবিক রাখুন।"],
  },
  {
    title: "Plank",
    titleBn: "প্ল্যাঙ্ক",
    motion: "plank",
    steps: ["Put elbows under shoulders.", "Make a straight line from shoulder to ankle.", "Hold until form starts to break, then rest."],
    stepsBn: ["কনুই কাঁধের নিচে রাখুন।", "কাঁধ থেকে পা পর্যন্ত শরীর সোজা রাখুন।", "ফর্ম নষ্ট হওয়ার আগেই থেমে বিশ্রাম নিন।"],
    cues: ["Do not let the lower back sag.", "Look slightly ahead of your hands.", "Short clean holds are better than long messy holds."],
    cuesBn: ["কোমর নিচে ঝুলতে দেবেন না।", "হাতের একটু সামনে তাকান।", "লম্বা ভুল হোল্ডের চেয়ে ছোট ঠিক হোল্ড ভালো।"],
  },
  {
    title: "Side plank",
    titleBn: "সাইড প্ল্যাঙ্ক",
    motion: "plank",
    steps: ["Lie on one side with elbow under shoulder.", "Lift hips so the body forms one line.", "Hold, then switch sides."],
    stepsBn: ["এক পাশে শুয়ে কনুই কাঁধের নিচে রাখুন।", "হিপ তুলুন যেন শরীর এক লাইনে থাকে।", "ধরে রাখুন, তারপর পাশ বদলান।"],
    cues: ["Use knees down if needed.", "Keep neck relaxed.", "Do both sides evenly."],
    cuesBn: ["কঠিন লাগলে হাঁটু মাটিতে রাখুন।", "ঘাড় ঢিলা রাখুন।", "দুই পাশ সমান করবেন।"],
  },
  {
    title: "Squat",
    titleBn: "স্কোয়াট",
    motion: "squat",
    steps: ["Stand with feet about shoulder-width.", "Push hips back like sitting on a chair.", "Stand up by pressing through the whole foot."],
    stepsBn: ["পা কাঁধের সমান ফাঁক করে দাঁড়ান।", "চেয়ারে বসার মতো হিপ পেছনে নিন।", "পুরো পা দিয়ে চাপ দিয়ে উঠে দাঁড়ান।"],
    cues: ["Knees should feel comfortable.", "Chest stays proud.", "Use a chair if balance is hard."],
    cuesBn: ["হাঁটুতে অস্বস্তি হলে range কমান।", "বুক খোলা রাখুন।", "ব্যালান্স কঠিন হলে চেয়ার ব্যবহার করুন।"],
  },
  {
    title: "Step-up",
    titleBn: "স্টেপ-আপ",
    motion: "stepup",
    steps: ["Place one foot fully on a stair.", "Push through that foot and stand tall.", "Step down slowly and repeat."],
    stepsBn: ["এক পা পুরোটা সিঁড়িতে রাখুন।", "ওই পা দিয়ে চাপ দিয়ে উঠে সোজা দাঁড়ান।", "ধীরে নিচে নামুন, আবার করুন।"],
    cues: ["Use a railing for safety.", "Control the way down.", "Avoid rushing."],
    cuesBn: ["সেফটির জন্য রেলিং ধরুন।", "নামার সময় নিয়ন্ত্রণ রাখুন।", "তাড়াহুড়া করবেন না।"],
  },
  {
    title: "Push-up",
    titleBn: "পুশ-আপ",
    motion: "push",
    steps: ["Put hands slightly wider than shoulders.", "Lower chest toward the wall, table, or floor.", "Push back up while keeping the body straight."],
    stepsBn: ["হাত কাঁধের চেয়ে একটু বেশি ফাঁক রাখুন।", "দেয়াল, টেবিল বা মাটির দিকে বুক নামান।", "শরীর সোজা রেখে আবার চাপ দিয়ে উঠুন।"],
    cues: ["Start with wall or table push-ups.", "Do not flare elbows too wide.", "Stop before form breaks."],
    cuesBn: ["দেয়াল বা টেবিল পুশ-আপ দিয়ে শুরু করতে পারেন।", "কনুই খুব বাইরে ছড়াবেন না।", "ফর্ম নষ্ট হওয়ার আগেই থামুন।"],
  },
  {
    title: "Backpack row",
    titleBn: "ব্যাকপ্যাক রো",
    motion: "row",
    steps: ["Hold a loaded backpack with both hands.", "Hinge slightly at the hips with a straight back.", "Pull elbows back, then lower slowly."],
    stepsBn: ["দুই হাতে বইভরা ব্যাকপ্যাক ধরুন।", "পিঠ সোজা রেখে হিপ থেকে সামান্য ঝুঁকুন।", "কনুই পেছনে টানুন, তারপর ধীরে নামান।"],
    cues: ["Keep shoulders away from ears.", "Squeeze upper back gently.", "Use light weight first."],
    cuesBn: ["কাঁধ কান থেকে দূরে রাখুন।", "পিঠের ওপরের অংশ হালকা চেপে ধরুন।", "আগে হালকা ওজন নিন।"],
  },
  {
    title: "Glute bridge",
    titleBn: "গ্লুট ব্রিজ",
    motion: "bridge",
    steps: ["Lie on your back with knees bent.", "Press feet into the floor and lift hips.", "Pause briefly, then lower slowly."],
    stepsBn: ["চিৎ হয়ে শুয়ে হাঁটু বাঁকান।", "পা দিয়ে মাটিতে চাপ দিয়ে হিপ তুলুন।", "একটু থেমে ধীরে নামুন।"],
    cues: ["Feel hips working, not lower back.", "Keep ribs down.", "Do not over-arch."],
    cuesBn: ["কাজটা হিপে অনুভব করুন, কোমরে না।", "রিবস নিচে রাখুন।", "অতিরিক্ত বাঁকাবেন না।"],
  },
  {
    title: "Reverse lunge",
    titleBn: "রিভার্স লাঞ্জ",
    motion: "lunge",
    steps: ["Stand tall and step one foot back.", "Bend both knees slightly under control.", "Push through the front foot to return."],
    stepsBn: ["সোজা দাঁড়িয়ে এক পা পেছনে নিন।", "দুই হাঁটু নিয়ন্ত্রণে বাঁকান।", "সামনের পা দিয়ে চাপ দিয়ে ফিরে আসুন।"],
    cues: ["Hold a wall if needed.", "Keep front knee comfortable.", "Small range is okay."],
    cuesBn: ["প্রয়োজনে দেয়াল ধরুন।", "সামনের হাঁটু আরামদায়ক রাখুন।", "কম range-ও ঠিক আছে।"],
  },
  {
    title: "Mountain climber",
    titleBn: "মাউন্টেন ক্লাইম্বার",
    motion: "climber",
    steps: ["Start in a high plank.", "Bring one knee toward the chest.", "Switch legs slowly and smoothly."],
    stepsBn: ["হাই প্ল্যাঙ্ক পজিশনে শুরু করুন।", "এক হাঁটু বুকের দিকে আনুন।", "ধীরে ও স্মুথভাবে পা বদলান।"],
    cues: ["Keep pace moderate.", "Do not hold breath.", "Stop if shoulders or back hurt."],
    cuesBn: ["গতি মাঝারি রাখুন।", "শ্বাস আটকে রাখবেন না।", "কাঁধ বা পিঠ ব্যথা করলে থামুন।"],
  },
  {
    title: "Hip hinge",
    titleBn: "হিপ হিঞ্জ",
    motion: "hinge",
    steps: ["Stand tall with soft knees.", "Push hips back while keeping back neutral.", "Stand up by squeezing hips forward."],
    stepsBn: ["হাঁটু হালকা বাঁকিয়ে সোজা দাঁড়ান।", "পিঠ নিউট্রাল রেখে হিপ পেছনে নিন।", "হিপ সামনে এনে উঠে দাঁড়ান।"],
    cues: ["This is not a squat.", "Feel stretch behind thighs.", "Keep the load close to the body."],
    cuesBn: ["এটা স্কোয়াট না।", "উরুর পেছনে টান অনুভব করুন।", "ওজন শরীরের কাছে রাখুন।"],
  },
];

const getExerciseGuide = (exerciseName: string) => {
  const name = exerciseName.toLowerCase();
  if (/brisk|walk|হাঁটা|ওয়াক/.test(name)) return EXERCISE_GUIDES[0];
  if (/dead bug|ডেড/.test(name)) return EXERCISE_GUIDES[1];
  if (/side plank|সাইড/.test(name)) return EXERCISE_GUIDES[3];
  if (/plank|প্ল্যাঙ্ক/.test(name)) return EXERCISE_GUIDES[2];
  if (/squat|স্কোয়াট/.test(name)) return EXERCISE_GUIDES[4];
  if (/step|স্টেপ/.test(name)) return EXERCISE_GUIDES[5];
  if (/push|পুশ/.test(name)) return EXERCISE_GUIDES[6];
  if (/row|রো/.test(name)) return EXERCISE_GUIDES[7];
  if (/bridge|ব্রিজ/.test(name)) return EXERCISE_GUIDES[8];
  if (/lunge|লাঞ্জ/.test(name)) return EXERCISE_GUIDES[9];
  if (/climber|ক্লাইম্বার/.test(name)) return EXERCISE_GUIDES[10];
  if (/hinge|deadlift|হিঞ্জ|ডেডলিফট/.test(name)) return EXERCISE_GUIDES[11];
  return EXERCISE_GUIDES[0];
};

function ExerciseMotionGraphic({ motion }: { motion: ExerciseGuide['motion'] }) {
  const common = {
    stroke: "#0f172a",
    strokeWidth: 7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  const head = (cx: number, cy: number, className = "") => (
    <circle className={className} cx={cx} cy={cy} r="13" fill="#fb7185" stroke="#0f172a" strokeWidth="6" />
  );
  const limb = (d: string, className = "") => <path className={className} d={d} {...common} />;
  const ground = <path d="M42 206 H278" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />;
  const arrow = (d: string) => <path className="motion-arrow" d={d} fill="none" stroke="#e11d48" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />;

  return (
    <svg className="exercise-svg" viewBox="0 0 320 240" role="img" aria-hidden="true">
      <rect x="1" y="1" width="318" height="238" rx="24" fill="url(#motionBg)" />
      <defs>
        <linearGradient id="motionBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="58%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#eef2ff" />
        </linearGradient>
      </defs>
      {ground}

      {motion === "walk" && (
        <>
          {arrow("M78 62 C112 40, 166 40, 206 62 M196 50 L208 63 L190 68")}
          <g className="svg-walk">
            {head(156, 62)}
            {limb("M156 78 L156 128")}
            {limb("M154 92 L118 124", "svg-arm-a")}
            {limb("M158 92 L194 120", "svg-arm-b")}
            {limb("M156 128 L122 190", "svg-leg-a")}
            {limb("M156 128 L198 190", "svg-leg-b")}
          </g>
        </>
      )}

      {motion === "floor" && (
        <>
          {arrow("M166 84 C190 62, 214 58, 236 76 M225 61 L239 76 L218 80")}
          <g className="svg-floor">
            {head(92, 138)}
            {limb("M106 138 L174 138")}
            {limb("M124 134 L122 84", "svg-dead-arm-a")}
            {limb("M132 142 L106 182")}
            {limb("M174 138 L216 98", "svg-dead-leg-a")}
            {limb("M174 138 L214 178")}
          </g>
        </>
      )}

      {motion === "plank" && (
        <g className="svg-plank">
          {head(88, 122)}
          {limb("M102 128 L214 148")}
          {limb("M114 132 L90 198")}
          {limb("M122 134 L110 198", "svg-muted")}
          {limb("M214 148 L260 198")}
          {limb("M208 148 L238 198", "svg-muted")}
        </g>
      )}

      {motion === "squat" && (
        <>
          {arrow("M246 78 C266 106, 266 144, 246 172 M240 156 L246 174 L260 158")}
          <g className="svg-squat">
            {head(160, 58)}
            {limb("M160 74 L160 124")}
            {limb("M158 88 L120 104")}
            {limb("M162 88 L200 104")}
            {limb("M160 124 L124 164 L108 202")}
            {limb("M160 124 L198 164 L214 202")}
          </g>
        </>
      )}

      {motion === "stepup" && (
        <>
          <rect x="194" y="174" width="78" height="32" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="3" />
          {arrow("M110 176 C144 150, 174 144, 206 132 M192 126 L210 130 L198 146")}
          <g className="svg-step">
            {head(138, 70)}
            {limb("M138 86 L142 132")}
            {limb("M140 98 L116 128")}
            {limb("M144 98 L172 122")}
            {limb("M142 132 L194 176")}
            {limb("M142 132 L122 204")}
          </g>
        </>
      )}

      {motion === "push" && (
        <>
          {arrow("M160 88 C160 108, 160 128, 160 148 M149 136 L160 151 L171 136")}
          <g className="svg-push">
            {head(74, 132)}
            {limb("M88 138 L214 152")}
            {limb("M114 142 L104 204", "svg-push-arm")}
            {limb("M130 144 L126 204", "svg-muted svg-push-arm")}
            {limb("M214 152 L266 204")}
          </g>
        </>
      )}

      {motion === "row" && (
        <>
          <rect className="svg-load" x="120" y="150" width="46" height="36" rx="8" fill="#fecdd3" stroke="#0f172a" strokeWidth="5" />
          {arrow("M116 146 C142 128, 172 126, 198 142 M184 127 L202 142 L182 148")}
          <g className="svg-row">
            {head(178, 72)}
            {limb("M170 86 L136 136")}
            {limb("M148 116 L126 152", "svg-row-arm")}
            {limb("M136 136 L104 202")}
            {limb("M136 136 L180 202")}
          </g>
        </>
      )}

      {motion === "bridge" && (
        <>
          {arrow("M158 166 C166 128, 194 112, 226 124 M210 113 L229 124 L210 136")}
          <g className="svg-bridge">
            {head(78, 172)}
            {limb("M92 172 L158 146 L220 176")}
            {limb("M110 174 L84 204")}
            {limb("M220 176 L252 204")}
          </g>
        </>
      )}

      {motion === "lunge" && (
        <>
          {arrow("M244 82 C260 114, 260 152, 240 178 M234 160 L240 180 L254 164")}
          <g className="svg-lunge">
            {head(162, 58)}
            {limb("M162 74 L162 126")}
            {limb("M160 90 L132 116")}
            {limb("M164 90 L196 116")}
            {limb("M162 126 L112 162 L98 202")}
            {limb("M162 126 L220 164 L250 202")}
          </g>
        </>
      )}

      {motion === "climber" && (
        <>
          {arrow("M146 160 C172 134, 194 132, 220 156 M206 139 L222 156 L200 160")}
          <g className="svg-climber">
            {head(72, 126)}
            {limb("M86 132 L200 146")}
            {limb("M112 136 L102 204")}
            {limb("M126 138 L124 204", "svg-muted")}
            {limb("M200 146 L236 202", "svg-climber-back")}
            {limb("M200 146 L156 198", "svg-climber-front")}
          </g>
        </>
      )}

      {motion === "hinge" && (
        <>
          <rect className="svg-load" x="142" y="174" width="46" height="28" rx="7" fill="#fecdd3" stroke="#0f172a" strokeWidth="5" />
          {arrow("M224 76 C246 106, 246 144, 224 174 M216 158 L224 176 L238 158")}
          <g className="svg-hinge">
            {head(160, 58)}
            {limb("M160 74 L132 134")}
            {limb("M142 112 L154 174")}
            {limb("M132 134 L112 204")}
            {limb("M132 134 L180 204")}
          </g>
        </>
      )}
    </svg>
  );
}

export default function App() {
  type UiLanguage = 'en' | 'bn';
  type ModelMode = 'gemini' | 'ollama';
  type ModelStatus = {
    gemini: boolean;
    geminiKeyPresent: boolean;
    apiKeySource?: string | null;
    ollama: boolean;
    ollamaModel: string;
    modelMode: ModelMode;
    activeProvider: 'gemini' | 'ollama';
  };
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  let copy = {
    en: {
      subtitle: "Personalized Nutrition & Preventive Health Risk Assistant for Bangladesh",
      badge: "HACKATHON RELEASE",
      disclaimer: "This is a nutritional preventive awareness assistant. It is NOT a clinical diagnostic system. It provides helpful dietary plans using affordable Bangladeshi ingredients and alerts regarding nutritional risks.",
      reset: "Reset",
      tabs: ["Intake Tracker", "AI Risk Assessment", "Meal & Grocery Plan", "Tagra Bhai", "Healthy Swapping"],
      intakeTitle: "Write food intake diary in natural language",
      intakeBadge: "AI Powered Analyzer",
      intakeHelp: "Enter the items you consumed today in chat style. You can write in English, Bangla, or common transliterated Bangla terms.",
      intakePlaceholder: "e.g. একটা পরোটা, এক কাপ চা for breakfast / আমি সকালে একটা পরোটা আর এক কাপ চা খেয়েছি",
      demo: "Try Bangla demo",
      analyze: "Analyze Food Intake",
      rda: "Calculated South Asian RDA",
      bmi: "Body Mass Index (BMI)",
      calorieTarget: "Daily Calorie Target (TDEE)",
      macroTargets: "Daily Macronutrient Limits & Targets",
      quickRisks: "Generate AI Health Risks",
      quickMeals: "Affordable Meal Recommendations",
      quickTraining: "Ask Tagra Bhai for a Training Plan",
    },
    bn: {
      subtitle: "বাংলাদেশের জন্য ব্যক্তিগত পুষ্টি ও প্রতিরোধমূলক স্বাস্থ্য সহায়ক",
      badge: "হ্যাকাথন রিলিজ",
      disclaimer: "এটি একটি পুষ্টি ও প্রতিরোধমূলক সচেতনতা সহায়ক। এটি কোনো ক্লিনিক্যাল ডায়াগনস্টিক সিস্টেম নয়। এটি সাশ্রয়ী বাংলাদেশি খাবার, খাদ্য পরিকল্পনা এবং পুষ্টি ঝুঁকি সম্পর্কে সহায়ক পরামর্শ দেয়।",
      reset: "রিসেট",
      tabs: ["খাবার ট্র্যাকার", "AI ঝুঁকি মূল্যায়ন", "মিল ও বাজার পরিকল্পনা", "ট্রেনিং কোচ", "স্বাস্থ্যকর বিকল্প"],
      intakeTitle: "বাংলা বা ইংরেজিতে খাবারের ডায়েরি লিখুন",
      intakeBadge: "AI বিশ্লেষক",
      intakeHelp: "আজ কী কী খেয়েছেন চ্যাটের মতো লিখুন। বাংলা, English বা Banglish—সবভাবেই লিখতে পারবেন।",
      intakePlaceholder: "যেমন: একটা পরোটা, এক কাপ চা for breakfast / আমি সকালে একটা পরোটা আর এক কাপ চা খেয়েছি",
      demo: "বাংলা ডেমো চেষ্টা করুন",
      analyze: "খাবার বিশ্লেষণ করুন",
      rda: "দক্ষিণ এশীয় RDA হিসাব",
      bmi: "বডি মাস ইনডেক্স (BMI)",
      calorieTarget: "দৈনিক ক্যালরি লক্ষ্য (TDEE)",
      macroTargets: "দৈনিক পুষ্টি সীমা ও লক্ষ্য",
      quickRisks: "AI স্বাস্থ্য ঝুঁকি দেখুন",
      quickMeals: "সাশ্রয়ী মিল পরামর্শ",
      quickTraining: "দৈনিক ফিজিক্যাল ট্রেনিং প্ল্যান",
    },
  }[uiLanguage];

  if (uiLanguage === 'bn') {
    copy = {
      ...copy,
      subtitle: "বাংলাদেশি খাবার আর লাইফস্টাইল মাথায় রেখে আপনার নিজের পুষ্টি সহকারী",
      badge: "হ্যাকাথন রিলিজ",
      disclaimer: "এটা ডাক্তারি পরামর্শ না। খাবার আর লাইফস্টাইল নিয়ে সচেতন থাকার জন্য বানানো একটা সহায়ক টুল। কোনো স্বাস্থ্য সমস্যা থাকলে অবশ্যই ডাক্তার বা পুষ্টিবিদের সাথে কথা বলুন।",
      reset: "রিসেট",
      tabs: ["খাবার ট্র্যাক", "স্বাস্থ্য ঝুঁকি", "মিল প্ল্যান", "Tagra Bhai", "ভালো বিকল্প"],
      intakeTitle: "আজ কী কী খেয়েছেন লিখুন",
      intakeBadge: "AI অ্যানালাইজার",
      intakeHelp: "বাংলা, English বা Banglish—যেভাবে সুবিধা সেভাবেই লিখুন। যেমন: “সকালে একটা পরোটা আর এক কাপ চা খেয়েছি।”",
      intakePlaceholder: "যেমন: সকালে একটা পরোটা আর এক কাপ চা খেয়েছি। দুপুরে ভাত, ডাল আর রুই মাছ।",
      demo: "একটা বাংলা ডেমো দিন",
      analyze: "খাবারটা অ্যানালাইজ করুন",
      rda: "আপনার দৈনিক টার্গেট",
      bmi: "BMI",
      calorieTarget: "আজকের ক্যালরি টার্গেট",
      macroTargets: "কার্ব, প্রোটিন, ফ্যাট—টার্গেট",
      quickRisks: "স্বাস্থ্য ঝুঁকি দেখুন",
      quickMeals: "মিল প্ল্যান বানান",
      quickTraining: "Tagra Bhai-এর প্ল্যান নিন",
    };
  }

  const trainingCopy = {
    en: {
      title: "Tagra Bhai",
      subtitle: "Your boro-bhai style fitness coach for muscle gain, slimming, strength, or beginner workouts.",
      badge: "Boro Bhai Coach",
      label: "Tell Tagra Bhai your goal",
      placeholder: "e.g. Bhai, I want to get more muscular with home workouts.",
      samples: [
        "Bhai, I want to get more muscular and stronger with home workouts.",
        "Bhai, I want to get slim and lose belly fat safely.",
        "Bhai, I want beginner fitness with walking and light strength.",
      ],
      sampleLabels: ["Muscle gain", "Slimming", "Beginner fitness"],
      buildingButton: "Building Plan...",
      submitButton: "Ask Tagra Bhai",
      loadingTitle: "Tagra Bhai is building your plan...",
      loadingSubtitle: "Matching goal, BMI, activity level, and health conditions with safe home-friendly exercises.",
      summaryLabel: "Tagra Bhai says",
      warmup: "Warmup",
      workout: "Workout",
      cooldown: "Cooldown",
      progression: "Progression",
      recovery: "Recovery & Safety",
      safety: "Safety notes",
      emptyTitle: "Tagra Bhai is waiting for your goal.",
      emptySubtitle: "Tell him whether you want muscle gain, slimming, strength, or beginner fitness.",
    },
    bn: {
      title: "Tagra Bhai",
      subtitle: "মাসল বাড়ানো, স্লিম হওয়া, শক্তি বাড়ানো বা একদম শুরু—যে লক্ষ্যই হোক, বড় ভাইয়ের মতো করে প্ল্যান দেবে।",
      badge: "বড় ভাই কোচ",
      label: "Tagra Bhai-কে আপনার লক্ষ্য বলুন",
      placeholder: "যেমন: ভাই, বাসায় ওয়ার্কআউট করে মাসল বাড়াতে চাই।",
      samples: [
        "ভাই, বাসায় ওয়ার্কআউট করে মাসল বাড়াতে আর শক্ত হতে চাই।",
        "ভাই, নিরাপদভাবে স্লিম হতে আর পেটের মেদ কমাতে চাই।",
        "ভাই, আমি বিগিনার। হাঁটা আর হালকা স্ট্রেংথ দিয়ে শুরু করতে চাই।",
      ],
      sampleLabels: ["মাসল গেইন", "স্লিমিং", "বিগিনার ফিটনেস"],
      buildingButton: "প্ল্যান বানাচ্ছে...",
      submitButton: "Tagra Bhai-কে জিজ্ঞেস করুন",
      loadingTitle: "Tagra Bhai আপনার প্ল্যান বানাচ্ছে...",
      loadingSubtitle: "আপনার লক্ষ্য, BMI, অ্যাক্টিভিটি আর স্বাস্থ্য অবস্থার সাথে মিলিয়ে নিরাপদ ওয়ার্কআউট সাজানো হচ্ছে।",
      summaryLabel: "Tagra Bhai বলছে",
      warmup: "ওয়ার্মআপ",
      workout: "ওয়ার্কআউট",
      cooldown: "কুলডাউন",
      progression: "কীভাবে এগোবেন",
      recovery: "রিকভারি ও সেফটি",
      safety: "সেফটি নোট",
      emptyTitle: "Tagra Bhai আপনার লক্ষ্য শোনার অপেক্ষায় আছে।",
      emptySubtitle: "মাসল গেইন, স্লিমিং, শক্তি বাড়ানো বা বিগিনার ফিটনেস—যেটা চান লিখে দিন।",
    },
  }[uiLanguage];

  useEffect(() => {
    document.documentElement.lang = uiLanguage === 'bn' ? 'bn' : 'en';
  }, [uiLanguage]);
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

  // Personalized training chatbot states
  const [trainingGoal, setTrainingGoal] = useState<string>("Bhai, I want to get more muscular and stronger with home workouts.");
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlanResponse | null>(null);
  const [isGeneratingTraining, setIsGeneratingTraining] = useState<boolean>(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);

  // General App Dashboard navigation tabs
  const [activeTab, setActiveTab] = useState<'tracker' | 'risks' | 'meals' | 'training' | 'alternatives'>('tracker');

  // Server health test indicator
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    gemini: false,
    geminiKeyPresent: false,
    apiKeySource: null,
    ollama: false,
    ollamaModel: 'phi3:mini',
    modelMode: 'ollama',
    activeProvider: 'ollama'
  });
  const [modelSwitchError, setModelSwitchError] = useState<string | null>(null);
  const selectedExerciseGuide = selectedExerciseName ? getExerciseGuide(selectedExerciseName) : null;

  // Fast calculation indices:
  const weightKg = profile.weight;
  const heightM = profile.height / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

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
  const refreshModelStatus = async () => {
    try {
      const response = await fetch('/api/models-status');
      const data = await response.json();
      setModelStatus(data);
    } catch (err) {
      console.warn("NutriBD AI model status check failed.", err);
    }
  };

  useEffect(() => {
    refreshModelStatus();
  }, []);

  const changeModelMode = async (mode: ModelMode) => {
    try {
      setModelSwitchError(null);
      const response = await fetch('/api/model-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to switch model mode.");
      }
      await refreshModelStatus();
    } catch (err: any) {
      console.error(err);
      setModelSwitchError(err.message || "Unable to switch model mode.");
    }
  };

  const toggleModelMode = () => {
    changeModelMode(modelStatus.modelMode === 'gemini' ? 'ollama' : 'gemini');
  };

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

  const triggerTrainingPlan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!trainingGoal.trim()) return;

    setIsGeneratingTraining(true);
    setTrainingError(null);

    try {
      const response = await fetch('/api/training-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          trainingGoal,
          trainingContext: `BMI ${bmi}, activity ${profile.activityLevel}, conditions ${profile.healthConditions.join(", ")}`,
          language: uiLanguage,
        })
      });

      if (!response.ok) {
        throw new Error("Training planner could not generate a safe plan.");
      }

      const data: TrainingPlanResponse = await response.json();
      setTrainingPlan(data);
      setActiveTab('training');
    } catch (err: any) {
      console.error(err);
      setTrainingError(err.message || "Failed to generate physical training plan.");
    } finally {
      setIsGeneratingTraining(false);
    }
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
                  {copy.badge}
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/90 font-medium">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* AI provider switch */}
            <button
              type="button"
              onClick={toggleModelMode}
              title={`Click to switch to ${modelStatus.modelMode === 'gemini' ? 'Ollama' : 'Gemini'}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 border transition-all hover:brightness-110 cursor-pointer ${
              modelStatus.activeProvider === 'gemini'
                ? 'bg-emerald-900/50 border-emerald-600/50 text-emerald-300' 
                : 'bg-sky-950/50 border-sky-700/60 text-sky-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                modelStatus.activeProvider === 'gemini'
                  ? 'bg-emerald-400'
                  : 'bg-sky-400'
              }`} />
              <span>
                {modelStatus.activeProvider === 'gemini'
                  ? "Live Gemini AI Active"
                  : "Ollama Live"}
              </span>
            </button>

            {modelSwitchError && (
              <span className="max-w-xs text-[11px] font-semibold text-amber-200">
                {modelSwitchError}
              </span>
            )}

            <button
              type="button"
              onClick={() => setUiLanguage(uiLanguage === 'en' ? 'bn' : 'en')}
              className="bg-emerald-900 hover:bg-emerald-800 border border-emerald-800 text-emerald-200 hover:text-white px-3 py-2 rounded-lg transition-all text-xs font-bold cursor-pointer"
            >
              {uiLanguage === 'en' ? 'বাংলা' : 'English'}
            </button>

            {/* Quick Refresh */}
            <button 
              onClick={() => window.location.reload()}
              title="Reset Application"
              className="bg-emerald-900 hover:bg-emerald-800 border border-emerald-800 text-emerald-200 hover:text-white p-2 rounded-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{copy.reset}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Non-Medical Strict Prevention Disclaimer Banner */}
      <section className="bg-amber-50 border-y border-amber-100 py-2.5 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2 text-xs text-amber-900 font-medium">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0" id="disclaimer-alert-icon" />
          <span>
            <strong>{uiLanguage === 'bn' ? 'সতর্কতা:' : 'Disclaimer:'}</strong> {copy.disclaimer}
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
              language={uiLanguage}
              onGenerateRecommendations={() => {
                triggerMealRecommendations();
                triggerPreventiveRiskAssessment();
              }}
            />

            {/* Local South Asian Nutrition Calculator Dashboard Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Scale className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">{copy.rda}</h3>
              </div>

              {/* BMI Panel */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">{copy.bmi}</span>
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
                    <span className="text-xs font-bold text-slate-700">{copy.calorieTarget}</span>
                    <span className="text-sm font-black text-emerald-600">{limitCalories.toLocaleString()} kcal</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">Calculated specifically based on daily activity and bodily energy budgets.</p>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <span className="block text-[11px] font-bold text-slate-600 tracking-wider uppercase mb-1.5">{copy.macroTargets}</span>
                  
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
                    <span>{copy.quickRisks}</span>
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
                    <span>{copy.quickMeals}</span>
                  </div>
                  <span>→</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('training');
                    if (!trainingPlan) {
                      triggerTrainingPlan();
                    }
                  }}
                  disabled={isGeneratingTraining}
                  className="w-full text-left bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-semibold py-2.5 px-3 rounded-xl border border-rose-100 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Dumbbell className="w-3.5 h-3.5 text-rose-600" />
                    <span>{copy.quickTraining}</span>
                  </div>
                  <span>Go</span>
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
                <span>{copy.tabs[0]}</span>
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
                <span>{copy.tabs[1]}</span>
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
                <span>{copy.tabs[2]}</span>
              </button>

              <button
                onClick={() => setActiveTab('training')}
                className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'training'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Dumbbell className="w-4 h-4" />
                <span>{copy.tabs[3]}</span>
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
                <span>{copy.tabs[4]}</span>
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
                      <h3 className="font-bold text-slate-800 text-base">{copy.intakeTitle}</h3>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md">
                      {copy.intakeBadge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {copy.intakeHelp}
                  </p>

                  <form onSubmit={handleAnalyzeFoodIntake} className="space-y-3">
                    <textarea
                      value={foodTextInput}
                      onChange={(e) => setFoodTextInput(e.target.value)}
                      placeholder={copy.intakePlaceholder}
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
                        onClick={() => setFoodTextInput(uiLanguage === 'bn' ? "সকালে একটা পরোটা আর এক কাপ চা খেয়েছি। দুপুরে এক প্লেট ভাত, ডাল আর রুই মাছ খেয়েছি।" : "I had one oil fried paratha with potato bhaji and roadside sweetened milk tea for breakfast, a plate of white rice with moshur dal and rui fish curry for lunch.")}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold hover:underline py-2 px-2.5 cursor-pointer"
                      >
                        {copy.demo}
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
                          <span>{copy.analyze}</span>
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

            {/* VIEW 4: TAGRA BHAI TRAINING COACH */}
            {activeTab === 'training' && (
              <div className="space-y-6 animate-fade-in" id="training-pane">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{trainingCopy.title}</h3>
                        <p className="text-xs text-slate-500">{trainingCopy.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2.5 py-1 rounded-lg border border-rose-100">
                      {trainingCopy.badge}
                    </span>
                  </div>

                  <form onSubmit={triggerTrainingPlan} className="space-y-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">{trainingCopy.label}</label>
                      <textarea
                        value={trainingGoal}
                        onChange={(e) => setTrainingGoal(e.target.value)}
                        rows={3}
                        placeholder={trainingCopy.placeholder}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-medium placeholder-slate-400 bg-white"
                      />
                      <div className="flex flex-wrap gap-2">
                        {trainingCopy.samples.map((sample, sampleIdx) => (
                          <button
                            key={sample}
                            type="button"
                            onClick={() => setTrainingGoal(sample)}
                            className="text-[11px] font-bold text-rose-700 bg-white border border-rose-100 hover:bg-rose-50 px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            {trainingCopy.sampleLabels[sampleIdx]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {trainingError && (
                      <div className="text-xs bg-red-50 border border-red-100 text-red-600 rounded-lg p-3">
                        {trainingError}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isGeneratingTraining || !trainingGoal.trim()}
                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 cursor-pointer"
                      >
                        {isGeneratingTraining ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{trainingCopy.buildingButton}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>{trainingCopy.submitButton}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {isGeneratingTraining ? (
                    <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <RefreshCw className="w-10 h-10 text-rose-600 animate-spin" />
                      <p className="text-sm font-bold text-slate-700">{trainingCopy.loadingTitle}</p>
                      <p className="text-xs text-slate-400 text-center max-w-sm">{trainingCopy.loadingSubtitle}</p>
                    </div>
                  ) : trainingPlan ? (
                    <div className="space-y-5">
                      <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-5 space-y-2">
                        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest block">{trainingCopy.summaryLabel}</span>
                        <p className="text-sm font-semibold text-rose-950 leading-relaxed">{trainingPlan.goalSummary}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trainingPlan.weeklyPlan.map((day, idx) => (
                          <div key={idx} className="bg-white border border-slate-150 rounded-xl p-4 space-y-3 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">{day.dayLabel}</span>
                                <h4 className="font-extrabold text-sm text-slate-800">{day.focus}</h4>
                              </div>
                              <span className="text-[11px] font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                                {day.durationMinutes} {uiLanguage === 'bn' ? 'মিনিট' : 'min'}
                              </span>
                            </div>

                            <div className="text-xs space-y-2">
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{trainingCopy.warmup}</span>
                                <p className="text-slate-600 font-medium">{day.warmup.join(", ")}</p>
                              </div>

                              <div className="space-y-2">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">{trainingCopy.workout}</span>
                                {day.exercises.map((exercise, exIdx) => (
                                  <button
                                    key={exIdx}
                                    type="button"
                                    onClick={() => setSelectedExerciseName(exercise.name)}
                                    className="w-full text-left bg-slate-50 border border-slate-100 hover:border-rose-200 hover:bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded-lg p-3 transition-all cursor-pointer"
                                  >
                                    <div className="flex justify-between gap-2">
                                      <span className="font-bold text-slate-800">{exercise.name}</span>
                                      <span className="text-[10px] font-bold text-rose-700">{exercise.sets} x {exercise.repsOrTime}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                      {exercise.notes} {uiLanguage === 'bn' ? 'বিশ্রাম' : 'Rest'}: {exercise.rest}.
                                    </p>
                                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                                      <PlayCircle className="w-3 h-3" />
                                      {uiLanguage === 'bn' ? 'মোশন গাইড দেখুন' : 'View motion guide'}
                                    </span>
                                  </button>
                                ))}
                              </div>

                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{trainingCopy.cooldown}</span>
                                <p className="text-slate-600 font-medium">{day.cooldown.join(", ")}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{trainingCopy.progression}</span>
                          <p className="font-semibold">{trainingPlan.progressionAdvice}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{trainingCopy.recovery}</span>
                          <p className="font-semibold">{trainingPlan.recoveryAdvice}</p>
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
                        <span className="font-extrabold text-amber-950 block mb-1">{trainingCopy.safety}</span>
                        <ul className="list-disc list-inside space-y-1">
                          {trainingPlan.safetyNotes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <Dumbbell className="w-10 h-10 text-slate-400 mx-auto" />
                      <p className="text-sm text-slate-600 font-bold">{trainingCopy.emptyTitle}</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">{trainingCopy.emptySubtitle}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 5: HEALTHIER FOOD SUBSTITUTIONS ("FOOD SWAPPING") */}
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
                          const calPreserved = Math.max(0, item.nutritionComparison.unhealthyCalories - item.nutritionComparison.healthyCalories);

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

      {selectedExerciseGuide && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm px-4 py-6 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={uiLanguage === 'bn' ? 'ব্যায়ামের মোশন গাইড' : 'Exercise motion guide'}
          onClick={() => setSelectedExerciseName(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                  <PlayCircle className="w-3.5 h-3.5" />
                  {uiLanguage === 'bn' ? 'মোশন ফ্ল্যাশকার্ড' : 'Motion Flashcard'}
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  {uiLanguage === 'bn' ? selectedExerciseGuide.titleBn : selectedExerciseGuide.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {uiLanguage === 'bn'
                    ? 'ধীরে দেখে নিন, তারপর নিজের গতিতে করুন। ব্যথা হলে থেমে যাবেন।'
                    : 'Watch the motion, then do it at your own pace. Stop if you feel pain.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExerciseName(null)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                aria-label={uiLanguage === 'bn' ? 'বন্ধ করুন' : 'Close guide'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-5 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100">
                <ExerciseMotionGraphic motion={selectedExerciseGuide.motion} />
                <p className="mt-3 text-center text-[11px] font-bold text-slate-500">
                  {uiLanguage === 'bn' ? 'এই অ্যানিমেশনটা শুধু ফর্ম বোঝানোর জন্য।' : 'Animation is a simple form guide, not a perfect body model.'}
                </p>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    {uiLanguage === 'bn' ? 'কীভাবে করবেন' : 'How to do it'}
                  </h4>
                  <ol className="space-y-2">
                    {(uiLanguage === 'bn' ? selectedExerciseGuide.stepsBn : selectedExerciseGuide.steps).map((step, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700 font-semibold leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-2">
                    {uiLanguage === 'bn' ? 'Tagra Bhai-এর টিপস' : "Tagra Bhai's cues"}
                  </h4>
                  <ul className="space-y-1.5">
                    {(uiLanguage === 'bn' ? selectedExerciseGuide.cuesBn : selectedExerciseGuide.cues).map((cue, idx) => (
                      <li key={idx} className="text-xs text-amber-950 font-semibold leading-relaxed flex gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <style>{`
        .exercise-svg {
          width: 100%;
          min-height: 260px;
          border-radius: 18px;
          display: block;
          border: 1px solid rgba(225, 229, 239, 0.9);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
        }

        .exercise-svg path,
        .exercise-svg circle,
        .exercise-svg rect {
          vector-effect: non-scaling-stroke;
        }

        .svg-muted {
          opacity: 0.55;
        }

        .motion-arrow {
          stroke-dasharray: 10 10;
          animation: arrow-flow 1.1s linear infinite;
          opacity: 0.9;
        }

        .svg-load {
          animation: load-pulse 1.4s ease-in-out infinite;
        }

        .svg-walk { animation: svg-bob 1.05s ease-in-out infinite; transform-origin: 156px 190px; }
        .svg-walk .svg-arm-a { animation: svg-swing-a 1.05s ease-in-out infinite; transform-origin: 154px 92px; }
        .svg-walk .svg-arm-b { animation: svg-swing-b 1.05s ease-in-out infinite; transform-origin: 158px 92px; }
        .svg-walk .svg-leg-a { animation: svg-swing-b 1.05s ease-in-out infinite; transform-origin: 156px 128px; }
        .svg-walk .svg-leg-b { animation: svg-swing-a 1.05s ease-in-out infinite; transform-origin: 156px 128px; }

        .svg-floor .svg-dead-arm-a { animation: deadbug-reach-arm 1.45s ease-in-out infinite; transform-origin: 124px 134px; }
        .svg-floor .svg-dead-leg-a { animation: deadbug-reach-leg 1.45s ease-in-out infinite; transform-origin: 174px 138px; }

        .svg-plank { animation: plank-brace 1.6s ease-in-out infinite; transform-origin: 160px 150px; }
        .svg-squat { animation: squat-pose 1.45s ease-in-out infinite; transform-origin: 160px 202px; }
        .svg-step { animation: step-pose 1.45s ease-in-out infinite; transform-origin: 138px 202px; }
        .svg-push { animation: push-pose 1.25s ease-in-out infinite; transform-origin: 164px 204px; }
        .svg-push .svg-push-arm { animation: push-arm-bend 1.25s ease-in-out infinite; transform-origin: 114px 142px; }
        .svg-row { animation: row-pose 1.35s ease-in-out infinite; transform-origin: 136px 136px; }
        .svg-row .svg-row-arm { animation: row-pull 1.35s ease-in-out infinite; transform-origin: 148px 116px; }
        .svg-bridge { animation: bridge-pose 1.45s ease-in-out infinite; transform-origin: 158px 172px; }
        .svg-lunge { animation: lunge-pose 1.45s ease-in-out infinite; transform-origin: 162px 202px; }
        .svg-climber .svg-climber-front { animation: climber-front 1s ease-in-out infinite; transform-origin: 200px 146px; }
        .svg-climber .svg-climber-back { animation: climber-back 1s ease-in-out infinite; transform-origin: 200px 146px; }
        .svg-hinge { animation: hinge-pose 1.45s ease-in-out infinite; transform-origin: 132px 204px; }

        @keyframes arrow-flow { to { stroke-dashoffset: -20; } }
        @keyframes load-pulse { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
        @keyframes svg-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes svg-swing-a { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(26deg); } }
        @keyframes svg-swing-b { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-26deg); } }
        @keyframes deadbug-reach-arm { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-38deg); } }
        @keyframes deadbug-reach-leg { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(34deg); } }
        @keyframes plank-brace { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes squat-pose { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(24px) scaleY(0.88); } }
        @keyframes step-pose { 0%, 100% { transform: translate(-18px, 0); } 50% { transform: translate(36px, -28px); } }
        @keyframes push-pose { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(14px); } }
        @keyframes push-arm-bend { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(18deg); } }
        @keyframes row-pose { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-7deg); } }
        @keyframes row-pull { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(28deg); } }
        @keyframes bridge-pose { 0%, 100% { transform: translateY(18px) rotate(0deg); } 50% { transform: translateY(-6px) rotate(-5deg); } }
        @keyframes lunge-pose { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(22px); } }
        @keyframes climber-front { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-38deg); } }
        @keyframes climber-back { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(30deg); } }
        @keyframes hinge-pose { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(28deg); } }

        .exercise-motion {
          position: relative;
          width: 100%;
          min-height: 260px;
          border-radius: 18px;
          overflow: hidden;
          background:
            radial-gradient(circle at 20% 18%, rgba(244, 63, 94, 0.12), transparent 28%),
            linear-gradient(180deg, #fff7ed 0%, #f8fafc 58%, #eef2ff 100%);
          border: 1px solid rgba(225, 229, 239, 0.9);
        }

        .motion-ground {
          position: absolute;
          left: 12%;
          right: 12%;
          bottom: 54px;
          height: 4px;
          border-radius: 999px;
          background: #cbd5e1;
        }

        .motion-platform {
          position: absolute;
          right: 18%;
          bottom: 54px;
          width: 74px;
          height: 26px;
          border-radius: 8px 8px 0 0;
          background: #e2e8f0;
          border: 1px solid #cbd5e1;
          display: none;
        }

        .motion-person {
          position: absolute;
          width: 112px;
          height: 150px;
          left: calc(50% - 56px);
          bottom: 56px;
          transform-origin: 50% 86%;
        }

        .motion-head,
        .motion-body,
        .motion-arm,
        .motion-leg {
          position: absolute;
          display: block;
          background: #0f172a;
        }

        .motion-head {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          left: 42px;
          top: 0;
          background: #fb7185;
          border: 4px solid #0f172a;
        }

        .motion-body {
          width: 8px;
          height: 58px;
          border-radius: 999px;
          left: 52px;
          top: 32px;
          transform-origin: 50% 0%;
        }

        .motion-arm,
        .motion-leg {
          width: 7px;
          border-radius: 999px;
          transform-origin: 50% 0%;
        }

        .motion-arm-left,
        .motion-arm-right {
          height: 50px;
          left: 52px;
          top: 42px;
        }

        .motion-leg-left,
        .motion-leg-right {
          height: 62px;
          left: 52px;
          top: 86px;
        }

        .motion-walk .motion-person {
          animation: guide-bob 1.1s ease-in-out infinite;
        }
        .motion-walk .motion-arm-left { animation: swing-left 1.1s ease-in-out infinite; }
        .motion-walk .motion-arm-right { animation: swing-right 1.1s ease-in-out infinite; }
        .motion-walk .motion-leg-left { animation: swing-right 1.1s ease-in-out infinite; }
        .motion-walk .motion-leg-right { animation: swing-left 1.1s ease-in-out infinite; }

        .motion-floor .motion-person {
          bottom: 48px;
          transform: rotate(-90deg) translateX(-8px);
        }
        .motion-floor .motion-arm-left { animation: deadbug-arm 1.4s ease-in-out infinite; }
        .motion-floor .motion-leg-right { animation: deadbug-leg 1.4s ease-in-out infinite; }
        .motion-floor .motion-arm-right { transform: rotate(-28deg); }
        .motion-floor .motion-leg-left { transform: rotate(24deg); }

        .motion-plank .motion-person {
          bottom: 50px;
          transform: rotate(-78deg) translateX(-6px);
          animation: plank-hold 1.6s ease-in-out infinite;
        }
        .motion-plank .motion-arm-left { transform: rotate(-68deg); }
        .motion-plank .motion-arm-right { transform: rotate(-68deg); opacity: 0.75; }
        .motion-plank .motion-leg-left { transform: rotate(76deg); }
        .motion-plank .motion-leg-right { transform: rotate(82deg); opacity: 0.75; }

        .motion-squat .motion-person { animation: squat-body 1.5s ease-in-out infinite; }
        .motion-squat .motion-arm-left { transform: rotate(-68deg); }
        .motion-squat .motion-arm-right { transform: rotate(68deg); }
        .motion-squat .motion-leg-left { animation: squat-left-leg 1.5s ease-in-out infinite; }
        .motion-squat .motion-leg-right { animation: squat-right-leg 1.5s ease-in-out infinite; }

        .motion-stepup .motion-platform { display: block; }
        .motion-stepup .motion-person { animation: step-up-body 1.4s ease-in-out infinite; }
        .motion-stepup .motion-arm-left { animation: swing-left 1.4s ease-in-out infinite; }
        .motion-stepup .motion-arm-right { animation: swing-right 1.4s ease-in-out infinite; }
        .motion-stepup .motion-leg-left { animation: step-up-leg 1.4s ease-in-out infinite; }
        .motion-stepup .motion-leg-right { transform: rotate(-12deg); }

        .motion-push .motion-person {
          bottom: 48px;
          transform: rotate(-72deg);
          animation: push-body 1.25s ease-in-out infinite;
        }
        .motion-push .motion-arm-left,
        .motion-push .motion-arm-right { animation: push-arms 1.25s ease-in-out infinite; }
        .motion-push .motion-leg-left { transform: rotate(78deg); }
        .motion-push .motion-leg-right { transform: rotate(82deg); opacity: 0.75; }

        .motion-row .motion-person {
          animation: row-body 1.4s ease-in-out infinite;
        }
        .motion-row .motion-arm-left,
        .motion-row .motion-arm-right { animation: row-arms 1.4s ease-in-out infinite; }
        .motion-row .motion-leg-left { transform: rotate(18deg); }
        .motion-row .motion-leg-right { transform: rotate(-18deg); }

        .motion-bridge .motion-person {
          bottom: 48px;
          transform: rotate(-90deg);
          animation: bridge-lift 1.4s ease-in-out infinite;
        }
        .motion-bridge .motion-arm-left { transform: rotate(85deg); }
        .motion-bridge .motion-arm-right { transform: rotate(85deg); opacity: 0.7; }
        .motion-bridge .motion-leg-left { transform: rotate(-62deg); }
        .motion-bridge .motion-leg-right { transform: rotate(-18deg); }

        .motion-lunge .motion-person { animation: lunge-body 1.45s ease-in-out infinite; }
        .motion-lunge .motion-arm-left { transform: rotate(-38deg); }
        .motion-lunge .motion-arm-right { transform: rotate(38deg); }
        .motion-lunge .motion-leg-left { animation: lunge-front 1.45s ease-in-out infinite; }
        .motion-lunge .motion-leg-right { animation: lunge-back 1.45s ease-in-out infinite; }

        .motion-climber .motion-person {
          bottom: 48px;
          transform: rotate(-72deg);
        }
        .motion-climber .motion-arm-left,
        .motion-climber .motion-arm-right { transform: rotate(-58deg); }
        .motion-climber .motion-leg-left { animation: climber-left 1s ease-in-out infinite; }
        .motion-climber .motion-leg-right { animation: climber-right 1s ease-in-out infinite; }

        .motion-hinge .motion-person { animation: hinge-body 1.45s ease-in-out infinite; }
        .motion-hinge .motion-arm-left,
        .motion-hinge .motion-arm-right { animation: hinge-arms 1.45s ease-in-out infinite; }
        .motion-hinge .motion-leg-left { transform: rotate(8deg); }
        .motion-hinge .motion-leg-right { transform: rotate(-8deg); }

        @keyframes guide-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes swing-left { 0%, 100% { transform: rotate(36deg); } 50% { transform: rotate(-36deg); } }
        @keyframes swing-right { 0%, 100% { transform: rotate(-36deg); } 50% { transform: rotate(36deg); } }
        @keyframes deadbug-arm { 0%, 100% { transform: rotate(-22deg); } 50% { transform: rotate(-86deg); } }
        @keyframes deadbug-leg { 0%, 100% { transform: rotate(18deg); } 50% { transform: rotate(76deg); } }
        @keyframes plank-hold { 0%, 100% { translate: 0 0; } 50% { translate: 0 -3px; } }
        @keyframes squat-body { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(34px); } }
        @keyframes squat-left-leg { 0%, 100% { transform: rotate(18deg); } 50% { transform: rotate(44deg); } }
        @keyframes squat-right-leg { 0%, 100% { transform: rotate(-18deg); } 50% { transform: rotate(-44deg); } }
        @keyframes step-up-body { 0%, 100% { transform: translate(-30px, 0); } 50% { transform: translate(20px, -26px); } }
        @keyframes step-up-leg { 0%, 100% { transform: rotate(32deg); } 50% { transform: rotate(-55deg); } }
        @keyframes push-body { 0%, 100% { translate: 0 0; } 50% { translate: -10px 16px; } }
        @keyframes push-arms { 0%, 100% { transform: rotate(-58deg); } 50% { transform: rotate(-28deg); } }
        @keyframes row-body { 0%, 100% { transform: rotate(18deg); } 50% { transform: rotate(38deg); } }
        @keyframes row-arms { 0%, 100% { transform: rotate(44deg); } 50% { transform: rotate(84deg); } }
        @keyframes bridge-lift { 0%, 100% { translate: 0 18px; } 50% { translate: 0 -4px; } }
        @keyframes lunge-body { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(24px); } }
        @keyframes lunge-front { 0%, 100% { transform: rotate(26deg); } 50% { transform: rotate(58deg); } }
        @keyframes lunge-back { 0%, 100% { transform: rotate(-22deg); } 50% { transform: rotate(-62deg); } }
        @keyframes climber-left { 0%, 100% { transform: rotate(78deg); } 50% { transform: rotate(12deg); } }
        @keyframes climber-right { 0%, 100% { transform: rotate(12deg); } 50% { transform: rotate(78deg); } }
        @keyframes hinge-body { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(42deg); } }
        @keyframes hinge-arms { 0%, 100% { transform: rotate(10deg); } 50% { transform: rotate(72deg); } }
      `}</style>
    </div>
  );
}
