// ─── modules/dashboard — dagtotaal, macro-ringen, datumnavigatie ──────────────

function CalorieSummary({ consumed, target }) {
  const remaining = target - consumed;
  const over = remaining < 0;
  const pct = target > 0 ? Math.min(consumed / target, 1) * 100 : 0;
  return (
    <div>
      <div className="text-sm text-gray-700 mb-1.5">
        {over
          ? <><b className="text-red-600 text-base font-bold">{Math.round(-remaining)} kcal</b> over je doel</>
          : <>Je mag nog <b className="text-orange-500 text-base font-bold">{Math.round(remaining)} kcal</b> eten</>}
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[11px] text-gray-400">
        <span>{Math.round(consumed)} gegeten</span>
        <span>Doel: {Math.round(target)} kcal</span>
      </div>
    </div>
  );
}

function MacroRing({ label, consumed, target, color }) {
  const ratio = target > 0 ? consumed / target : 0;
  const over = ratio > 1;
  const ringColor = over ? '#ef4444' : color;
  const C = 2 * Math.PI * 42;
  const dash = C * Math.min(ratio, 1);
  return (
    <div className="text-center">
      <svg viewBox="0 0 100 100" className="w-[84px] h-[84px] mx-auto">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#eceef2" strokeWidth="10"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`} transform="rotate(-90 50 50)"/>
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '23px', fontWeight: 600, fill: ringColor }}>{Math.round(ratio * 100)}%</text>
      </svg>
      <div className="text-xs font-medium mt-1" style={{ color: ringColor }}>{label}</div>
      <div className="text-[11px] text-gray-400 mt-0.5">
        {over
          ? <span className="text-red-500">{Math.round(consumed - target)}g te veel</span>
          : <span>{Math.round(consumed)}<span className="text-gray-300">/{Math.round(target)}g</span></span>
        }
      </div>
    </div>
  );
}

// ─── Macroverdeling pop-up ────────────────────────────────────────────────────
function polarPt(cx, cy, r, deg) { const rad = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; }
function arcSlice(cx, cy, r, a0, a1) {
  const [x0, y0] = polarPt(cx, cy, r, a0), [x1, y1] = polarPt(cx, cy, r, a1);
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

function MacroBreakdownModal({ log, macros, totals, onClose }) {
  const cc = totals.carbs * 4, pc = totals.protein * 4, fc = totals.fat * 9;
  const totalC = cc + pc + fc;
  const eaten = { carbs: totalC ? cc / totalC : 0, protein: totalC ? pc / totalC : 0, fat: totalC ? fc / totalC : 0 };
  let target = macros.ratios;
  if (!target) { const tc = macros.carbsG * 4 + macros.proteinG * 4 + macros.fatG * 9; target = { carbs: tc ? (macros.carbsG * 4) / tc : 0, protein: tc ? (macros.proteinG * 4) / tc : 0, fat: tc ? (macros.fatG * 9) / tc : 0 }; }
  const rows = [
    { key: 'carbs', label: 'Koolhydraten', color: '#1e3a8a', g: totals.carbs },
    { key: 'protein', label: 'Eiwit', color: '#2f8bff', g: totals.protein },
    { key: 'fat', label: 'Vet', color: '#f59e0b', g: totals.fat },
  ];
  let angle = 0;
  const segs = rows.map(r => { const a0 = angle, a1 = angle + eaten[r.key] * 360; angle = a1; return { ...r, a0, a1 }; });
  const topBy = (key) => [...log].filter(e => e[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <span className="text-sm font-semibold text-gray-900">Macroverdeling</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><Icon name="X" size={18}/></button>
        </div>
        <div className="p-4 space-y-5">
          {totalC === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nog niets gelogd vandaag.</p>
          ) : (
            <>
              <div className="flex justify-center">
                <svg viewBox="0 0 200 200" className="w-44 h-44">
                  {segs.map(s => (
                    eaten[s.key] >= 0.999
                      ? <circle key={s.key} cx="100" cy="100" r="80" fill={s.color}/>
                      : (eaten[s.key] > 0 && <path key={s.key} d={arcSlice(100, 100, 80, s.a0, s.a1)} fill={s.color}/>)
                  ))}
                  {segs.map(s => {
                    if (eaten[s.key] < 0.06) return null;
                    const mid = eaten[s.key] >= 0.999 ? 180 : (s.a0 + s.a1) / 2;
                    const [lx, ly] = polarPt(100, 100, 48, mid);
                    return <text key={s.key} x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" dominantBaseline="central" fill="#fff" style={{ fontSize: '15px', fontWeight: 600 }}>{Math.round(eaten[s.key] * 100)}%</text>;
                  })}
                </svg>
              </div>
              <div className="space-y-2">
                <div className="flex text-[11px] text-gray-400 font-medium px-1"><span className="flex-1"></span><span className="w-16 text-right">Gegeten</span><span className="w-14 text-right">Doel</span></div>
                {rows.map(r => (
                  <div key={r.key} className="flex items-center px-1">
                    <span className="w-3 h-3 rounded-sm mr-2 shrink-0" style={{ background: r.color }}/>
                    <span className="flex-1 text-sm text-gray-700">{r.label} <span className="text-gray-400">({Math.round(r.g)}g)</span></span>
                    <span className="w-16 text-right text-sm font-medium text-gray-800">{Math.round(eaten[r.key] * 100)}%</span>
                    <span className="w-14 text-right text-sm text-gray-400">{Math.round(target[r.key] * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {rows.map(r => {
            const items = topBy(r.key);
            return (
              <div key={r.key}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: r.color }}>Hoogste in {r.label.toLowerCase()} (g)</p>
                {items.length === 0 ? <p className="text-xs text-gray-300 pl-1">Niets gelogd</p> :
                  <div className="border border-gray-100 rounded-lg divide-y divide-gray-50">
                    {items.map(e => (
                      <div key={e.id} className="flex justify-between px-3 py-2 text-sm">
                        <span className="text-gray-700 truncate flex-1">{e.name}</span>
                        <span className="text-gray-500 ml-2 shrink-0">{Math.round(e[r.key])}</span>
                      </div>
                    ))}
                  </div>
                }
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Datum navigatie ──────────────────────────────────────────────────────────
function DateNav({ dateStr, onChange }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-2.5">
      <button onClick={() => onChange(addDays(dateStr, -1))} className="text-gray-400 hover:text-gray-700"><Icon name="ChevronLeft" size={18}/></button>
      <span className="text-sm font-medium text-gray-700 capitalize">{formatDateNice(dateStr)}</span>
      <button onClick={() => onChange(addDays(dateStr, 1))} className="text-gray-400 hover:text-gray-700"><Icon name="ChevronRight" size={18}/></button>
    </div>
  );
}

// ─── Calorie-doel aanpassen ───────────────────────────────────────────────────
function KcalAdjuster({ targetKcal, onAdjust, onReset }) {
  const [value, setValue] = useState(String(targetKcal));
  useEffect(() => setValue(String(targetKcal)), [targetKcal]);
  function commit(v) { const n = parseFloat(v); if (!isNaN(n) && n > 0) onAdjust(n); else setValue(String(targetKcal)); }
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => commit(targetKcal - 50)} className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 text-sm leading-none">−</button>
      <input type="number" value={value} onChange={e => setValue(e.target.value)} onBlur={() => commit(value)} onKeyDown={e => e.key === 'Enter' && commit(value)}
        className="w-20 text-center text-sm font-semibold border border-gray-200 rounded-md py-1 bg-white" />
      <span className="text-xs text-gray-400">kcal</span>
      <button onClick={() => commit(targetKcal + 50)} className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 text-sm leading-none">+</button>
      <button onClick={onReset} className="text-[11px] text-gray-400 hover:text-gray-600 underline ml-1">Herstel</button>
    </div>
  );
}

// ─── Maaltijdmoment selector ──────────────────────────────────────────────────
function MealTimeSelector({ active, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
      {MEAL_TIMES.map(m => (
        <button key={m.key} onClick={() => onChange(m.key)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active === m.key ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
          {m.label}
        </button>
      ))}
    </div>
  );
}
