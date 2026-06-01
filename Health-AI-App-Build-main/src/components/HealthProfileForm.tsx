import React from 'react';
import { HealthProfile } from '../types';
import { Activity, ShieldAlert, BadgeDollarSign, Swords, HeartPulse, User } from 'lucide-react';

interface Props {
  profile: HealthProfile;
  onChange: (profile: HealthProfile) => void;
  isLoading: boolean;
  onGenerateRecommendations: () => void;
}

const COMMON_CONDITIONS = [
  { id: 'diabetes', label: 'Diabetes / Elevated Glucose' },
  { id: 'hypertension', label: 'Hypertension (High BP)' },
  { id: 'obesity', label: 'Overweight / Obesity' },
  { id: 'cholesterol', label: 'High Cholesterol (Dyslipidemia)' },
  { id: 'anemia', label: 'Iron-Deficiency Anemia Risks' },
  { id: 'none', label: 'None (General Prevention)' },
];

export default function HealthProfileForm({ profile, onChange, isLoading, onGenerateRecommendations }: Props) {
  const setField = (field: keyof HealthProfile, value: any) => {
    onChange({
      ...profile,
      [field]: value,
    });
  };

  const toggleCondition = (conditionId: string) => {
    let current = [...profile.healthConditions];
    if (conditionId === 'none') {
      current = ['none'];
    } else {
      current = current.filter((c) => c !== 'none');
      if (current.includes(conditionId)) {
        current = current.filter((c) => c !== conditionId);
      } else {
        current.push(conditionId);
      }
    }
    if (current.length === 0) {
      current = ['none'];
    }
    setField('healthConditions', current);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
          <HeartPulse className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-lg text-slate-800">1. Health & Lifestyle Profile</h2>
          <p className="text-xs text-slate-500">Tailors AI recommendations and risk warnings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(profile.age === 0 || profile.weight === 0 || profile.height === 0) && (
          <div className="col-span-full text-[10px] text-red-600 mb-2 px-2 py-1 bg-red-50 border border-red-100 rounded-md">
            All three fields are required: age, weight, and height.
          </div>
        )}
        {/* Age and Gender */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Age (years)</label>
          {(profile.age !== 0 && (profile.age < 12 || profile.age > 120)) && (
            <p className="text-[10px] text-red-600 mb-1">Age must be between 12 and 120 years.</p>
          )}
          <input
            type="number"
            name="age"
            min="12"
            max="120"
            value={profile.age === 0 ? "" : profile.age}
            onChange={(e) => {
              const val = e.target.value;
              const parsed = parseInt(val, 10);
              setField('age', val === "" || Number.isNaN(parsed) ? 0 : parsed);
            }}
            onBlur={() => {
              if (profile.age !== 0) {
                if (profile.age < 12) setField('age', 12);
                else if (profile.age > 120) setField('age', 120);
              }
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Gender</label>
          <div className="grid grid-cols-3 gap-2">
            {(['male', 'female', 'other'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setField('gender', g)}
                className={`py-2 text-xs font-medium rounded-lg capitalize border transition-all ${
                  profile.gender === g
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Weight and Height */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Weight (kg)</label>
          {(profile.weight !== 0 && (profile.weight < 30 || profile.weight > 500)) && (
            <p className="text-[10px] text-red-600 mb-1">Weight must be between 30 and 500 kg.</p>
          )}
          <input
            type="number"
            name="weight"
            min="30"
            max="500"
            value={profile.weight === 0 ? "" : profile.weight}
            onChange={(e) => {
              const val = e.target.value;
              const parsed = parseFloat(val);
              setField('weight', val === "" || Number.isNaN(parsed) ? 0 : parsed);
            }}
            onBlur={() => {
              if (profile.weight !== 0) {
                if (profile.weight < 30) setField('weight', 30);
                else if (profile.weight > 500) setField('weight', 500);
              }
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Height (cm)</label>
          {(profile.height !== 0 && (profile.height < 100 || profile.height > 270)) && (
            <p className="text-[10px] text-red-600 mb-1">Height must be between 100 and 270 cm.</p>
          )}
          <input
            type="number"
            min="100"
            max="270"
            value={profile.height === 0 ? "" : profile.height}
            onChange={(e) => {
              const val = e.target.value;
              const parsed = parseFloat(val);
              setField('height', val === "" || Number.isNaN(parsed) ? 0 : parsed);
            }}
            onBlur={() => {
              if (profile.height !== 0) {
                if (profile.height < 100) setField('height', 100);
                else if (profile.height > 270) setField('height', 270);
              }
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Activity Level */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          Daily Physical Activity Level
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { id: 'sedentary', title: 'Sedentary', desc: 'Mainly sitting (e.g., Desk worker, driver)' },
            { id: 'lightly_active', title: 'Lightly Active', desc: 'Light walks, basic house errands' },
            { id: 'moderately_active', title: 'Moderately Active', desc: 'Regular exercise or active floor movement' },
            { id: 'very_active', title: 'Very Active', desc: 'Heavy physical labor, athlete' },
          ].map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => setField('activityLevel', act.id)}
              className={`p-3 text-left rounded-xl border text-xs transition-all flex flex-col justify-between ${
                profile.activityLevel === act.id
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-500'
                  : 'border-slate-100 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="font-semibold block mb-0.5">{act.title}</span>
              <span className="text-[10px] text-slate-500 leading-tight">{act.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Health Risk Predisposition */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          Existing Health Issues / Focus Conditions
        </label>
        <div className="grid grid-cols-2 gap-2">
          {COMMON_CONDITIONS.map((cond) => {
            const isSelected = profile.healthConditions.includes(cond.id);
            return (
              <button
                key={cond.id}
                type="button"
                onClick={() => toggleCondition(cond.id)}
                className={`py-2 px-3 text-left rounded-lg text-xs border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'border-amber-50 bg-amber-50/70 text-amber-900 font-medium'
                    : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="rounded text-amber-500 focus:ring-amber-500 w-3 h-3 pointer-events-none"
                />
                <span className="truncate">{cond.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget & Dietary Preferences */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BadgeDollarSign className="w-3.5 h-3.5 text-emerald-600" />
            BDT Budget Preference
          </label>
          <select
            value={profile.budgetPreference}
            onChange={(e) => setField('budgetPreference', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="budget">Budget-Conscious (Economical Bazar Items)</option>
            <option value="moderate">Moderate (Standard Grocery Budget)</option>
            <option value="premium">Premium (Diverse Sourced Ingredients)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            Dietary Limit
          </label>
          <select
            value={profile.dietaryPreference}
            onChange={(e) => setField('dietaryPreference', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="none">Standard Diet (No Restrictions)</option>
            <option value="halal">Halal Preferred</option>
            <option value="vegetarian">Vegetarian (Pure-Veg / Lacto-Veg)</option>
            <option value="vegan">Vegan (Strict Plant-Based)</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerateRecommendations}
        disabled={isLoading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4 cursor-pointer"
      >
        <span className="font-semibold">Generate AI Nutrition Plan</span>
        <span>→</span>
      </button>
    </div>
  );
}
