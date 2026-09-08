// ─── lib/storage.jsx — localStorage met quota-bewaking ───────────────────────
//
// Vroeger stonden lsGet/lsSet/lsDel in utils.jsx en slikte lsSet elke fout.
// Een vol quotum blokkeerde daardoor stil álle opslag: de app leek te werken,
// maar niets werd nog bewaard. Hier geeft lsSet expliciet false terug en
// krijgen geabonneerde luisteraars een melding, zodat de UI het kan zeggen.
//
// Geen JSX en geen React in dit bestand: het moet in een kale node-vm
// draaibaar blijven (zie .claude/checks/harness.mjs).

function lsGet(key) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : null;
  } catch { return null; }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // Enkel een vol quotum is iets waar de gebruiker aan kan doen. Een
    // geblokkeerde opslag (privémodus, cookies uit) is niet te verhelpen met
    // opruimen, dus die melden we niet als "maak ruimte vrij".
    if (isQuotaError(e)) emitStorageError(key);
    return false;
  }
}

function lsDel(key) {
  try { localStorage.removeItem(key); } catch {}
}

// Elke browser noemt het anders; code 22 en 1014 zijn de oudere varianten.
function isQuotaError(e) {
  if (!e) return false;
  return e.name === 'QuotaExceededError'
      || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      || e.code === 22
      || e.code === 1014;
}

const _storageErrorListeners = [];
// Laatste melding, zodat een luisteraar die pas ná de fout opduikt (bv. de
// banner op een scherm dat toen nog niet gemonteerd was) ze alsnog ziet.
let _lastStorageError = null;

// Abonneer op mislukte schrijfacties. Geeft een opzegfunctie terug, geschikt
// als cleanup van een useEffect. Was er al een fout vóór dit abonnement, dan
// wordt die meteen nagespeeld — zo mist een laat gemonteerde luisteraar niets.
function onStorageError(fn) {
  _storageErrorListeners.push(fn);
  if (_lastStorageError) {
    try { fn(_lastStorageError); } catch {}
  }
  return function () {
    const i = _storageErrorListeners.indexOf(fn);
    if (i >= 0) _storageErrorListeners.splice(i, 1);
  };
}

function emitStorageError(key) {
  const melding = { key, at: Date.now() };
  _lastStorageError = melding;
  // Kopie: een luisteraar mag zich tijdens de melding uitschrijven.
  for (const fn of _storageErrorListeners.slice()) {
    try { fn(melding); } catch {}
  }
}

// Alle sleutels in localStorage, als array. Gedeeld door storageUsageBytes()
// hier en collectUserData() in backup.jsx, zodat de omgang met .length/.key(i)
// niet dubbel staat.
function storageKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k !== null) keys.push(k);
    }
  } catch {}
  return keys;
}

// Ruwe schatting van het opslaggebruik. Browsers rekenen in UTF-16, dus twee
// bytes per teken, sleutel inbegrepen.
function storageUsageBytes() {
  let total = 0;
  try {
    for (const k of storageKeys()) {
      const v = localStorage.getItem(k) || '';
      total += (k.length + v.length) * 2;
    }
  } catch {}
  return total;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} kB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
