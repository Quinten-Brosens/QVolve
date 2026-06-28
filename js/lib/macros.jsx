// ─── lib/macros.jsx — constanten en macro-berekeningen ────────────────────────
const NEVO_VERSION = "2025/9.0";

const MEAL_TIMES = [
  { key: "ontbijt",     label: "Ontbijt" },
  { key: "snack_vm",    label: "Snack voormiddag" },
  { key: "lunch",       label: "Lunch" },
  { key: "snack_nm",    label: "Snack namiddag" },
  { key: "diner",       label: "Diner" },
  { key: "snack_avond", label: "Snack avond" },
];

const ACTIVITY_FACTORS = {
  sedentary:  { label: "Sedentair of heel weinig beweging", factor: 1.2 },
  moderate:   { label: "Matig actief (3-5x per week sporten)", factor: 1.55 },
  active:     { label: "Zeer actief (actieve job of 6-7x per week)", factor: 1.725 },
  veryActive: { label: "Extra actief (actieve job én 6-7x per week sporten)", factor: 1.9 },
};

const GOALS = {
  cut:      { label: "Vet verliezen", kcalAdjustPct: -0.2 },
  maintain: { label: "Op gewicht blijven", kcalAdjustPct: 0 },
  bulk:     { label: "Spieropbouw / aankomen", kcalAdjustPct: 0.15 },
};

const SPORTER_TYPES = {
  none:      { label: "Geen vaste sporter", proteinPerKg: 1.4 },
  endurance: { label: "Duursporter (lopen, fietsen, zwemmen, ...)", proteinPerKg: 1.6 },
  other:     { label: "Andere sporter (kracht, fitness, team, ...)", proteinPerKg: 1.8 },
};

const MACRO_PROFILES = {
  normal:      { label: "Normaal (op basis van type sporter)", type: "fitchef" },
  highProtein: { label: "High protein (41% eiwit / 22% vet / 37% KH)", type: "percent", protein: 0.41, fat: 0.22, carbs: 0.37 },
  keto:        { label: "Keto (70% vet / 20% eiwit)", type: "percent", fat: 0.7, protein: 0.2 },
};

function calcBMR({ weight, height, age, gender }) {
  return gender === 'man'
    ? 66.5 + 13.75 * weight + 5.003 * height - 6.755 * age
    : 655.0 + 9.563 * weight + 1.85 * height - 4.676 * age;
}

function calcMacros(profile) {
  const bmr = calcBMR(profile);
  const activity = ACTIVITY_FACTORS[profile.activity] || ACTIVITY_FACTORS.moderate;
  const tdee = bmr * activity.factor;
  const goal = GOALS[profile.goal] || GOALS.maintain;
  const targetKcal = Math.round(tdee * (1 + goal.kcalAdjustPct));
  const mp = MACRO_PROFILES[profile.macroProfile] || MACRO_PROFILES.normal;
  let proteinG, fatG, carbsG;
  if (mp.type === 'fitchef') {
    const sp = SPORTER_TYPES[profile.sporterType] || SPORTER_TYPES.other;
    proteinG = Math.round(profile.weight * sp.proteinPerKg);
    fatG = Math.round(profile.weight * 1);
    carbsG = Math.round(Math.max(targetKcal - proteinG * 4 - fatG * 9, 0) / 4);
  } else {
    proteinG = Math.round((targetKcal * (mp.protein || 0)) / 4);
    fatG = Math.round((targetKcal * (mp.fat || 0)) / 9);
    carbsG = mp.carbs != null
      ? Math.round((targetKcal * mp.carbs) / 4)
      : Math.round(Math.max(targetKcal - proteinG * 4 - fatG * 9, 0) / 4);
  }
  const ratios = { protein: (proteinG * 4) / targetKcal, fat: (fatG * 9) / targetKcal, carbs: (carbsG * 4) / targetKcal };
  return { targetKcal, proteinG, fatG, carbsG, bmr: Math.round(bmr), tdee: Math.round(tdee), ratios };
}

function applyKcalToMacros(macros, newKcal) {
  const r = macros.ratios || { protein: (macros.proteinG * 4) / macros.targetKcal, fat: (macros.fatG * 9) / macros.targetKcal, carbs: (macros.carbsG * 4) / macros.targetKcal };
  const targetKcal = Math.max(Math.round(newKcal), 0);
  const proteinG = Math.round((targetKcal * r.protein) / 4);
  const fatG = Math.round((targetKcal * r.fat) / 9);
  const carbsG = Math.round(Math.max(targetKcal - proteinG * 4 - fatG * 9, 0) / 4);
  return { ...macros, targetKcal, proteinG, fatG, carbsG, ratios: r };
}
