// ─── modules/training — placeholder voor de trainingsmodule ──────────────────
// Bereikbaar via een rij op het profieltabblad; de bottom-nav houdt de vier
// tabs uit het ontwerp.

function TrainingPlaceholder({ onClose }) {
  return (
    <Sheet onClose={onClose}>
      <p className="m-0 mb-4 font-logo font-bold text-2xl text-[#14223c] shrink-0">Training</p>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="bg-[#182a48] rounded-[26px] px-[22px] py-8 text-center">
          <Icon name="Dumbbell" size={36} className="mx-auto text-[#f97316] mb-4"/>
          <p className="m-0 font-logo font-bold text-[22px] text-white">Nog uit te bouwen</p>
          <p className="mt-2.5 mb-0 text-sm leading-relaxed text-white/75" style={{ textWrap: 'pretty' }}>
            Train. Fuel. Recover. Evolve. — voeding staat er, training volgt.
          </p>
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={onClose}>Sluiten</PrimaryButton>
        </div>
      </div>
    </Sheet>
  );
}
