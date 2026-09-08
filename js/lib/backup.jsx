// ─── lib/backup.jsx — alle gegevens van één gebruiker als JSON-bestand ───────
//
// Fase 0 van het migratieplan: zolang alles in localStorage staat, is een
// export het enige veiligheidsnet dat er is. Safari wist site-opslag na een
// week inactiviteit; zonder back-up is dat definitief.
//
// De export loopt localStorage af en neemt elke sleutel die aan deze gebruiker
// toebehoort, in plaats van een vaste lijst sleutels. Nieuwe soorten data
// (bv. meal-photos: uit de fotomodus) gaan daardoor vanzelf mee.
//
// Geen JSX en geen React in dit bestand — zie .claude/checks/harness.mjs.

const EXPORT_VERSION = 1;

// Alle Qvolve-sleutels hebben de vorm <soort>:<slug>[:<extra>…]. Sleutels
// zonder slug (qvolve-users-v2, qvolve-session) horen niet bij één gebruiker:
// de eerste bevat wachtwoorden, de tweede is een sessie. Beide blijven buiten
// de export.
function keyBelongsToUser(key, slug) {
  const delen = String(key).split(':');
  return delen.length >= 2 && delen[1] === slug;
}

// Bewust niet lsGet: die geeft null bij onleesbare JSON en gooit de inhoud dus
// weg. In een back-up is ruwe tekst altijd beter dan niets.
function readForExport(key) {
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { return null; }
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function collectUserData(slug) {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === null || !keyBelongsToUser(key, slug)) continue;
      data[key] = readForExport(key);
    }
  } catch {}
  return data;
}

function buildExport(userName, slug, now) {
  return {
    app: 'Qvolve',
    exportVersion: EXPORT_VERSION,
    exportedAt: (now || new Date()).toISOString(),
    user: { name: userName, slug },
    data: collectUserData(slug),
  };
}

function buildExportFilename(slug, now) {
  return `qvolve-export-${slug}-${toDateStr(now || new Date())}.json`;
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Niet meteen vrijgeven: Safari heeft de URL nog even nodig na de klik.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportUserData(userName, slug) {
  try {
    const payload = buildExport(userName, slug);
    const filename = buildExportFilename(slug);
    downloadJson(filename, payload);
    return { ok: true, filename, keyCount: Object.keys(payload.data).length };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
}
