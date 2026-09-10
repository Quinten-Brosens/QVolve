// ─── Hoofd App ───────────────────────────────────────────────────────────────
// Vier tabbladen uit het ontwerp: Vandaag, Week, Lijst, Profiel. De schil is
// licht (warm gebroken wit); donker navy is hier een kaartkleur, geen chrome.

const APP_TABS = [
  { id: 'vandaag', label: 'Vandaag', icon: 'Home' },
  { id: 'week',    label: 'Week',    icon: 'Calendar' },
  { id: 'lijst',   label: 'Lijst',   icon: 'List' },
  { id: 'profiel', label: 'Profiel', icon: 'User' },
];

function App() {
  // Herstel een geldige sessie (max. 3 dagen oud) zodat je niet telkens opnieuw moet inloggen.
  const [userName, setUserName] = useState(() => loadSession());
  const [tab, setTab] = useState('vandaag');
  const [profile, setProfile] = useState(null);
  const [macros, setMacros] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [log, setLog] = useState([]);
  const [mealPhotos, setMealPhotos] = useState({});
  const [dateStr, setDateStr] = useState(toDateStr(new Date()));
  const [customFoods, setCustomFoods] = useState([]);
  const [skips, setSkips] = useState([]);
  const [toast, setToast] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showRepeatDay, setShowRepeatDay] = useState(false);
  const [showAddOverlay, setShowAddOverlay] = useState(false);
  const [addOverlayMeal, setAddOverlayMeal] = useState(MEAL_TIMES[0].key);
  const toastTimer = useRef(null);

  const userSlug = userName ? slugifyName(userName) : '';

  function openAddOverlay(meal) { setAddOverlayMeal(meal || MEAL_TIMES[0].key); setShowAddOverlay(true); }

  // Bij opstarten: vraag persistente opslag aan en ververs de sessie.
  useEffect(() => {
    requestPersistentStorage();
    if (userName) refreshSession();
    return () => clearTimeout(toastTimer.current);
  }, []);

  // Inloggen / uitloggen — houdt de sessie in localStorage in sync.
  // onthoud = de keuze uit het loginscherm: sessie tot je uitlogt, of drie dagen.
  function handleUnlock(name, onthoud) { saveSession(name, onthoud); setUserName(name); }
  function handleLogout() { clearSession(); setUserName(null); }

  // Profiel laden
  useEffect(() => {
    if (!userSlug) return;
    const p = lsGet(`profile:${userSlug}`);
    if (p) { setProfile(p); setMacros(lsGet(`macros:${userSlug}`) || calcMacros(p)); }
    setCustomFoods(lsGet(`custom-foods:${userSlug}`) || []);
  }, [userSlug]);

  // Logboek laden — de foto-miniaturen van die dag staan in een aparte key,
  // zodat het logboek zelf klein blijft. De overgeslagen eetmomenten horen ook
  // bij de dag en komen uit hun eigen sleutel.
  useEffect(() => {
    if (!userSlug) return;
    setLog(lsGet(`daily-log:${userSlug}:${dateStr}`) || []);
    setMealPhotos(lsGet(`meal-photos:${userSlug}:${dateStr}`) || {});
    setSkips(loadCoachSkips(userSlug, dateStr));
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

  // Toont de bevestiging met "Ongedaan". De vorige stand van de dag gaat mee,
  // zodat één tik alles terugzet — inclusief de foto's.
  function showToast(text, prevLog, prevPhotos) {
    clearTimeout(toastTimer.current);
    setToast({ text, prevLog, prevPhotos });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  function undoToast() {
    if (!toast) return;
    setLog(toast.prevLog);
    lsSet(`daily-log:${userSlug}:${dateStr}`, toast.prevLog);
    setMealPhotos(toast.prevPhotos);
    lsSet(`meal-photos:${userSlug}:${dateStr}`, toast.prevPhotos);
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  function addLogEntries(entries, mealOverride) {
    const meal = mealOverride || addOverlayMeal;
    const vorigLog = log, vorigePhotos = mealPhotos;
    // Foto's horen niet in de logregel zelf: alle items van één foto delen
    // hetzelfde photoId, dus we bewaren het beeld één keer apart.
    const photos = {};
    const clean = entries.map(e => {
      const { _thumb, ...rest } = e;
      if (_thumb && rest.photoId) photos[rest.photoId] = _thumb;
      return { ...rest, mealTime: meal };
    });
    const newLog = [...log, ...clean];
    setLog(newLog);
    lsSet(`daily-log:${userSlug}:${dateStr}`, newLog);
    if (Object.keys(photos).length) {
      const key = `meal-photos:${userSlug}:${dateStr}`;
      // Een volle localStorage mag nooit een maaltijd kosten: het logboek is
      // hierboven al opgeslagen, de foto is bijzaak. lsSet meldt een vol
      // quotum zelf aan de banner en geeft hier gewoon false terug.
      lsSet(key, { ...(lsGet(key) || {}), ...photos });
      setMealPhotos(lsGet(key) || {});
    }
    const naam = clean.length === 1 ? clean[0].name : `${clean.length} items`;
    showToast(`${naam} gelogd`, vorigLog, vorigePhotos);
  }

  function removeLogEntry(id) {
    const gone = log.find(e => e.id === id);
    const vorigLog = log, vorigePhotos = mealPhotos;
    const newLog = log.filter(e => e.id !== id);
    setLog(newLog);
    lsSet(`daily-log:${userSlug}:${dateStr}`, newLog);
    // Laatste regel van deze foto weg → de foto ook, anders blijft er beeld
    // achter zonder maaltijd.
    if (gone && gone.photoId && !newLog.some(e => e.photoId === gone.photoId)) {
      const key = `meal-photos:${userSlug}:${dateStr}`;
      const photos = lsGet(key) || {};
      if (photos[gone.photoId]) { delete photos[gone.photoId]; lsSet(key, photos); setMealPhotos(photos); }
    }
    if (gone) showToast(`${gone.name} verwijderd`, vorigLog, vorigePhotos);
  }

  function addCustomFood(food) {
    const updated = [...customFoods.filter(f => f.id !== food.id), food];
    setCustomFoods(updated);
    lsSet(`custom-foods:${userSlug}`, updated);
  }

  function deleteCustomFood(id) {
    const updated = customFoods.filter(f => f.id !== id);
    setCustomFoods(updated);
    lsSet(`custom-foods:${userSlug}`, updated);
  }

  // De coach slaat een eetmoment over voor deze dag.
  function skipMoment(key) {
    const updated = [...skips, key];
    setSkips(updated);
    saveCoachSkips(userSlug, dateStr, updated);
  }

  function pickSuggestion(s, mealKey) {
    addLogEntries([{
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: s.name, grams: s.grams || null,
      kcal: s.kcal, protein: s.protein, fat: s.fat, carbs: s.carbs,
      source: s.source, ingredients: s.ingredients,
    }], mealKey);
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

  const moment = useMemo(() => nextMoment(log, skips), [log, skips]);

  if (!userName) return <AccessGate onUnlock={handleUnlock} />;

  const setupNodig = !profile || !macros || editingProfile;

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      {showBreakdown && macros && (
        <MacroBreakdownModal log={log} macros={macros} totals={totals} onClose={() => setShowBreakdown(false)}/>
      )}
      {showRepeatDay && (
        <RepeatDayModal dateStr={dateStr} count={log.length} onConfirm={repeatDayToWeekdays} onClose={() => setShowRepeatDay(false)}/>
      )}
      {showAddOverlay && (
        <AddFoodOverlay pool={searchPool} customFoods={customFoods} userSlug={userSlug} dateStr={dateStr}
          onAdd={addLogEntries} onSaveCustom={addCustomFood} onClose={() => setShowAddOverlay(false)}
          initialMeal={addOverlayMeal} remaining={remaining}/>
      )}

      <main className="max-w-md mx-auto px-6"
            style={{ paddingTop: 'max(14px, env(safe-area-inset-top,0px))', paddingBottom: setupNodig ? '40px' : '130px' }}>

        <StorageWarningBanner userName={userName} userSlug={userSlug}/>

        {setupNodig ? (
          <div className="pt-4">
            <Eyebrow>{profile ? 'Profiel bijwerken' : 'Welkom bij Qvolve'}</Eyebrow>
            <p className="mt-2 mb-6 font-logo font-bold text-[30px] leading-[1.1] tracking-[-.01em] text-[#14223c]">
              {profile ? 'Je gegevens bijstellen' : 'Even je profiel invullen'}
            </p>
            <SetupWizard initial={profile} onComplete={handleProfileComplete}
              onCancel={profile && macros ? () => setEditingProfile(false) : null}/>
          </div>
        ) : (
          <>
            {tab === 'vandaag' && (
              <div>
                <div className="flex items-center justify-between pt-2">
                  <DateNav dateStr={dateStr} onChange={setDateStr}/>
                  <button onClick={() => setTab('profiel')} aria-label="Naar je profiel"
                    className="w-[34px] h-[34px] rounded-full bg-[#e6ecf6] flex items-center justify-center font-logo font-semibold text-[13px] text-[#35507d] shrink-0">
                    {initialen(userName)}
                  </button>
                </div>

                <KcalHero totals={totals} macros={macros} onOpenMacros={() => setShowBreakdown(true)}/>
                <SlotBar log={log} currentKey={moment && moment.key}/>
                <div className="flex justify-between mt-2 text-xs font-medium text-[#4a5568] whitespace-nowrap">
                  <span>{Math.round(totals.kcal)} gegeten</span>
                  <span>eiwit {Math.round(totals.protein)} / {macros.proteinG} g</span>
                </div>

                <div className="mt-6">
                  <CoachCard userSlug={userSlug} dateStr={dateStr} moment={moment} remaining={remaining}
                    onPick={pickSuggestion} onSkip={skipMoment} onSearch={openAddOverlay}/>
                </div>

                <DailyLogList log={log} onRemove={removeLogEntry} onOpenAdd={openAddOverlay} mealPhotos={mealPhotos}/>

                <p className="mt-5 mb-0 text-xs text-[#8494aa]">NEVO-online {NEVO_VERSION}, RIVM Bilthoven</p>
              </div>
            )}

            {tab === 'week' && (
              <WeekSchemaPanel macros={macros} userSlug={userSlug} onImport={importWeekSchema}
                onGoToVoeding={() => setTab('vandaag')} onGoToLijst={() => setTab('lijst')}/>
            )}

            {tab === 'lijst' && <ShoppingListPanel userSlug={userSlug} initialDate={dateStr}/>}

            {tab === 'profiel' && (
              <ProfilePanel userName={userName} userSlug={userSlug} profile={profile} macros={macros}
                customFoods={customFoods} onAdjustKcal={handleAdjustKcal} onResetMacros={handleResetMacros}
                onEditProfile={() => { setEditingProfile(true); }} onDeleteCustomFood={deleteCustomFood}
                onOpenRepeatDay={() => { setTab('vandaag'); setShowRepeatDay(true); }} onLogout={handleLogout}/>
            )}
          </>
        )}
      </main>

      {/* Toevoegknop — staat boven de nav en enkel op Vandaag */}
      {!setupNodig && tab === 'vandaag' && (
        <button onClick={() => openAddOverlay(moment ? moment.key : MEAL_TIMES[0].key)} aria-label="Voeding toevoegen"
          className="fixed z-30 w-[62px] h-[62px] rounded-[22px] bg-[#182a48] text-white flex items-center justify-center active:scale-95 transition-transform"
          style={{ right: 'max(22px, calc(50vw - 224px + 22px))', bottom: 'calc(100px + env(safe-area-inset-bottom,0px))', boxShadow: '0 14px 30px rgba(24,42,72,.34)' }}>
          <Icon name="Plus" size={26}/>
        </button>
      )}

      {/* Bevestiging met ongedaan maken — boven de sheets, die zitten op z-50 */}
      {toast && (
        <div className="fixed z-[60] left-0 right-0 mx-auto max-w-md px-6"
             style={{ bottom: 'calc(104px + env(safe-area-inset-bottom,0px))' }}>
          <div className="flex items-center gap-3 bg-[#182a48] rounded-2xl px-[18px] py-3.5"
               style={{ animation: 'qv-toast .24s cubic-bezier(.22,1,.36,1)', boxShadow: '0 14px 30px rgba(20,34,60,.28)' }}>
            <span className="text-[#f97316] shrink-0"><Icon name="CheckCircle2" size={17}/></span>
            <span className="flex-1 min-w-0 truncate font-semibold text-sm text-white">{toast.text}</span>
            <button onClick={undoToast} className="shrink-0 font-bold text-[13px] text-[#f97316]">Ongedaan</button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      {!setupNodig && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#dfe3ea]"
             style={{ background: 'rgba(247,245,240,.94)', backdropFilter: 'blur(8px)' }}>
          <div className="max-w-md mx-auto flex gap-1 px-3 pt-2.5"
               style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom,0px))' }}>
            {APP_TABS.map(t => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-2"
                  style={{ color: on ? QV.navy : QV.ink3 }}>
                  <Icon name={t.icon} size={22}/>
                  <span className="font-logo text-[11px] font-semibold uppercase tracking-wide">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
} catch(err) {
  document.getElementById('root').innerHTML = '<div style="padding:20px;background:#1e1e2e;color:#f38ba8;font-family:monospace;min-height:100vh"><h2 style="color:white">Render fout</h2><pre>' + err.message + '</pre></div>';
  console.error(err);
}
