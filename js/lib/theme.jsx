// ─── lib/theme.jsx — kleurtokens en gedeelde vormgeving ──────────────────────
// De hexcodes van de huisstijl staan hier één keer. Tailwind-klassen elders
// gebruiken dezelfde waarden als arbitrary value (bv. bg-[#182a48]); QV is voor
// de plekken waar JS de kleur nodig heeft — SVG-stroke, inline style, berekend.

const QV = {
  bg:        '#f7f5f0', // paginakleur, warm gebroken wit
  bgDeep:    '#e8e6e1', // een tint dieper, buiten het toestelkader
  ink:       '#14223c', // primaire tekst
  ink2:      '#4a5568', // secundaire tekst
  ink3:      '#8494aa', // inactief / tertiair
  line:      '#dfe3ea', // randen
  tint:      '#eef1f6', // zacht vlak
  tintBlue:  '#e6ecf6', // blauwige chip / avatar
  navy:      '#182a48', // donkere kaart, primaire knop
  blue:      '#2f8bff', // eiwit, afgevinkt, accenten
  blueInk:   '#35507d', // icoon op tintBlue
  blueDeep:  '#1e3a8a', // links, nadruk
  orange:    '#f97316', // accent op donker
  orangeInk: '#c2410c', // accent op licht (voldoende contrast)
  amber:     '#f59e0b', // vet
  carb:      '#6f8fd0', // koolhydraten
};

// Het terugkerende kopje uit het ontwerp: klein, monospace, gesperd, hoofdletters.
function Eyebrow({ children, color, className = '' }) {
  return (
    <p className={`m-0 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${className}`}
       style={{ color: color || QV.ink2 }}>{children}</p>
  );
}

// Bottom sheet — het paneel dat in het ontwerp van onderen komt (macro's,
// zoeken, afwegen). Sluit op de achtergrond, op Escape en op de sleepgreep.
function Sheet({ onClose, children, className = '' }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-[#14223c]/40" style={{ animation: 'qv-fade .2s ease-out' }}/>
      <div className={`absolute left-0 right-0 bottom-0 mx-auto max-w-md bg-white rounded-t-[32px] flex flex-col ${className}`}
           style={{ animation: 'qv-sheet .32s cubic-bezier(.22,1,.36,1)', maxHeight: '92vh' }}>
        <button onClick={onClose} aria-label="Sluiten"
          className="w-11 h-[5px] rounded-full bg-[#dfe3ea] mx-auto mt-3 mb-4 shrink-0 block"/>
        <div className="flex-1 min-h-0 flex flex-col px-6" style={{ paddingBottom: 'max(30px, env(safe-area-inset-bottom,0px))' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Volvlakke hoofdknop (navy) — "Toevoegen", "Naar boodschappenlijst", …
function PrimaryButton({ children, onClick, disabled, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full h-14 rounded-[20px] bg-[#182a48] text-white font-semibold text-base flex items-center justify-center gap-2.5
        active:scale-[.98] transition-transform disabled:opacity-40 disabled:active:scale-100 ${className}`}>
      {children}
    </button>
  );
}

// Rij in een lijstkaart: icoon, label, optionele waarde, chevron.
function SettingRow({ icon, label, value, onClick, danger, noChevron }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick}
      className={`w-full bg-white border border-[#dfe3ea] rounded-[18px] px-[18px] py-4 flex items-center gap-3.5 text-left
        ${onClick ? 'active:scale-[.99] transition-transform' : ''}`}>
      <span className={danger ? 'text-[#c2410c]' : 'text-[#35507d]'} style={{ flexShrink: 0 }}><Icon name={icon} size={19}/></span>
      <span className={`flex-1 min-w-0 font-semibold text-[15px] ${danger ? 'text-[#c2410c]' : 'text-[#14223c]'}`}>{label}</span>
      {value != null && <span className="font-logo font-semibold text-sm text-[#4a5568] shrink-0">{value}</span>}
      {onClick && !noChevron && <span className="text-[#8494aa] shrink-0"><Icon name="ChevronRight" size={16}/></span>}
    </Tag>
  );
}
