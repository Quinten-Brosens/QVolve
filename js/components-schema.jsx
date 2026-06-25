// ─── WeekSchema ───────────────────────────────────────────────────────────────
const VRAGENLIJST = [
  {id:'budget',label:'Weekbudget voor boodschappen?',type:'single',options:[{value:'laag',label:'Laag (< €40/week)'},{value:'gemiddeld',label:'Gemiddeld (€40–€80/week)'},{value:'hoog',label:'Hoog (€80+/week)'}]},
  {id:'kooktijd',label:'Kooktijd per maaltijd?',type:'single',options:[{value:'snel',label:'Snel (< 20 min)'},{value:'normaal',label:'Normaal (20–40 min)'},{value:'uitgebreid',label:'Uitgebreid (40+ min)'}]},
  {id:'kookdagen',label:'Op hoeveel dagen per week kook je?',type:'single',options:[{value:'2-3',label:'2–3 dagen (meal prep)'},{value:'4-5',label:'4–5 dagen'},{value:'7',label:'Elke dag vers'}]},
  {id:'eetstijl',label:'Welke eetstijl past bij jou?',type:'multi',options:[{value:'belgisch',label:'🇧🇪 Klassiek Belgisch/Hollands'},{value:'mediterraan',label:'🫒 Mediterraan'},{value:'aziatisch',label:'🍜 Aziatisch'},{value:'mexicaans',label:'🌮 Mexicaans'},{value:'gemengd',label:'🌍 Alles door elkaar'}]},
  {id:'dieet',label:'Voedingsrestricties?',type:'multi',options:[{value:'geen',label:'Geen restricties'},{value:'glutenvrij',label:'Glutenvrij'},{value:'lactosevrij',label:'Lactosevrij'},{value:'vegetarisch',label:'Vegetarisch'},{value:'vegan',label:'Vegan'},{value:'halal',label:'Halal'}]},
  {id:'niet_lust',label:'Wat eet je absoluut niet?',type:'text',placeholder:'bv. lever, spruitjes, garnalen...'},
  {id:'favorieten',label:'Favoriete maaltijden of ingrediënten?',type:'text',placeholder:'bv. kip, pasta, rijst, broccoli, zalm...'},
  {id:'ontbijt_type',label:'Ontbijtvoorkeur?',type:'multi',options:[{value:'havermout',label:'🥣 Havermout'},{value:'brood',label:'🍞 Brood'},{value:'eieren',label:'🍳 Eieren'},{value:'kwark_yoghurt',label:'🥛 Kwark/yoghurt'},{value:'smoothie',label:'🥤 Smoothie'},{value:'klein',label:'☕ Klein ontbijt'}]},
  {id:'snacks',label:'Snacks tussendoor?',type:'multi',options:[{value:'fruit',label:'🍎 Fruit'},{value:'noten',label:'🥜 Noten'},{value:'kwark',label:'🥛 Kwark/yoghurt'},{value:'rijstwafel',label:'🌾 Rijstwafels'},{value:'proteïnereep',label:'💪 Proteïnereep'},{value:'groenten',label:'🥕 Rauwkost'}]},
  {id:'meal_prep',label:'Rekening houden met meal prep?',type:'single',options:[{value:'ja',label:'Ja, zo weinig mogelijk kookbeurten'},{value:'deels',label:'Deels — avondmaal varieert, maar ontbijt/lunch mag herhalen'},{value:'nee',label:'Nee, elke dag anders'}]},
  {id:'extra',label:'Nog iets anders dat de AI moet weten?',type:'text',placeholder:'bv. ik sport \'s ochtends, gezin van 4...'},
];

function buildSchemaPrompt(macros,prefs){
  return `Je bent een professionele sportdiëtist. Stel een 7-daags weekmenu op.

## Macro-doelen per dag
- Calorieën: ${Math.round(macros.targetKcal)} kcal · Eiwit: ${Math.round(macros.proteinG)}g · Vet: ${Math.round(macros.fatG)}g · KH: ${Math.round(macros.carbsG)}g

## Voorkeuren
Budget: ${prefs.budget||'gemiddeld'} · Kooktijd: ${prefs.kooktijd||'normaal'} · Kookdagen: ${prefs.kookdagen||'4-5'}
Eetstijl: ${(prefs.eetstijl||[]).join(', ')||'gemengd'} · Dieet: ${(prefs.dieet||[]).join(', ')||'geen'}
Niet: ${prefs.niet_lust||'niets specifieks'} · Favorieten: ${prefs.favorieten||'geen'} 
Ontbijt: ${(prefs.ontbijt_type||[]).join(', ')||'vrij'} · Snacks: ${(prefs.snacks||[]).join(', ')||'vrij'}
Meal prep: ${prefs.meal_prep||'deels'} · Extra: ${prefs.extra||'geen'}

## Instructies
- 7 dagen, 6 maaltijden per dag: ontbijt, snack voormiddag, lunch, snack namiddag, diner, snack avond
- Ingrediënten met exacte hoeveelheden (bv. "150g kipfilet", "200ml melk")
- BELANGRIJK — macro's: tel per maaltijd de kcal/eiwit/vet/koolhydraten op tot een dagtotaal,
  en pas de hoeveelheden net zo lang aan tot elk dagtotaal binnen ±5% van de macro-doelen
  hierboven valt (zowel calorieën als eiwit, vet én koolhydraten). Vul daarna het "totals"-veld
  per dag in met die werkelijk berekende som — niet met de doelwaarden.
- Reken nauwkeurig; een schema dat de macro's niet haalt is fout.
- ALLEEN JSON terug, geen markdown

{"days":[{"day":"Maandag","meals":[{"mealTime":"ontbijt","name":"...","ingredients":["80g havermout","200ml melk"],"tip":"...","kcal":0,"protein":0,"fat":0,"carbs":0}],"totals":{"kcal":0,"protein":0,"fat":0,"carbs":0}}],"shoppingList":[{"category":"Vlees & vis","items":["..."]}]}`;
}

function VragenlijstStap({vraag,waarde,onChange}){
  if(vraag.type==='single')return(
    <div className="space-y-2">
      {vraag.options.map(opt=>(
        <button key={opt.value} onClick={()=>onChange(opt.value)}
          className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${waarde===opt.value?'border-orange-500 bg-orange-50 text-orange-700 font-medium':'border-gray-200 bg-white text-gray-700 hover:border-orange-300'}`}>
          {waarde===opt.value?<Icon name="CheckCircle2" size={14} className="inline mr-2 text-orange-500"/>:<Icon name="Circle" size={14} className="inline mr-2 text-gray-300"/>}{opt.label}
        </button>
      ))}
    </div>
  );
  if(vraag.type==='multi'){
    const sel=Array.isArray(waarde)?waarde:[];
    return(
      <div className="space-y-2">
        {vraag.options.map(opt=>{
          const isSel=sel.includes(opt.value);
          return(
            <button key={opt.value} onClick={()=>onChange(isSel?sel.filter(v=>v!==opt.value):[...sel,opt.value])}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${isSel?'border-orange-500 bg-orange-50 text-orange-700 font-medium':'border-gray-200 bg-white text-gray-700 hover:border-orange-300'}`}>
              {isSel?<Icon name="CheckCircle2" size={14} className="inline mr-2 text-orange-500"/>:<Icon name="Circle" size={14} className="inline mr-2 text-gray-300"/>}{opt.label}
            </button>
          );
        })}
      </div>
    );
  }
  return <textarea value={waarde||''} onChange={e=>onChange(e.target.value)} placeholder={vraag.placeholder} rows={3}
    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />;
}

function WeekSchemaPanel({macros,userSlug,onLoadDayToLog,onGoToVoeding}){
  const [fase,setFase]=useState('loading');
  const [stapIndex,setStapIndex]=useState(0);
  const [antwoorden,setAntwoorden]=useState({});
  const [plan,setPlan]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [genError,setGenError]=useState('');
  const [selectedDay,setSelectedDay]=useState(0);
  const [showShopping,setShowShopping]=useState(false);
  const [loadedDays,setLoadedDays]=useState(new Set());

  function getDagDatum(i){
    const base=new Date();const d=base.getDay();base.setDate(base.getDate()-(d===0?6:d-1));base.setDate(base.getDate()+i);return base.toISOString().slice(0,10);
  }

  useEffect(()=>{
    const prefs=lsGet(`weekschema-prefs:${userSlug}`);
    const savedPlan=lsGet(`weekschema-plan:${userSlug}`);
    if(prefs)setAntwoorden(prefs);
    if(savedPlan){setPlan(savedPlan);setFase('plan');}
    else setFase('vragenlijst');
  },[userSlug]);

  async function genereerSchema(prefs){
    setGenerating(true);setGenError('');setFase('generating');
    try{
      const text=await callGemini(buildSchemaPrompt(macros,prefs),24000,8000);
      const clean=text.replace(/```json|```/g,'').trim();
      const start=clean.indexOf('{'),end=clean.lastIndexOf('}');
      const parsed=JSON.parse(start>=0&&end>start?clean.slice(start,end+1):clean);
      if(!parsed.days||!Array.isArray(parsed.days))throw new Error('Ongeldig schema-formaat.');
      setPlan(parsed);setFase('plan');lsSet(`weekschema-plan:${userSlug}`,parsed);
    }catch(e){setGenError(e.message||'Fout bij genereren.');setFase('vragenlijst');setStapIndex(VRAGENLIJST.length-1);}
    setGenerating(false);
  }

  function handleAntwoord(val){setAntwoorden(p=>({...p,[VRAGENLIJST[stapIndex].id]:val}));}
  function handleVolgende(){
    if(stapIndex<VRAGENLIJST.length-1)setStapIndex(i=>i+1);
    else{lsSet(`weekschema-prefs:${userSlug}`,antwoorden);genereerSchema(antwoorden);}
  }

  const isGeldig=()=>{const v=VRAGENLIJST[stapIndex];const a=antwoorden[v.id];if(v.type==='single')return!!a;if(v.type==='multi')return Array.isArray(a)&&a.length>0;return true;};

  if(fase==='generating')return(
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
      <div className="flex justify-center mb-4"><Icon name="ChefHat" size={36} className="text-orange-500"/></div>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Schema wordt gegenereerd…</h2>
      <p className="text-xs text-gray-500">De AI stelt jouw weekmenu samen. Even geduld (±20 sec).</p>
    </div>
  );

  if(fase==='vragenlijst'||fase==='loading'){
    const vraag=VRAGENLIJST[stapIndex];
    const progress=((stapIndex+1)/VRAGENLIJST.length)*100;
    return(
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Icon name="Calendar" size={16} className="text-orange-500"/><span className="text-sm font-semibold text-gray-900">Weekschema samenstellen</span></div>
          <span className="text-xs text-gray-400">{stapIndex+1} / {VRAGENLIJST.length}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden"><div className="h-full bg-orange-500 rounded-full transition-all" style={{width:`${progress}%`}}/></div>
        <p className="text-sm font-medium text-gray-800 mb-4">{vraag.label}</p>
        <VragenlijstStap vraag={vraag} waarde={antwoorden[vraag.id]} onChange={handleAntwoord}/>
        {genError&&<p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{genError}</p>}

        <div className="flex gap-2 mt-5">
          {stapIndex>0&&<button onClick={()=>setStapIndex(i=>i-1)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">← Vorige</button>}
          <button onClick={handleVolgende} disabled={(!isGeldig()&&vraag.type!=='text')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${(isGeldig()||vraag.type==='text')?'bg-orange-500 hover:bg-orange-600 text-white':'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
            {stapIndex<VRAGENLIJST.length-1?'Volgende →':'✨ Genereer weekschema'}
          </button>
        </div>
      </div>
    );
  }

  if(fase==='plan'&&plan){
    const dag=plan.days[selectedDay];
    return(
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Icon name="Calendar" size={16} className="text-orange-500"/><span className="text-sm font-semibold text-gray-900">Jouw weekschema</span></div>
            <div className="flex gap-2">
              <button onClick={()=>setShowShopping(!showShopping)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showShopping?'bg-orange-50 border-orange-300 text-orange-600':'border-gray-200 text-gray-600'}`}>🛒 Boodschappen</button>
              <button onClick={()=>{setPlan(null);lsDel(`weekschema-plan:${userSlug}`);setFase('vragenlijst');setStapIndex(0);}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600"><Icon name="RefreshCw" size={12}/> Opnieuw</button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {plan.days.map((d,i)=>(
              <button key={i} onClick={()=>{setSelectedDay(i);setShowShopping(false);}}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedDay===i&&!showShopping?'bg-orange-500 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {d.day||`Dag ${i+1}`}
              </button>
            ))}
          </div>
        </div>

        {showShopping&&plan.shoppingList&&(
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">🛒 Boodschappenlijst</h3>
            {plan.shoppingList.map((cat,i)=>(
              <div key={i} className="mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">{cat.category}</p>
                <ul className="text-xs text-gray-600 space-y-0.5">{(cat.items||[]).map((it,j)=><li key={j} className="flex gap-1"><span>•</span><span>{it}</span></li>)}</ul>
              </div>
            ))}
          </div>
        )}

        {!showShopping&&dag&&(
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{dag.day}</h3>
              {!loadedDays.has(selectedDay)&&(
                <button onClick={()=>{onLoadDayToLog(dag,getDagDatum(selectedDay));setLoadedDays(s=>new Set([...s,selectedDay]));onGoToVoeding();}}
                  className="text-xs text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  📥 Laden in logboek
                </button>
              )}
              {loadedDays.has(selectedDay)&&<span className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">✓ Geladen</span>}
            </div>
            {(dag.meals||[]).map((meal,i)=>(
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-orange-600">{MEAL_TIMES.find(m=>m.key===meal.mealTime)?.label||meal.mealTime}</span>
                  <span className="text-xs text-gray-400">{meal.kcal} kcal · {meal.protein}g E</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{meal.name}</p>
                {meal.ingredients&&<div className="flex flex-wrap gap-1 mb-2">{meal.ingredients.map((ing,j)=><span key={j} className="text-[11px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{ing}</span>)}</div>}
                {meal.tip&&<p className="text-xs text-gray-500 italic">💡 {meal.tip}</p>}
              </div>
            ))}
            {dag.totals&&(
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">Dagtotaal</p>
                <p className="text-xs text-gray-600">{Math.round(dag.totals.kcal)} kcal · {Math.round(dag.totals.protein)}g eiwit · {Math.round(dag.totals.fat)}g vet · {Math.round(dag.totals.carbs)}g KH</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
}

// ─── Training placeholder ────────────────────────────────────────────────────
function TrainingPlaceholder(){
  return(
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      <Icon name="Dumbbell" size={36} className="mx-auto text-gray-300 mb-3"/>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Training tab</h2>
      <p className="text-xs text-gray-500">Binnenkort beschikbaar.</p>
    </div>
  );
}

