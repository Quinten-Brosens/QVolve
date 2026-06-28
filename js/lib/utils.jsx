// ─── lib/utils.jsx — localStorage, datum, sessie, misc helpers ────────────────
const { useState, useEffect, useMemo, useCallback, useRef } = React;

// localStorage helpers
function lsGet(key) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : null; } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function lsDel(key) { try { localStorage.removeItem(key); } catch {} }

// Vraag de browser om opslag niet zomaar te wissen.
function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist(); });
    }
  } catch {}
}

// Slugify (naam → url-vriendelijke key)
function slugifyName(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gebruiker';
}

// Datum helpers
function toDateStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return toDateStr(d); }
function formatDateNice(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
}
function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const wd = d.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

// Weekdag-offset voor weekschema-import (Maandag=0 … Zondag=6)
const DAG_OFFSET = { maandag: 0, dinsdag: 1, woensdag: 2, donderdag: 3, vrijdag: 4, zaterdag: 5, zondag: 6 };

// Maaltijdtijd normalisatie (AI-output → canonieke key)
const MEALTIME_MAP = {
  'ontbijt': 'ontbijt',
  'snack voormiddag': 'snack_vm', 'snack_vm': 'snack_vm', 'snack vm': 'snack_vm', 'voormiddag': 'snack_vm',
  'lunch': 'lunch', 'middagmaal': 'lunch',
  'snack namiddag': 'snack_nm', 'snack_nm': 'snack_nm', 'snack nm': 'snack_nm', 'namiddag': 'snack_nm',
  'diner': 'diner', 'avondmaal': 'diner', 'avondeten': 'diner',
  'snack avond': 'snack_avond', 'snack_avond': 'snack_avond', 'avondsnack': 'snack_avond',
};
function normalizeMealTime(mt) {
  if (!mt) return 'ontbijt';
  const k = String(mt).toLowerCase().trim();
  if (MEALTIME_MAP[k]) return MEALTIME_MAP[k];
  return MEAL_TIMES.some(m => m.key === k) ? k : 'ontbijt';
}
function groupByMeal(log) {
  const map = {}; for (const m of MEAL_TIMES) map[m.key] = [];
  for (const e of log) { const k = MEAL_TIMES.some(m => m.key === e.mealTime) ? e.mealTime : MEAL_TIMES[0].key; map[k].push(e); }
  return map;
}

// Lazy script laden (voor html5-qrcode)
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-src="' + src + '"]')) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Kon de bibliotheek niet laden.'));
    document.head.appendChild(s);
  });
}

// Camera-foutmeldingen begrijpelijk maken
function humanizeCamError(e) {
  const msg = (e && e.message) || String(e);
  if (/NotAllowed|Permission|denied/i.test(msg)) return 'Cameratoegang geweigerd. Sta de camera toe en probeer opnieuw.';
  if (/NotFound|Requested device|no camera/i.test(msg)) return 'Geen camera gevonden op dit toestel.';
  if (/secure|https/i.test(msg)) return 'De camera werkt enkel via https (of localhost).';
  if (/NotReadable|in use/i.test(msg)) return 'De camera is in gebruik door een andere app.';
  return 'Kon de camera niet starten: ' + msg;
}
