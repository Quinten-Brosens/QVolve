// ─── modules/dashboard — restbudget, macroverdeling, datumnavigatie ──────────

// ─── Datum navigatie ──────────────────────────────────────────────────────────
// In het ontwerp staat de datum als klein hoofdletterlabel bovenaan; de pijlen
// zitten er links en rechts tegenaan zodat je nog steeds een dag kunt terug.
function DateNav({ dateStr, onChange }) {
  const kort = new Date(dateStr + 'T00:00:00')
    .toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace('.', '');
  const isVandaag = dateStr === toDateStr(new Date());
  return (
    <div className="flex items-center gap-1 -ml-1.5">
      <button onClick={() => onChange(addDays(dateStr, -1))} aria-label="Vorige dag"
        className="w-7 h-7 flex items-center justify-center text-[#8494aa] active:text-[#14223c]">
        <Icon name="ChevronLeft" size={16}/>
      </button>
      <button onClick={() => !isVandaag && onChange(toDateStr(new Date()))}
        title={isVandaag ? '' : 'Terug naar vandaag'}
        className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4a5568]">
        {kort}
      </button>
      <button onClick={() => onChange(addDays(dateStr, 1))} aria-label="Volgende dag"
        className="w-7 h-7 flex items-center justify-center text-[#8494aa] active:text-[#14223c]">
        <Icon name="ChevronRight" size={16}/>
      </button>
    </div>
  );
}

// ─── Het grote restcijfer ─────────────────────────────────────────────────────
function KcalHero({ totals, macros, onOpenMacros }) {
  const rest = Math.round(macros.targetKcal - totals.kcal);
  const over = rest < 0;
  return (
    <div>
      <p className="mt-7 mb-0 text-[15px] text-[#4a5568]">
        {over ? 'Je zit boven je doel met' : 'Je hebt vandaag nog'}
      </p>
      <button onClick={onOpenMacros} className="flex items-end gap-2 mt-0.5" title="Toon macroverdeling">
        <span className="font-logo font-bold text-[92px] leading-[.85] tracking-[-.04em] tabular-nums"
              style={{ color: over ? QV.orangeInk : QV.ink }}>{Math.abs(rest)}</span>
        <span className="font-logo font-semibold text-[22px] pb-2 text-[#c2410c]">kcal</span>
      </button>
    </div>
  );
}

// ─── Balkje met de zes eetmomenten ────────────────────────────────────────────
function SlotBar({ log, currentKey }) {
  const gedaan = new Set((log || []).map(e => normalizeMealTime(e.mealTime)));
  return (
    <div className="flex gap-[5px] mt-5">
      {MEAL_TIMES.map(m => (
        <div key={m.key} className="flex-1 h-[7px] rounded-full" title={m.label}
          style={{ background: gedaan.has(m.key) ? QV.blue : (m.key === currentKey ? QV.orange : QV.line) }}/>
      ))}
    </div>
  );
}

// ─── Macro-donut ──────────────────────────────────────────────────────────────
function MacroDonut({ label, consumed, target, color, size = 92 }) {
  const ratio = target > 0 ? consumed / target : 0;
  const over = ratio > 1;
  const ring = over ? QV.orangeInk : color;
  const C = 2 * Math.PI * 41;
  const dash = C * Math.min(ratio, 1);
  return (
    <div className="text-center">
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" style={{ width: size, height: size, display: 'block' }}>
          <circle cx="50" cy="50" r="41" fill="none" stroke={QV.tint} strokeWidth="11"/>
          <circle cx="50" cy="50" r="41" fill="none" stroke={ring} strokeWidth="11" strokeLinecap="round"
            transform="rotate(-90 50 50)" strokeDasharray={`${dash.toFixed(1)} ${(C - dash).toFixed(1)}`}
            style={{ transition: 'stroke-dasharray .6s cubic-bezier(.22,1,.36,1)' }}/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-logo font-bold text-[23px]"
             style={{ color: over ? QV.orangeInk : QV.ink }}>{Math.round(ratio * 100)}%</div>
      </div>
      <p className="mt-2 mb-0 font-semibold text-[13px] text-[#14223c]">{label}</p>
      <p className="mt-0.5 mb-0 font-medium text-xs text-[#4a5568]">
        {Math.round(consumed)} / {Math.round(target)} g
      </p>
    </div>
  );
}

// ─── Macroverdeling — bottom sheet achter het grote cijfer ────────────────────
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
  if (!target) {
    const tc = macros.carbsG * 4 + macros.proteinG * 4 + macros.fatG * 9;
    target = { carbs: tc ? (macros.carbsG * 4) / tc : 0, protein: tc ? (macros.proteinG * 4) / tc : 0, fat: tc ? (macros.fatG * 9) / tc : 0 };
  }
  const rows = [
    { key: 'protein', label: 'Eiwit', color: QV.blue, g: totals.protein, doel: macros.proteinG },
    { key: 'carbs', label: 'Koolhydraten', color: QV.carb, g: totals.carbs, doel: macros.carbsG },
    { key: 'fat', label: 'Vet', color: QV.amber, g: totals.fat, doel: macros.fatG },
  ];
  let angle = 0;
  const segs = rows.map(r => { const a0 = angle, a1 = angle + eaten[r.key] * 360; angle = a1; return { ...r, a0, a1 }; });
  const topBy = key => [...log].filter(e => e[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, 5);

  return (
    <Sheet onClose={onClose}>
      <div className="shrink-0">
        <p className="m-0 font-logo font-bold text-2xl text-[#14223c]">Hoe je dag verdeeld is</p>
        <p className="mt-1.5 mb-0 text-[13px] text-[#4a5568]">
          {Math.round(totals.kcal)} van {Math.round(macros.targetKcal)} kcal
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-6 space-y-7">
        <div className="grid grid-cols-3 gap-2.5">
          {rows.map(r => <MacroDonut key={r.key} label={r.label} consumed={r.g} target={r.doel} color={r.color}/>)}
        </div>

        {totalC > 0 && (
          <div>
            <Eyebrow className="mb-3">Verdeling versus doel</Eyebrow>
            <div className="flex items-center gap-5">
              <svg viewBox="0 0 200 200" className="w-32 h-32 shrink-0">
                {segs.map(s => (
                  eaten[s.key] >= 0.999
                    ? <circle key={s.key} cx="100" cy="100" r="80" fill={s.color}/>
                    : (eaten[s.key] > 0 && <path key={s.key} d={arcSlice(100, 100, 80, s.a0, s.a1)} fill={s.color}/>)
                ))}
              </svg>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex text-[11px] font-medium text-[#8494aa]">
                  <span className="flex-1"/><span className="w-12 text-right">Nu</span><span className="w-12 text-right">Doel</span>
                </div>
                {rows.map(r => (
                  <div key={r.key} className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-sm mr-2 shrink-0" style={{ background: r.color }}/>
                    <span className="flex-1 min-w-0 truncate text-[13px] text-[#14223c]">{r.label}</span>
                    <span className="w-12 text-right text-[13px] font-semibold text-[#14223c]">{Math.round(eaten[r.key] * 100)}%</span>
                    <span className="w-12 text-right text-[13px] text-[#8494aa]">{Math.round(target[r.key] * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {rows.map(r => {
          const items = topBy(r.key);
          return (
            <div key={r.key}>
              <Eyebrow color={r.color} className="mb-2">Hoogste in {r.label.toLowerCase()}</Eyebrow>
              {items.length === 0
                ? <p className="m-0 text-[13px] text-[#8494aa]">Niets gelogd</p>
                : (
                  <div className="bg-white border border-[#dfe3ea] rounded-[18px] overflow-hidden">
                    {items.map(e => (
                      <div key={e.id} className="flex justify-between px-4 py-3 border-b border-[#eef1f6] last:border-0">
                        <span className="text-[14px] text-[#14223c] truncate flex-1">{e.name}</span>
                        <span className="ml-3 shrink-0 font-logo font-semibold text-sm text-[#4a5568]">{Math.round(e[r.key])} g</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          );
        })}

        <button onClick={onClose} className="w-full h-14 rounded-[20px] bg-[#eef1f6] text-[#14223c] font-semibold text-base">
          Sluiten
        </button>
      </div>
    </Sheet>
  );
}

// ─── Calorie-doel aanpassen ───────────────────────────────────────────────────
function KcalAdjuster({ targetKcal, onAdjust, onReset }) {
  const [value, setValue] = useState(String(targetKcal));
  useEffect(() => setValue(String(targetKcal)), [targetKcal]);
  function commit(v) { const n = parseFloat(v); if (!isNaN(n) && n > 0) onAdjust(n); else setValue(String(targetKcal)); }
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => commit(targetKcal - 50)}
        className="w-8 h-8 rounded-xl bg-[#f7f5f0] border border-[#dfe3ea] text-[#14223c] active:scale-95 transition-transform">−</button>
      <input type="number" inputMode="numeric" value={value} onChange={e => setValue(e.target.value)}
        onBlur={() => commit(value)} onKeyDown={e => e.key === 'Enter' && commit(value)}
        className="w-20 text-center font-logo font-bold text-lg border border-[#dfe3ea] rounded-xl py-1.5 bg-white text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
      <button onClick={() => commit(targetKcal + 50)}
        className="w-8 h-8 rounded-xl bg-[#f7f5f0] border border-[#dfe3ea] text-[#14223c] active:scale-95 transition-transform">+</button>
      <button onClick={onReset} className="ml-1 text-[11px] font-semibold text-[#4a5568] underline">Herstel</button>
    </div>
  );
}

// ─── Maaltijdmoment selector ──────────────────────────────────────────────────
function MealTimeSelector({ active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {MEAL_TIMES.map(m => {
        const on = active === m.key;
        return (
          <button key={m.key} onClick={() => onChange(m.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors
              ${on ? 'bg-[#182a48] text-white border-[#182a48]' : 'bg-[#f7f5f0] text-[#14223c] border-[#dfe3ea]'}`}>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
