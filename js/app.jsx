// ─── Hoofd App ───────────────────────────────────────────────────────────────



function App() {
  // Herstel een geldige sessie (max. 3 dagen oud) zodat je niet telkens opnieuw moet inloggen.
  const [userName, setUserName] = useState(() => loadSession());
  const [tab, setTab] = useState('voeding');
  const [profile, setProfile] = useState(null);
  const [macros, setMacros] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [log, setLog] = useState([]);
  const [dateStr, setDateStr] = useState(toDateStr(new Date()));
  const [activeMeal, setActiveMeal] = useState(MEAL_TIMES[0].key);
  const [customFoods, setCustomFoods] = useState([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showRepeatDay, setShowRepeatDay] = useState(false);

  const userSlug = userName ? slugifyName(userName) : '';

  // Bij opstarten: vraag persistente opslag aan en ververs de sessie (sliding window van 3 dagen).
  useEffect(() => {
    requestPersistentStorage();
    if (userName) saveSession(userName);
  }, []);

  // Inloggen / uitloggen — houdt de sessie in localStorage in sync.
  function handleUnlock(name) { saveSession(name); setUserName(name); }
  function handleLogout() { clearSession(); setUserName(null); }

  // Profiel laden
  useEffect(() => {
    if (!userSlug) return;
    const p = lsGet(`profile:${userSlug}`);
    if (p) { setProfile(p); setMacros(calcMacros(p)); }
    const cf = lsGet(`custom-foods:${userSlug}`) || [];
    setCustomFoods(cf);
  }, [userSlug]);

  // Logboek laden
  useEffect(() => {
    if (!userSlug) return;
    const saved = lsGet(`daily-log:${userSlug}:${dateStr}`) || [];
    setLog(saved);
  }, [userSlug, dateStr]);

  const searchPool = useMemo(() => [...customFoods, ...NEVO_DATA], [customFoods]);

  function handleProfileComplete(p) {
    setProfile(p);
    const m = calcMacros(p);
    setMacros(m);
    lsSet(`profile:${userSlug}`, p);
    lsSet(`macros:${userSlug}`, m);
    setEditingProfile(false);
  }

  function handleAdjustKcal(newKcal) {
    if (!macros) return;
    const m = applyKcalToMacros(macros, newKcal);
    setMacros(m);
    lsSet(`macros:${userSlug}`, m);
  }

  function handleResetMacros() {
    if (!profile) return;
    const m = calcMacros(profile);
    setMacros(m);
    lsSet(`macros:${userSlug}`, m);
  }

  function addLogEntries(entries, mealOverride) {
    const meal = mealOverride || activeMeal;
    const newLog = [...log, ...entries.map(e => ({ ...e, mealTime: meal }))];
    setLog(newLog);
    lsSet(`daily-log:${userSlug}:${dateStr}`, newLog);
  }

  function removeLogEntry(id) {
    const newLog = log.filter(e => e.id !== id);
    setLog(newLog);
    lsSet(`daily-log:${userSlug}:${dateStr}`, newLog);
  }

  function addCustomFood(food) {
    const updated = [...customFoods.filter(f => f.id !== food.id), food];
    setCustomFoods(updated);
    lsSet(`custom-foods:${userSlug}`, updated);
  }

  function mealToEntry(meal) {
    return { id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: meal.name, grams: null,
      kcal: meal.kcal||0, protein: meal.protein||0, fat: meal.fat||0, carbs: meal.carbs||0,
      source: 'weekschema', mealTime: normalizeMealTime(meal.mealTime), ingredients: meal.ingredients };
  }

  // Importeer het volledige schema, weekdag-uitgelijnd (Maandag→maandag), voor X weken.
  // startDate wordt naar de maandag van die week gesnapt; bestaande dagen worden overschreven.
  function importWeekSchema(plan, startDate, weeks) {
    const monday = mondayOf(startDate);
    let count = 0;
    for (let w = 0; w < weeks; w++) {
      (plan.days || []).forEach((dag, i) => {
        const off = DAG_OFFSET[(dag.day || '').toLowerCase()] ?? i;
        const target = addDays(monday, w * 7 + off);
        lsSet(`daily-log:${userSlug}:${target}`, (dag.meals || []).map(mealToEntry));
        count++;
      });
    }
    setDateStr(monday);
    setLog(lsGet(`daily-log:${userSlug}:${monday}`) || []);
    return { count, monday };
  }

  function repeatDayToWeekdays(weeks, days) {
    if (!log.length || !days.length) return 0;
    let count = 0;
    for (let i = 1; i <= weeks * 7; i++) {
      const target = addDays(dateStr, i);
      const wd = new Date(target + 'T00:00:00').getDay();
      if (days.includes(wd)) {
        const copy = log.map(e => ({ ...e, id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}` }));
        lsSet(`daily-log:${userSlug}:${target}`, copy); // overschrijft de doeldag
        count++;
      }
    }
    return count;
  }

  const totals = useMemo(() => log.reduce((a,e) => ({
    kcal:a.kcal+e.kcal, protein:a.protein+e.protein, fat:a.fat+e.fat, carbs:a.carbs+e.carbs
  }), { kcal:0, protein:0, fat:0, carbs:0 }), [log]);

  const remaining = macros ? {
    kcal: Math.max(macros.targetKcal - totals.kcal, 0),
    protein: Math.max(macros.proteinG - totals.protein, 0),
    fat: Math.max(macros.fatG - totals.fat, 0),
    carbs: Math.max(macros.carbsG - totals.carbs, 0),
  } : null;

  if (!userName) return <AccessGate onUnlock={handleUnlock} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {showBreakdown && macros && <MacroBreakdownModal log={log} macros={macros} totals={totals} onClose={() => setShowBreakdown(false)} />}
      {showShoppingList && <ShoppingListModal userSlug={userSlug} initialDate={dateStr} onClose={() => setShowShoppingList(false)} />}
      {showRepeatDay && <RepeatDayModal dateStr={dateStr} count={log.length} onConfirm={repeatDayToWeekdays} onClose={() => setShowRepeatDay(false)} />}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#182a48] border-b border-[#2b3e60] shadow-sm">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <span className="font-logo text-2xl font-bold tracking-tight"><span className="text-[#2f8bff]">Q</span><span className="text-orange-500">volve</span></span>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="text-[11px] text-blue-300 hover:text-white underline" title="Uitloggen">{userName}</button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24">

        {tab === 'voeding' && (
          <>
            {(!profile || editingProfile) && (
              <SetupWizard initial={profile} onComplete={handleProfileComplete} />
            )}
            {profile && !editingProfile && macros && (
              <div className="space-y-4">
                <DateNav dateStr={dateStr} onChange={setDateStr} />

                <div className="flex gap-2">
                  <button onClick={() => setShowShoppingList(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-xl py-2 text-xs font-medium">
                    <Icon name="ShoppingCart" size={14}/> Boodschappenlijst
                  </button>
                  <button onClick={() => setShowRepeatDay(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-xl py-2 text-xs font-medium">
                    <Icon name="RefreshCw" size={14}/> Dag herhalen
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-900">Dagtotaal</h2>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowBreakdown(true)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50" title="Macroverdeling">
                        <Icon name="PieChart" size={15}/>
                      </button>
                      <button onClick={() => setEditingProfile(true)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-gray-50">
                        <Icon name="Settings" size={13}/> Profiel
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-500">Caloriedoel</span>
                    <KcalAdjuster targetKcal={macros.targetKcal} onAdjust={handleAdjustKcal} onReset={handleResetMacros}/>
                  </div>
                  <CalorieSummary consumed={totals.kcal} target={macros.targetKcal}/>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <MacroRing label="Koolhydraten" consumed={totals.carbs} target={macros.carbsG} color="#1e3a8a"/>
                    <MacroRing label="Eiwit" consumed={totals.protein} target={macros.proteinG} color="#2f8bff"/>
                    <MacroRing label="Vet" consumed={totals.fat} target={macros.fatG} color="#f59e0b"/>
                  </div>
                  <p className="text-[10px] text-gray-400 pt-2">BMR {macros.bmr} · TDEE {macros.tdee} kcal · {(MACRO_PROFILES[profile.macroProfile]||MACRO_PROFILES.normal).label}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Voeg toe aan:</p>
                  <MealTimeSelector active={activeMeal} onChange={setActiveMeal}/>
                </div>

                <AddFoodPanel pool={searchPool} onAdd={addLogEntries} onSaveCustom={addCustomFood}/>

                {remaining && remaining.kcal > 50 && (
                  <MealSuggestionPanel remaining={remaining} onAdd={addLogEntries}/>
                )}

                <DailyLogList log={log} onRemove={removeLogEntry}/>

                <p className="text-[10px] text-gray-400 text-center pt-1">NEVO-online {NEVO_VERSION}, RIVM Bilthoven</p>
              </div>
            )}
          </>
        )}

        {tab === 'weekschema' && (
          profile && macros ? (
            <WeekSchemaPanel macros={macros} userSlug={userSlug} onImport={importWeekSchema} onGoToVoeding={() => setTab('voeding')}/>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <Icon name="Calendar" size={28} className="mx-auto text-gray-300 mb-3"/>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Stel eerst je profiel in</h2>
              <p className="text-xs text-gray-500 mb-4">Je macro's zijn nodig voor een persoonlijk weekschema.</p>
              <button onClick={() => setTab('voeding')} className="text-sm text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl">Naar voeding →</button>
            </div>
          )
        )}

        {tab === 'training' && <TrainingPlaceholder/>}

      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#182a48] border-t border-[#2b3e60] shadow-lg">
        <div className="max-w-2xl mx-auto flex">
          {[{id:'voeding',label:'Voeding',icon:'UtensilsCrossed'},{id:'weekschema',label:'Weekplan',icon:'Calendar'},{id:'training',label:'Training',icon:'Dumbbell'}].map(({id,label,icon})=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-colors ${tab===id?'text-orange-400':'text-blue-300 active:text-blue-100'}`}>
              <Icon name={icon} size={22}/>
              <span className={`font-logo text-[10px] font-semibold uppercase tracking-wide ${tab===id?'text-orange-400':'text-blue-300'}`}>{label}</span>
              {tab===id&&<span className="w-4 h-0.5 bg-orange-400 rounded-full"/>}
            </button>
          ))}
        </div>
        <div style={{height:'env(safe-area-inset-bottom,0px)'}} className="bg-[#182a48]"/>
      </nav>
    </div>
  );
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
} catch(err) {
  document.getElementById('root').innerHTML = '<div style="padding:20px;background:#1e1e2e;color:#f38ba8;font-family:monospace;min-height:100vh"><h2 style="color:white">Render fout</h2><pre>' + err.message + '</pre></div>';
  console.error(err);
}
