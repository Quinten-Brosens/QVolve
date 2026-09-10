// ─── modules/weekschema — vragenlijst, schema genereren, importeren ───────────

const VRAGENLIJST = [
  { id: 'budget', label: 'Weekbudget voor boodschappen?', type: 'single', options: [
    { value: 'heel_laag', label: '💰 Heel laag — zo goedkoop mogelijk, maaltijden mogen veel herhalen (< €30/week)' },
    { value: 'laag', label: 'Laag (€30–€50/week)' },
    { value: 'gemiddeld', label: 'Gemiddeld (€50–€80/week)' },
    { value: 'hoog', label: 'Hoog — gevarieerde ingrediënten, geen compromis (€80+/week)' },
  ]},
  { id: 'variatie', label: 'Hoeveel variatie wil je in je weekmenu?', type: 'single', options: [
    { value: 'minimaal', label: '🔄 Minimaal — dezelfde maaltijden zo veel mogelijk herhalen (makkelijk & goedkoop)' },
    { value: 'deels', label: '🔁 Gedeeltelijk — ontbijt & lunch mogen herhalen, diner varieert' },
    { value: 'veel', label: '🌈 Veel — elke dag iets anders, ik hou van afwisseling' },
  ]},
  { id: 'ontbijt', label: 'Wat eet je graag als ontbijt? Wees concreet.', type: 'text', placeholder: 'bv. havermout met banaan en chiazaad, boterhammen met kaas, eieren met groenten, kwark met fruit...' },
  { id: 'lunch', label: 'Hoe wil je jouw lunch?', type: 'single', options: [
    { value: 'warm', label: '🍲 Warm (soep, restjes van gisteren, warme pasta...)' },
    { value: 'koud', label: '🥪 Koud (boterham, wrap, salade)' },
    { value: 'gemengd', label: '🔄 Afwisselend — beide is prima' },
  ]},
  { id: 'kooktijd', label: 'Hoeveel tijd wil je kwijt aan het avondmaal koken?', type: 'single', options: [
    { value: 'snel', label: '⚡ Snel (< 20 min — simpel en efficiënt)' },
    { value: 'normaal', label: '🕐 Normaal (20–40 min)' },
    { value: 'uitgebreid', label: '👨‍🍳 Uitgebreid (40+ min — ik kook graag)' },
  ]},
  { id: 'eetstijl', label: 'Welke eetstijl past bij jou?', type: 'multi', options: [
    { value: 'belgisch', label: '🇧🇪 Klassiek Belgisch/Hollands' },
    { value: 'mediterraan', label: '🫒 Mediterraan' },
    { value: 'aziatisch', label: '🍜 Aziatisch' },
    { value: 'mexicaans', label: '🌮 Mexicaans' },
    { value: 'gemengd', label: '🌍 Alles door elkaar' },
  ]},
  { id: 'dieet', label: 'Voedingsrestricties of voorkeuren?', type: 'multi', options: [
    { value: 'geen', label: 'Geen restricties' },
    { value: 'glutenvrij', label: 'Glutenvrij' },
    { value: 'lactosevrij', label: 'Lactosevrij' },
    { value: 'vegetarisch', label: 'Vegetarisch' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'halal', label: 'Halal' },
  ]},
  { id: 'niet_lust', label: 'Wat eet je absoluut niet? (of allergieën)', type: 'text', placeholder: 'bv. lever, spruitjes, garnalen, noten...' },
  { id: 'snacks', label: 'Snacks tussendoor?', type: 'multi', options: [
    { value: 'fruit', label: '🍎 Fruit' },
    { value: 'noten', label: '🥜 Noten' },
    { value: 'kwark', label: '🥛 Kwark/yoghurt' },
    { value: 'proteïnereep', label: '💪 Proteïnereep' },
    { value: 'groenten', label: '🥕 Rauwkost' },
    { value: 'geen', label: '🚫 Liever geen snacks' },
  ]},
  { id: 'extra', label: 'Nog iets anders dat het schema moet weten?', type: 'text', placeholder: "bv. ik sport 's ochtends, gezin van 4, ik werk in ploegen, ik wil veel eiwit bij het ontbijt..." },
];

function buildSchemaPrompt(macros, prefs) {
  const variatie = prefs.variatie || 'deels';
  const varTip = variatie === 'minimaal'
    ? 'Herhaal maaltijden MAXIMAAL. Gebruik hetzelfde ontbijt elke dag, dezelfde lunch elke dag, en beperk het aantal verschillende diners tot 2-3 in de week. Kies goedkope basisingrediënten (kip, eieren, havermout, rijst, pasta).'
    : variatie === 'veel'
    ? 'Zoveel mogelijk variatie — elke dag andere maaltijden en andere ingrediënten.'
    : 'Ontbijt en lunch mogen dagelijks herhalen, maar varieer de diners.';

  return `Je bent een professionele sportdiëtist. Stel een 7-daags weekmenu op.

## Macro-doelen per dag
- Calorieën: ${Math.round(macros.targetKcal)} kcal · Eiwit: ${Math.round(macros.proteinG)}g · Vet: ${Math.round(macros.fatG)}g · KH: ${Math.round(macros.carbsG)}g

## Voorkeuren
Budget: ${prefs.budget || 'gemiddeld'} · Kooktijd avondmaal: ${prefs.kooktijd || 'normaal'}
Variatie-instructie: ${varTip}
Ontbijt (concreet gewenst): ${prefs.ontbijt || 'vrij te kiezen'}
Lunch voorkeur: ${prefs.lunch || 'gemengd'}
Eetstijl: ${(prefs.eetstijl || []).join(', ') || 'gemengd'} · Dieet: ${(prefs.dieet || []).join(', ') || 'geen'}
Absoluut niet eten / allergieën: ${prefs.niet_lust || 'niets specifieks'}
Snacks: ${(prefs.snacks || []).join(', ') || 'vrij'}
Extra info: ${prefs.extra || 'geen'}

## Instructies
- 7 dagen, 6 maaltijden per dag. Gebruik voor "mealTime" EXACT deze keys:
  ontbijt, snack_vm, lunch, snack_nm, diner, snack_avond
- "day" is de Nederlandse weekdagnaam: Maandag, Dinsdag, ... Zondag
- Ingrediënten met exacte hoeveelheden (bv. "150g kipfilet", "200ml melk")
- BELANGRIJK — macro's: tel per maaltijd de kcal/eiwit/vet/koolhydraten op tot een dagtotaal,
  en pas de hoeveelheden net zo lang aan tot elk dagtotaal binnen ±5% van de macro-doelen
  hierboven valt (zowel calorieën als eiwit, vet én koolhydraten). Vul daarna het "totals"-veld
  per dag in met die werkelijk berekende som — niet met de doelwaarden.
- Reken nauwkeurig; een schema dat de macro's niet haalt is fout.
- ALLEEN JSON terug, geen markdown

{"days":[{"day":"Maandag","meals":[{"mealTime":"snack_vm","name":"...","ingredients":["80g havermout","200ml melk"],"tip":"...","kcal":0,"protein":0,"fat":0,"carbs":0}],"totals":{"kcal":0,"protein":0,"fat":0,"carbs":0}}],"shoppingList":[{"category":"Vlees & vis","items":["..."]}]}`;
}

function VragenlijstStap({ vraag, waarde, onChange }) {
  if (vraag.type === 'single') return (
    <div className="space-y-2">
      {vraag.options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`w-full text-left px-4 py-3.5 rounded-2xl border text-[15px] transition-colors ${waarde === opt.value ? 'border-[#182a48] bg-[#182a48] text-white font-semibold' : 'border-[#dfe3ea] bg-[#f7f5f0] text-[#14223c]'}`}>
          {waarde === opt.value ? <Icon name="CheckCircle2" size={15} className="inline mr-2.5 text-[#f97316]"/> : <Icon name="Circle" size={15} className="inline mr-2.5 text-[#cfd6e2]"/>}{opt.label}
        </button>
      ))}
    </div>
  );
  if (vraag.type === 'multi') {
    const sel = Array.isArray(waarde) ? waarde : [];
    return (
      <div className="space-y-2">
        {vraag.options.map(opt => {
          const isSel = sel.includes(opt.value);
          return (
            <button key={opt.value} onClick={() => onChange(isSel ? sel.filter(v => v !== opt.value) : [...sel, opt.value])}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border text-[15px] transition-colors ${isSel ? 'border-[#182a48] bg-[#182a48] text-white font-semibold' : 'border-[#dfe3ea] bg-[#f7f5f0] text-[#14223c]'}`}>
              {isSel ? <Icon name="CheckCircle2" size={15} className="inline mr-2.5 text-[#f97316]"/> : <Icon name="Circle" size={15} className="inline mr-2.5 text-[#cfd6e2]"/>}{opt.label}
            </button>
          );
        })}
      </div>
    );
  }
  return <textarea value={waarde || ''} onChange={e => onChange(e.target.value)} placeholder={vraag.placeholder} rows={3}
    className="w-full bg-[#f7f5f0] border border-[#dfe3ea] rounded-2xl px-4 py-3.5 text-[15px] text-[#14223c] resize-none focus:outline-none focus:border-[#182a48]" />;
}

function printWeekSchema(plan) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const label = mt => { const m = MEAL_TIMES.find(x => x.key === normalizeMealTime(mt)); return m ? m.label : mt; };
  let h = '<h1>Qvolve weekschema</h1>';
  (plan.days || []).forEach(dag => {
    h += `<h2>${esc(dag.day)}</h2>`;
    (dag.meals || []).forEach(m => {
      h += `<div class="meal"><div class="mt">${esc(label(m.mealTime))} — <b>${esc(m.name)}</b> <span class="mac">${Math.round(m.kcal || 0)} kcal · ${Math.round(m.protein || 0)}g E · ${Math.round(m.fat || 0)}g V · ${Math.round(m.carbs || 0)}g K</span></div>`;
      if (Array.isArray(m.ingredients) && m.ingredients.length) h += `<ul>${m.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
      if (m.tip) h += `<p class="tip">💡 ${esc(m.tip)}</p>`;
      h += '</div>';
    });
    if (dag.totals) h += `<p class="tot">Dagtotaal: ${Math.round(dag.totals.kcal)} kcal · ${Math.round(dag.totals.protein)}g eiwit · ${Math.round(dag.totals.fat)}g vet · ${Math.round(dag.totals.carbs)}g KH</p>`;
  });
  if (Array.isArray(plan.shoppingList) && plan.shoppingList.length) {
    h += '<h2>Boodschappenlijst</h2>';
    plan.shoppingList.forEach(c => { h += `<h3>${esc(c.category)}</h3><ul>${(c.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`; });
  }
  const css = 'body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:820px;margin:24px auto;padding:0 16px}h1{color:#f97316;margin:0 0 12px}h2{border-bottom:2px solid #1e3a8a;color:#1e3a8a;margin:22px 0 6px;padding-bottom:2px}h3{margin:10px 0 2px;font-size:14px}.meal{margin:6px 0 12px}.mt{font-size:14px}.mac{color:#666;font-size:12px}ul{margin:4px 0 4px 18px;padding:0}li{font-size:13px;margin:1px 0}.tip{font-size:12px;color:#888;font-style:italic;margin:2px 0}.tot{font-size:12px;color:#333;background:#f4f4f5;padding:4px 8px;border-radius:4px;display:inline-block}@media print{h2{page-break-after:avoid}.meal{page-break-inside:avoid}}';
  const w = window.open('', '_blank');
  if (!w) { alert('Sta pop-ups toe om het schema af te drukken.'); return; }
  w.document.write(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Qvolve weekschema</title><style>${css}</style></head><body>${h}</body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
}

function ImportSchemaModal({ plan, onImport, onClose, onGoToVoeding }) {
  const comingMonday = () => { const d = new Date(); const wd = d.getDay(); const diff = (1 - wd + 7) % 7; d.setDate(d.getDate() + diff); return toDateStr(d); };
  const [startDate, setStartDate] = useState(comingMonday());
  const [weeks, setWeeks] = useState(1);
  const [done, setDone] = useState(null);
  const monday = mondayOf(startDate);
  function go() { const w = Math.max(1, Math.min(parseInt(weeks) || 0, 12)); const r = onImport(plan, startDate, w); setDone({ ...r, w }); }
  return (
    <Sheet onClose={onClose}>
      <p className="m-0 mb-4 font-logo font-bold text-2xl text-[#14223c] shrink-0">Schema importeren</p>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4">
        {done ? (
          <div className="text-center py-4">
            <Icon name="CheckCircle2" size={32} className="mx-auto text-[#2f8bff] mb-3"/>
            <p className="m-0 text-[15px] text-[#14223c]">
              Schema geladen vanaf <b className="capitalize">{formatDateNice(done.monday)}</b>, voor <b>{done.w}</b> {done.w === 1 ? 'week' : 'weken'} ({done.count} dagen).
            </p>
            <div className="mt-5">
              <PrimaryButton onClick={() => { onClose(); onGoToVoeding && onGoToVoeding(); }}>Naar vandaag</PrimaryButton>
            </div>
          </div>
        ) : (
          <>
            <div>
              <Eyebrow className="mb-1.5">Vanaf welke datum</Eyebrow>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-[#dfe3ea] rounded-xl px-3 py-2.5 text-sm text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
              <p className="mt-1.5 mb-0 text-[12px] text-[#8494aa]">
                Start op de maandag van die week: <b className="capitalize text-[#4a5568]">{formatDateNice(monday)}</b>. Maandag naar maandag, dinsdag naar dinsdag, …
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[15px] text-[#4a5568]">Aanhouden voor</span>
              <input type="number" min="1" max="12" value={weeks} onChange={e => setWeeks(e.target.value)}
                className="w-16 border border-[#dfe3ea] rounded-xl px-3 py-2 text-center font-logo font-semibold text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
              <span className="text-[15px] text-[#4a5568]">{(parseInt(weeks) || 0) === 1 ? 'week' : 'weken'}</span>
            </div>
            <p className="m-0 text-[13px] text-[#c2410c] bg-[#f7f5f0] border border-[#dfe3ea] rounded-xl px-4 py-3">
              Let op: bestaande voeding op die dagen wordt overschreven.
            </p>
            <PrimaryButton onClick={go}>Importeren</PrimaryButton>
          </>
        )}
      </div>
    </Sheet>
  );
}

// ─── Week — het tabblad met het schema ───────────────────────────────────────
// Zolang er geen schema is, staat hier de vragenlijst. Daarna de zeven dagen met
// hun maaltijden. De dagnummers zijn die van de lopende week: zo landt het
// schema precies zoals je het hier ziet wanneer je het importeert.
function WeekSchemaPanel({ macros, userSlug, onImport, onGoToVoeding, onGoToLijst }) {
  const [fase, setFase] = useState('loading');
  const [stapIndex, setStapIndex] = useState(0);
  const [antwoorden, setAntwoorden] = useState({});
  const [plan, setPlan] = useState(null);
  const [genError, setGenError] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [showShopping, setShowShopping] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const prefs = lsGet(`weekschema-prefs:${userSlug}`);
    const savedPlan = lsGet(`weekschema-plan:${userSlug}`);
    if (prefs) setAntwoorden(prefs);
    if (savedPlan) { setPlan(savedPlan); setFase('plan'); }
    else setFase('vragenlijst');
  }, [userSlug]);

  // De maandag van de lopende week — geeft de dagpillen hun nummer.
  const weekMonday = mondayOf(toDateStr(new Date()));

  async function genereerSchema(prefs) {
    setGenError(''); setFase('generating');
    try {
      const text = await callGemini(buildSchemaPrompt(macros, prefs), 24000, 8000);
      const clean = text.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
      const parsed = JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean);
      if (!parsed.days || !Array.isArray(parsed.days)) throw new Error('Ongeldig schema-formaat.');
      setPlan(parsed); setFase('plan'); setSelectedDay(0); lsSet(`weekschema-plan:${userSlug}`, parsed);
    } catch (e) {
      setGenError(e.message || 'Fout bij genereren.');
      setFase('vragenlijst'); setStapIndex(VRAGENLIJST.length - 1);
    }
  }

  function handleAntwoord(val) { setAntwoorden(p => ({ ...p, [VRAGENLIJST[stapIndex].id]: val })); }
  function handleVolgende() {
    if (stapIndex < VRAGENLIJST.length - 1) setStapIndex(i => i + 1);
    else { lsSet(`weekschema-prefs:${userSlug}`, antwoorden); genereerSchema(antwoorden); }
  }

  const isGeldig = () => {
    const v = VRAGENLIJST[stapIndex]; const a = antwoorden[v.id];
    if (v.type === 'single') return !!a;
    if (v.type === 'multi') return Array.isArray(a) && a.length > 0;
    return true;
  };

  if (fase === 'generating') return (
    <div className="pt-2">
      <Eyebrow>Even geduld</Eyebrow>
      <p className="mt-2 mb-0 font-logo font-bold text-[30px] leading-[1.1] text-[#14223c]">Je schema wordt gemaakt</p>
      <div className="mt-8 bg-[#182a48] rounded-[26px] px-[22px] py-8 text-center">
        <Icon name="ChefHat" size={36} className="mx-auto text-[#f97316] mb-4"/>
        <p className="m-0 text-[15px] text-white/75">De AI stelt jouw weekmenu samen. Dat duurt ongeveer 20 seconden.</p>
      </div>
    </div>
  );

  if (fase === 'vragenlijst' || fase === 'loading') {
    const vraag = VRAGENLIJST[stapIndex];
    const progress = ((stapIndex + 1) / VRAGENLIJST.length) * 100;
    return (
      <div className="pt-2">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Weekschema</Eyebrow>
          <span className="font-logo font-semibold text-sm text-[#4a5568]">{stapIndex + 1} / {VRAGENLIJST.length}</span>
        </div>
        <p className="mt-2 mb-0 font-logo font-bold text-[30px] leading-[1.1] tracking-[-.01em] text-[#14223c]">Even je smaak leren kennen</p>
        <div className="h-1.5 bg-[#dfe3ea] rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-[#c2410c] rounded-full transition-all" style={{ width: `${progress}%` }}/>
        </div>

        <div className="mt-6 bg-white border border-[#dfe3ea] rounded-[22px] p-5">
          <p className="m-0 mb-4 font-semibold text-[16px] text-[#14223c]">{vraag.label}</p>
          <VragenlijstStap vraag={vraag} waarde={antwoorden[vraag.id]} onChange={handleAntwoord}/>
        </div>

        {genError && <p className="mt-3 mb-0 text-[13px] text-[#c2410c] bg-white border border-[#dfe3ea] rounded-xl px-4 py-3">{genError}</p>}

        <div className="flex gap-2 mt-5">
          {stapIndex > 0 && (
            <button onClick={() => setStapIndex(i => i - 1)}
              className="flex-1 h-14 rounded-[20px] border border-[#dfe3ea] bg-white text-[#14223c] font-semibold text-base active:scale-[.98] transition-transform">
              Vorige
            </button>
          )}
          <PrimaryButton onClick={handleVolgende} disabled={!isGeldig() && vraag.type !== 'text'} className="flex-1">
            {stapIndex < VRAGENLIJST.length - 1 ? 'Volgende' : <><Icon name="Sparkles" size={18}/> Genereer schema</>}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (fase === 'plan' && plan) {
    const dag = plan.days[selectedDay];
    const kortMaandag = new Date(weekMonday + 'T00:00:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }).replace('.', '');
    return (
      <div className="pt-2">
        <Eyebrow>Week van {kortMaandag}</Eyebrow>
        <p className="mt-2 mb-0 font-logo font-bold text-[30px] leading-[1.1] tracking-[-.01em] text-[#14223c]">Je week staat klaar</p>
        <p className="mt-2 mb-0 text-sm leading-relaxed text-[#4a5568]" style={{ textWrap: 'pretty' }}>
          Tik een dag om de maaltijden te zien. Importeer het schema om het als logboek in te laden.
        </p>

        <div className="flex gap-1.5 mt-5">
          {plan.days.slice(0, 7).map((d, i) => {
            const on = i === selectedDay && !showShopping;
            const datum = new Date(addDays(weekMonday, i) + 'T00:00:00');
            return (
              <button key={i} onClick={() => { setSelectedDay(i); setShowShopping(false); }}
                className={`flex-1 min-w-0 text-center rounded-[14px] py-2.5 border transition-colors active:scale-95
                  ${on ? 'bg-[#182a48] border-[#182a48]' : 'bg-white border-[#dfe3ea]'}`}>
                <span className={`block font-mono text-[10px] font-semibold uppercase ${on ? 'text-white/65' : 'text-[#4a5568]'}`}>
                  {(d.day || '').slice(0, 2)}
                </span>
                <span className={`block mt-1 font-logo font-bold text-[15px] ${on ? 'text-white' : 'text-[#14223c]'}`}>
                  {datum.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {!showShopping && dag && (
          <>
            <div className="mt-5 flex flex-col gap-2">
              {(dag.meals || []).map((meal, i) => (
                <div key={i} className="bg-white border border-[#dfe3ea] rounded-[18px] px-[18px] py-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <Eyebrow color={QV.orangeInk}>
                      {MEAL_TIMES.find(m => m.key === normalizeMealTime(meal.mealTime))?.label || meal.mealTime}
                    </Eyebrow>
                    <span className="shrink-0 font-semibold text-[13px] text-[#4a5568]">{Math.round(meal.kcal)} kcal</span>
                  </div>
                  <p className="mt-1.5 mb-0 font-semibold text-[16px] text-[#14223c]">{meal.name}</p>
                  {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {meal.ingredients.map((ing, j) => (
                        <span key={j} className="font-medium text-[11px] bg-[#eef1f6] text-[#35507d] rounded-md px-2 py-1">{ing}</span>
                      ))}
                    </div>
                  )}
                  {meal.tip && <p className="mt-2 mb-0 text-[12px] text-[#8494aa] italic">{meal.tip}</p>}
                </div>
              ))}
            </div>

            {dag.totals && (
              <div className="mt-4 bg-[#e6ecf6] rounded-[18px] px-[18px] py-4 flex items-baseline justify-between gap-2">
                <span className="font-semibold text-[13px] text-[#1e3a8a] capitalize">Dagtotaal {dag.day || ''}</span>
                <span className="shrink-0 font-logo font-bold text-[20px] text-[#1e3a8a]">{Math.round(dag.totals.kcal)} kcal</span>
              </div>
            )}
          </>
        )}

        {showShopping && plan.shoppingList && (
          <div className="mt-5 flex flex-col gap-4">
            <p className="m-0 text-[13px] text-[#4a5568]">
              De lijst die de AI bij dit schema gaf. Je eigen lijst op basis van wat je écht logde staat onder <b>Lijst</b>.
            </p>
            {plan.shoppingList.map((cat, i) => (
              <div key={i}>
                <Eyebrow className="mb-2">{cat.category}</Eyebrow>
                <div className="bg-white border border-[#dfe3ea] rounded-[18px] overflow-hidden">
                  {(cat.items || []).map((it, j) => (
                    <p key={j} className="m-0 px-4 py-3 text-[15px] text-[#14223c] border-b border-[#eef1f6] last:border-0">{it}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <PrimaryButton onClick={onGoToLijst}>
            <Icon name="ShoppingCart" size={18}/> Naar boodschappenlijst
          </PrimaryButton>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => setShowImport(true)}
            className="h-12 rounded-[18px] border border-[#dfe3ea] bg-white text-[#14223c] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform">
            <Icon name="Download" size={15}/> Importeren
          </button>
          <button onClick={() => printWeekSchema(plan)}
            className="h-12 rounded-[18px] border border-[#dfe3ea] bg-white text-[#14223c] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform">
            <Icon name="Printer" size={15}/> Afdrukken
          </button>
          {plan.shoppingList && (
            <button onClick={() => setShowShopping(v => !v)}
              className={`h-12 rounded-[18px] border font-semibold text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform
                ${showShopping ? 'bg-[#182a48] border-[#182a48] text-white' : 'bg-white border-[#dfe3ea] text-[#14223c]'}`}>
              <Icon name="List" size={15}/> AI-lijst
            </button>
          )}
          <button onClick={() => { setPlan(null); lsDel(`weekschema-plan:${userSlug}`); setFase('vragenlijst'); setStapIndex(0); setShowShopping(false); }}
            className="h-12 rounded-[18px] border border-[#dfe3ea] bg-white text-[#14223c] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform">
            <Icon name="RefreshCw" size={15}/> Opnieuw
          </button>
        </div>

        {showImport && <ImportSchemaModal plan={plan} onImport={onImport} onClose={() => setShowImport(false)} onGoToVoeding={onGoToVoeding}/>}
      </div>
    );
  }
  return null;
}
