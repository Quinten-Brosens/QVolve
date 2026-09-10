// ─── modules/coach — het eerstvolgende eetmoment en twee voorstellen ─────────
// De coachkaart loopt de eetmomenten van MEAL_TIMES in volgorde af en stopt bij
// het eerste dat nog niet gelogd én niet overgeslagen is. De voorstellen komen
// zonder AI-oproep tot stand: eerst uit het weekschema van die weekdag, daarna
// uit wat je op dat moment het vaakst logde. Zo is de kaart altijd meteen klaar,
// ook offline.

const COACH_HISTORY_DAYS = 45; // hoever we terugkijken voor "wat je vaak eet"

// Overgeslagen momenten staan per dag in localStorage. De sleutel volgt het
// vaste patroon <soort>:<slug>:<extra>, dus hij gaat vanzelf mee in de back-up.
function coachSkipKey(userSlug, dateStr) { return `coach-skips:${userSlug}:${dateStr}`; }
function loadCoachSkips(userSlug, dateStr) { return lsGet(coachSkipKey(userSlug, dateStr)) || []; }
function saveCoachSkips(userSlug, dateStr, keys) { lsSet(coachSkipKey(userSlug, dateStr), keys); }

// Het eerstvolgende eetmoment waar nog niets voor staat.
function nextMoment(log, skipped) {
  const gedaan = new Set([...(log || []).map(e => normalizeMealTime(e.mealTime)), ...(skipped || [])]);
  return MEAL_TIMES.find(m => !gedaan.has(m.key)) || null;
}

// Voorstel uit het opgeslagen weekschema, voor de weekdag van deze datum.
function planSuggestion(userSlug, dateStr, momentKey) {
  const plan = lsGet(`weekschema-plan:${userSlug}`);
  if (!plan || !Array.isArray(plan.days)) return null;
  const weekdag = new Date(dateStr + 'T00:00:00').toLocaleDateString('nl-BE', { weekday: 'long' }).toLowerCase();
  const dag = plan.days.find(d => String(d.day || '').toLowerCase() === weekdag);
  if (!dag || !Array.isArray(dag.meals)) return null;
  const meal = dag.meals.find(m => normalizeMealTime(m.mealTime) === momentKey);
  if (!meal) return null;
  return {
    id: `plan-${momentKey}`,
    name: meal.name,
    kcal: Number(meal.kcal) || 0,
    protein: Number(meal.protein) || 0,
    fat: Number(meal.fat) || 0,
    carbs: Number(meal.carbs) || 0,
    ingredients: meal.ingredients,
    source: 'weekschema',
    herkomst: 'uit je weekschema',
  };
}

// Voorstellen uit de loggeschiedenis: wat je op dit eetmoment het vaakst at.
// Dezelfde naam op verschillende dagen telt op; de laatst gelogde waarden winnen,
// zodat het voorstel de portie weerspiegelt die je gewoonlijk neemt.
function historySuggestions(userSlug, dateStr, momentKey, limit) {
  const geteld = new Map();
  for (let i = 1; i <= COACH_HISTORY_DAYS; i++) {
    const dag = lsGet(`daily-log:${userSlug}:${addDays(dateStr, -i)}`);
    if (!Array.isArray(dag)) continue;
    for (const e of dag) {
      if (normalizeMealTime(e.mealTime) !== momentKey) continue;
      if (!e.name || !(e.kcal > 0)) continue;
      const sleutel = e.name.toLowerCase();
      const vorig = geteld.get(sleutel);
      // Nieuwere dagen komen eerst langs, dus alleen de eerste vulling bewaren.
      if (vorig) { vorig.n++; continue; }
      geteld.set(sleutel, {
        n: 1,
        item: {
          id: `hist-${sleutel}`,
          name: e.name,
          kcal: e.kcal, protein: e.protein || 0, fat: e.fat || 0, carbs: e.carbs || 0,
          grams: e.grams || null,
          ingredients: e.ingredients,
          source: 'historiek',
          herkomst: 'eet je vaak',
        },
      });
    }
  }
  return [...geteld.values()].sort((a, b) => b.n - a.n).slice(0, limit).map(v => v.item);
}

// Weekschema eerst, daarna de historiek — zonder dubbels, maximaal twee.
function coachSuggestions(userSlug, dateStr, momentKey) {
  const uit = [];
  const plan = planSuggestion(userSlug, dateStr, momentKey);
  if (plan) uit.push(plan);
  for (const h of historySuggestions(userSlug, dateStr, momentKey, 3)) {
    if (uit.length >= 2) break;
    if (uit.some(s => s.name.toLowerCase() === h.name.toLowerCase())) continue;
    uit.push(h);
  }
  return uit;
}

// De begeleidende zin onder de vraag — stuurt op eiwit zolang dat achterloopt.
function coachLine(moment, remaining) {
  if (!moment) return 'Je dag is compleet. Alles gelogd — mooi gedaan.';
  if (!remaining) return 'Stel eerst je profiel in, dan reken ik mee.';
  const kcal = Math.round(remaining.kcal), eiwit = Math.round(remaining.protein);
  if (kcal <= 0) return 'Je budget is op. Kies iets licht, of laat dit moment leeg.';
  if (eiwit > 30) return `Je hebt nog ${eiwit} g eiwit nodig. Iets met kwark of vlees brengt je er bijna.`;
  if (eiwit > 0) return `Nog ${eiwit} g eiwit en ${kcal} kcal over. Ruim genoeg.`;
  return 'Je eiwit zit erop. De rest van je budget mag je vrij besteden.';
}

const COACH_VRAGEN = {
  ontbijt:     { tag: 'Ochtend',    vraag: 'Wat eet je als ontbijt?' },
  snack_vm:    { tag: 'Voormiddag', vraag: 'Iets tussendoor voor de lunch?' },
  lunch:       { tag: 'Middag',     vraag: 'Wat wordt de lunch?' },
  snack_nm:    { tag: 'Namiddag',   vraag: 'Wat neem je bij de namiddagsnack?' },
  diner:       { tag: 'Avond',      vraag: 'Wat staat er op het menu vanavond?' },
  snack_avond: { tag: 'Laat',       vraag: 'Nog een snack voor het slapen?' },
};

// ─── De kaart zelf ────────────────────────────────────────────────────────────
function CoachCard({ userSlug, dateStr, moment, remaining, onPick, onSkip, onSearch }) {
  const suggesties = useMemo(
    () => (moment ? coachSuggestions(userSlug, dateStr, moment.key) : []),
    [userSlug, dateStr, moment && moment.key]
  );
  const vraag = moment ? COACH_VRAGEN[moment.key] : null;

  return (
    <div className="bg-[#182a48] rounded-[26px] px-[22px] py-6" style={{ animation: 'qv-card .32s cubic-bezier(.22,1,.36,1)' }}>
      <Eyebrow color={QV.orange}>{vraag ? vraag.tag : 'Klaar'}</Eyebrow>
      <p className="mt-2.5 mb-0 font-logo font-bold text-[27px] leading-[1.15] text-white tracking-[-.01em]">
        {vraag ? vraag.vraag : 'Alles voor vandaag staat erin.'}
      </p>
      <p className="mt-2.5 mb-0 text-sm leading-relaxed text-white/75" style={{ textWrap: 'pretty' }}>
        {coachLine(moment, remaining)}
      </p>

      {moment && (
        <>
          <div className="flex gap-2 mt-5">
            {suggesties.map((s, i) => (
              <button key={s.id} onClick={() => onPick(s, moment.key)}
                className={`flex-1 min-w-0 rounded-[18px] px-3 py-3.5 text-center active:scale-[.97] transition-transform border
                  ${i === 0 ? 'bg-white border-white' : 'bg-white/10 border-white/25'}`}>
                <p className={`m-0 font-logo font-bold text-base truncate ${i === 0 ? 'text-[#14223c]' : 'text-white'}`}>{s.name}</p>
                <p className={`mt-1 mb-0 text-[11px] font-medium ${i === 0 ? 'text-[#4a5568]' : 'text-white/70'}`}>
                  {Math.round(s.kcal)} kcal · {Math.round(s.protein)} g E
                </p>
              </button>
            ))}
            <button onClick={() => onSearch(moment.key)} aria-label={`Zoek iets voor ${moment.label.toLowerCase()}`}
              className={`${suggesties.length ? 'w-[50px]' : 'flex-1 gap-2'} bg-white/10 border border-white/25 rounded-[18px]
                flex items-center justify-center text-white active:scale-95 transition-transform py-3.5`}>
              <Icon name="Search" size={18}/>
              {suggesties.length === 0 && <span className="font-semibold text-sm">Zoek een product</span>}
            </button>
          </div>
          <button onClick={() => onSkip(moment.key)}
            className="w-full mt-3.5 text-center font-semibold text-[13px] text-white/55 active:text-white/80">
            Sla {moment.label.toLowerCase()} over
          </button>
        </>
      )}
    </div>
  );
}
