// ─── modules/profiel — profieltabblad ────────────────────────────────────────
// Het vierde tabblad uit het ontwerp: wie je bent, wat je doel is, en de
// instellingen die vroeger verspreid over de voeding-tab stonden.

// Doel en macro's bijstellen — het caloriedoel handmatig verschuiven of het
// hele profiel opnieuw invullen.
function MacroSettingsSheet({ macros, profile, onAdjust, onReset, onEditProfile, onClose }) {
  const mp = MACRO_PROFILES[profile.macroProfile] || MACRO_PROFILES.normal;
  return (
    <Sheet onClose={onClose}>
      <p className="m-0 mb-4 font-logo font-bold text-2xl text-[#14223c] shrink-0">Doel en macro's</p>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-5">
        <div>
          <Eyebrow className="mb-2.5">Caloriedoel per dag</Eyebrow>
          <KcalAdjuster targetKcal={macros.targetKcal} onAdjust={onAdjust} onReset={onReset}/>
          <p className="mt-2.5 mb-0 text-[12px] text-[#8494aa]">
            De macro's schuiven mee in dezelfde verhouding. "Herstel" rekent alles terug uit je profiel.
          </p>
        </div>

        <div>
          <Eyebrow className="mb-2.5">Nu ingesteld</Eyebrow>
          <div className="bg-white border border-[#dfe3ea] rounded-[18px] overflow-hidden">
            {[
              ['Eiwit', `${macros.proteinG} g`],
              ['Koolhydraten', `${macros.carbsG} g`],
              ['Vet', `${macros.fatG} g`],
              ['BMR', `${macros.bmr} kcal`],
              ['TDEE', `${macros.tdee} kcal`],
              ['Macroprofiel', mp.label],
            ].map(([l, v]) => (
              <div key={l} className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-[#eef1f6] last:border-0">
                <span className="text-[15px] text-[#14223c]">{l}</span>
                <span className="shrink-0 font-logo font-semibold text-[15px] text-[#4a5568] text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <PrimaryButton onClick={() => { onClose(); onEditProfile(); }}>
          <Icon name="RefreshCw" size={17}/> Profiel opnieuw invullen
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

// Eigen producten bekijken en opruimen.
function CustomFoodsSheet({ foods, onDelete, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <p className="m-0 mb-1 font-logo font-bold text-2xl text-[#14223c] shrink-0">Mijn producten</p>
      <p className="mt-0 mb-4 text-[13px] text-[#4a5568] shrink-0">
        Wat je zelf ingaf of uit een AI-schatting bewaarde. Deze staan bovenaan in het zoekveld.
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {foods.length === 0 ? (
          <p className="m-0 text-[15px] text-[#8494aa]">
            Nog geen eigen producten. Voeg er een toe via “Zelf ingeven” in het toevoegscherm.
          </p>
        ) : (
          <div className="bg-white border border-[#dfe3ea] rounded-[18px] overflow-hidden">
            {foods.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#eef1f6] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="m-0 font-semibold text-[15px] text-[#14223c] truncate">{f.name}</p>
                  <p className="mt-0.5 mb-0 text-xs text-[#4a5568]">
                    {Math.round(f.kcal)} kcal{f.perGram ? ' / 100 g' : ' per portie'} · {Math.round(f.protein)} g eiwit
                  </p>
                </div>
                <button onClick={() => onDelete(f.id)} aria-label={`${f.name} verwijderen`}
                  className="shrink-0 w-8 h-8 rounded-[10px] bg-[#e6ecf6] flex items-center justify-center text-[#35507d] active:scale-90 transition-transform">
                  <Icon name="Trash2" size={14}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ─── Het tabblad ──────────────────────────────────────────────────────────────
function ProfilePanel({ userName, userSlug, profile, macros, customFoods,
                        onAdjustKcal, onResetMacros, onEditProfile, onDeleteCustomFood,
                        onOpenRepeatDay, onLogout }) {
  const [sheet, setSheet] = useState(null);
  const doel = GOALS[profile.goal] || GOALS.maintain;
  const pct = Math.round((doel.kcalAdjustPct || 0) * 100);

  return (
    <div className="pt-2">
      {sheet === 'macros' && (
        <MacroSettingsSheet macros={macros} profile={profile} onAdjust={onAdjustKcal} onReset={onResetMacros}
          onEditProfile={onEditProfile} onClose={() => setSheet(null)}/>
      )}
      {sheet === 'foods' && (
        <CustomFoodsSheet foods={customFoods} onDelete={onDeleteCustomFood} onClose={() => setSheet(null)}/>
      )}
      {sheet === 'training' && <TrainingPlaceholder onClose={() => setSheet(null)}/>}

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-[#182a48] flex items-center justify-center font-logo font-bold text-[23px] text-white shrink-0">
          {initialen(userName)}
        </div>
        <div className="min-w-0">
          <p className="m-0 font-logo font-bold text-[26px] leading-tight text-[#14223c] truncate">{userName}</p>
          <p className="mt-0.5 mb-0 text-[13px] text-[#4a5568]">
            {profile.weight} kg · {profile.height} cm · {profile.age} jaar
          </p>
        </div>
      </div>

      <div className="mt-6 bg-[#182a48] rounded-[22px] px-[22px] py-5">
        <Eyebrow color={QV.orange}>Jouw doel</Eyebrow>
        <p className="mt-2 mb-0 font-logo font-bold text-2xl text-white">{doel.label}</p>
        <div className="flex gap-6 mt-4">
          {[
            [macros.targetKcal, 'kcal per dag'],
            [macros.proteinG, 'g eiwit'],
            [pct === 0 ? '±0%' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`, pct < 0 ? 'tekort' : (pct > 0 ? 'overschot' : 'onderhoud')],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="m-0 font-logo font-bold text-[22px] text-white tabular-nums">{v}</p>
              <p className="mt-0.5 mb-0 text-[11px] font-medium text-white/70">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        <SettingRow icon="Settings" label="Doel en macro's bijstellen" onClick={() => setSheet('macros')}/>
        <SettingRow icon="Star" label="Mijn producten" value={customFoods.length} onClick={() => setSheet('foods')}/>
        <SettingRow icon="RefreshCw" label="Dag herhalen naar weekdagen" onClick={onOpenRepeatDay}/>
        <SettingRow icon="Dumbbell" label="Training" value="binnenkort" onClick={() => setSheet('training')}/>
        <SettingRow icon="LogOut" label="Uitloggen" onClick={onLogout} danger noChevron/>
      </div>

      <div className="mt-3.5">
        <DataExportCard userName={userName} userSlug={userSlug}/>
      </div>

      <p className="mt-5 mb-0 text-[12px] leading-relaxed text-[#8494aa]">
        Qvolve · voedingswaarden uit NEVO-online {NEVO_VERSION}, RIVM Bilthoven
      </p>
    </div>
  );
}
