const { useState, useEffect, useMemo, useCallback, useRef } = React;

// ─── localStorage helpers ───────────────────────────────────────────────────
function lsGet(key) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : null; } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function lsDel(key) { try { localStorage.removeItem(key); } catch {} }

// ─── Gemini API ─────────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.5-flash';
async function callGemini(prompt, maxTokens = 1200) {
  const apiKey = lsGet('qvolve-gemini-key');
  if (!apiKey) throw new Error('Geen API-sleutel ingesteld.');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens }
      })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.candidates || !data.candidates[0]) throw new Error('Geen antwoord van AI ontvangen.');
  return data.candidates[0].content.parts[0].text;
}

async function estimateFoodWithAI(description) {
  const text = await callGemini(
    `Schat de voedingswaarden van: "${description}". Geef ALLEEN een JSON object terug, niets anders, geen markdown: {"name":"...","kcal":number,"protein":number,"fat":number,"carbs":number,"portionDescription":"..."}`
  );
  return JSON.parse(text.replace(/```json|```/g,'').trim());
}

async function suggestMealWithAI(targets, mealLabel) {
  const parts = [];
  if (targets.kcal) parts.push(`${Math.round(targets.kcal)} kcal`);
  if (targets.protein) parts.push(`${Math.round(targets.protein)}g eiwit`);
  if (targets.fat) parts.push(`${Math.round(targets.fat)}g vet`);
  if (targets.carbs) parts.push(`${Math.round(targets.carbs)}g koolhydraten`);
  const text = await callGemini(
    `Stel een Belgische/Nederlandse maaltijd voor als ${mealLabel.toLowerCase()}, die voldoet aan: ${parts.join(', ')}. Geef ALLEEN JSON: {"title":"...","description":"...","kcal":number,"protein":number,"fat":number,"carbs":number}`
  );
  return JSON.parse(text.replace(/```json|```/g,'').trim());
}

// ─── Gebruikersbeheer ───────────────────────────────────────────────────────
const DEFAULT_PASSWORD  = "Qvolve123!";
const ADMIN_PASSWORD    = "QvolveAdmin!";
const USERS_KEY         = "qvolve-users-v2";
const NEVO_VERSION      = "2025/9.0";

const DEFAULT_USERS = [
  { name: "Alvin Broers",        password: DEFAULT_PASSWORD, mustChangePw: true },
  { name: "Anthony Van Goethem", password: DEFAULT_PASSWORD, mustChangePw: true },
  { name: "Quinten Brosens",     password: DEFAULT_PASSWORD, mustChangePw: true },
  { name: "Hanne Nelen",          password: DEFAULT_PASSWORD, mustChangePw: true },
];

function loadUsers() {
  const stored = lsGet(USERS_KEY);
  if (!stored || !Array.isArray(stored)) {
    lsSet(USERS_KEY, DEFAULT_USERS);
    return DEFAULT_USERS;
  }
  // Voeg nieuwe gebruikers uit DEFAULT_USERS toe als ze nog niet bestaan
  let updated = [...stored];
  let changed = false;
  for (const def of DEFAULT_USERS) {
    if (!updated.find(u => u.name.toLowerCase() === def.name.toLowerCase())) {
      updated.push(def);
      changed = true;
    }
  }
  if (changed) lsSet(USERS_KEY, updated);
  return updated;
}
function saveUsers(users) { lsSet(USERS_KEY, users); }

// ─── Inline SVG icons ───────────────────────────────────────────────────────
const icons = {
  Search:       <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus:         <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash2:       <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Settings:     <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  ChevronLeft:  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Loader2:      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
  Sparkles:     <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69h6.06l-4.9 3.56a1 1 0 0 0-.36 1.12L17.5 20l-4.9-3.56a1 1 0 0 0-1.18 0L6.5 20l1.87-5.87a1 1 0 0 0-.36-1.12L3.11 9.45h6.06a1 1 0 0 0 .95-.69z"/></svg>,
  X:            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Dumbbell:     <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><rect x="1" y="8" width="4" height="8" rx="1"/><rect x="19" y="8" width="4" height="8" rx="1"/><rect x="5" y="5" width="3" height="14" rx="1"/><rect x="16" y="5" width="3" height="14" rx="1"/></svg>,
  UtensilsCrossed: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2l6 6"/><path d="M9 2L3 8"/><path d="M6 8v13"/><path d="M21 2l-9.4 9.4"/><path d="M16.6 7.4L21 12l-5 5-4.4-4.4"/></svg>,
  Lock:         <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Calendar:     <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  ChefHat:      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>,
  RefreshCw:    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>,
  CheckCircle2: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>,
  Circle:       <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
  Key:          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>,
};

function Icon({ name, size = 16, className = '' }) {
  const el = icons[name];
  if (!el) return null;
  return React.cloneElement(el, { width: size, height: size, className: el.props.className ? `${el.props.className} ${className}` : className });
}

// ─── Constanten ──────────────────────────────────────────────────────────────
const ACTIVITY_FACTORS = {
  sedentary: { label: "Sedentair of heel weinig beweging", factor: 1.2 },
  moderate:  { label: "Matig actief (3-5x per week sporten)", factor: 1.55 },
  active:    { label: "Zeer actief (actieve job of 6-7x per week)", factor: 1.725 },
  veryActive:{ label: "Extra actief (actieve job én 6-7x per week sporten)", factor: 1.9 },
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
const MEAL_TIMES = [
  { key: "ontbijt",     label: "Ontbijt" },
  { key: "snack_vm",    label: "Snack voormiddag" },
  { key: "lunch",       label: "Lunch" },
  { key: "snack_nm",    label: "Snack namiddag" },
  { key: "diner",       label: "Diner" },
  { key: "snack_avond", label: "Snack avond" },
];

function slugifyName(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gebruiker';
}
function calcBMR({ weight, height, age, gender }) {
  return gender === 'man'
    ? 66.5 + 13.75*weight + 5.003*height - 6.755*age
    : 655.0 + 9.563*weight + 1.85*height - 4.676*age;
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
    carbsG = Math.round(Math.max(targetKcal - proteinG*4 - fatG*9, 0) / 4);
  } else {
    proteinG = Math.round((targetKcal * (mp.protein||0)) / 4);
    fatG = Math.round((targetKcal * (mp.fat||0)) / 9);
    if (mp.carbs != null) {
      carbsG = Math.round((targetKcal * mp.carbs) / 4);
    } else {
      carbsG = Math.round(Math.max(targetKcal - proteinG*4 - fatG*9, 0) / 4);
    }
  }
  const ratios = { protein: (proteinG*4)/targetKcal, fat: (fatG*9)/targetKcal, carbs: (carbsG*4)/targetKcal };
  return { targetKcal, proteinG, fatG, carbsG, bmr: Math.round(bmr), tdee: Math.round(tdee), ratios };
}
function applyKcalToMacros(macros, newKcal) {
  const r = macros.ratios || { protein:(macros.proteinG*4)/macros.targetKcal, fat:(macros.fatG*9)/macros.targetKcal, carbs:(macros.carbsG*4)/macros.targetKcal };
  const targetKcal = Math.max(Math.round(newKcal),0);
  const proteinG = Math.round((targetKcal*r.protein)/4);
  const fatG = Math.round((targetKcal*r.fat)/9);
  const carbsG = Math.round(Math.max(targetKcal-proteinG*4-fatG*9,0)/4);
  return { ...macros, targetKcal, proteinG, fatG, carbsG, ratios: r };
}
function toDateStr(d) { return d.toISOString().slice(0,10); }
function addDays(dateStr, n) { const d=new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+n); return toDateStr(d); }
function formatDateNice(dateStr) { return new Date(dateStr+'T00:00:00').toLocaleDateString('nl-BE',{weekday:'long',day:'numeric',month:'long'}); }
function groupByMeal(log) {
  const map = {}; for(const m of MEAL_TIMES) map[m.key]=[];
  for(const e of log) { const k=MEAL_TIMES.some(m=>m.key===e.mealTime)?e.mealTime:MEAL_TIMES[0].key; map[k].push(e); }
  return map;
}

