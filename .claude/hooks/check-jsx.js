#!/usr/bin/env node
//
// PostToolUse-hook: controleert gewijzigde Qvolve-bronbestanden.
//
// Qvolve heeft geen build-stap: Babel compileert de .jsx-bestanden in de
// browser. Een typefout blijft dus onzichtbaar tot de app een wit scherm met
// "Script error. Regel 0" toont. Deze hook doet dezelfde compilatie lokaal,
// met dezelfde Babel-versie en dezelfde presets als qvolve.html, en meldt de
// fout meteen terug.
//
// Twee controles:
//   1. Syntax  — .jsx via Babel (presets react + env), .js via de V8-parser.
//   2. Laadvolgorde — een nieuw js/**/*.jsx dat niet als <script> in
//      qvolve.html staat, wordt nooit geladen en faalt stil.
//
// Exit 0 = in orde (of overslaan), exit 2 = melding naar Claude via stderr.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Zelfde versie als de <script>-tag in qvolve.html, zodat de lokale controle
// niet strenger of losser is dan wat de browser straks doet.
const BABEL_VERSION = '7.23.6';
const BABEL_URL = `https://unpkg.com/@babel/standalone@${BABEL_VERSION}/babel.min.js`;
const BABEL_CACHE = path.join(ROOT, '.claude', 'tools', `babel-standalone-${BABEL_VERSION}.js`);

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

// Haalt de aangeraakte bestandspaden uit de hook-payload. Bewust hier en niet
// met jq: dat staat niet standaard op Windows.
function filesFromPayload(raw) {
  let payload;
  try { payload = JSON.parse(raw); } catch { return []; }
  const input = payload.tool_input || {};
  const paths = [input.file_path, input.notebook_path].filter(Boolean);
  if (Array.isArray(input.edits)) {
    for (const edit of input.edits) if (edit && edit.file_path) paths.push(edit.file_path);
  }
  return [...new Set(paths)];
}

function isInsideProject(abs) {
  const rel = path.relative(ROOT, abs);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// Babel-standalone wordt één keer gedownload naar .claude/tools/ (gitignored).
// Zonder netwerk slaan we de .jsx-controle over in plaats van te blokkeren.
async function loadBabel() {
  if (!fs.existsSync(BABEL_CACHE)) {
    const res = await fetch(BABEL_URL);
    if (!res.ok) throw new Error(`download gaf HTTP ${res.status}`);
    fs.mkdirSync(path.dirname(BABEL_CACHE), { recursive: true });
    fs.writeFileSync(BABEL_CACHE, Buffer.from(await res.arrayBuffer()));
  }
  return require(BABEL_CACHE);
}

function checkPlainJs(abs, code) {
  try {
    new vm.Script(code, { filename: abs });
    return null;
  } catch (e) {
    return e.message;
  }
}

function checkJsx(babel, abs, code) {
  try {
    // Identiek aan data-presets="react,env" in qvolve.html.
    babel.transform(code, { presets: ['react', 'env'], filename: abs });
    return null;
  } catch (e) {
    return e.message;
  }
}

// Elke module in js/ moet als <script> in qvolve.html staan, en de volgorde
// daar bepaalt welke globals bestaan.
function checkRegistered(relPosix) {
  const htmlPath = path.join(ROOT, 'qvolve.html');
  if (!fs.existsSync(htmlPath)) return null;
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (html.includes(`src="${relPosix}"`)) return null;
  return `${relPosix} staat niet als <script> in qvolve.html en wordt dus nooit geladen. `
       + `Voeg een <script type="text/babel" data-presets="react,env" src="${relPosix}"></script> toe `
       + `op de juiste plaats — de volgorde bepaalt welke globals beschikbaar zijn.`;
}

(async () => {
  const files = filesFromPayload(readStdin());
  if (!files.length) process.exit(0);

  const problems = [];
  let babel = null;
  let babelError = null;

  for (const file of files) {
    const abs = path.resolve(ROOT, file);
    if (!isInsideProject(abs) || !fs.existsSync(abs)) continue;

    const ext = path.extname(abs).toLowerCase();
    if (ext !== '.jsx' && ext !== '.js') continue;

    const relPosix = path.relative(ROOT, abs).split(path.sep).join('/');
    const code = fs.readFileSync(abs, 'utf8');

    if (ext === '.js') {
      const err = checkPlainJs(abs, code);
      if (err) problems.push(`Syntaxfout in ${relPosix}:\n${err}`);
      continue;
    }

    if (!babel && !babelError) {
      try { babel = await loadBabel(); } catch (e) { babelError = e.message; }
    }
    if (babel) {
      const err = checkJsx(babel, abs, code);
      if (err) problems.push(`Babel kan ${relPosix} niet compileren — de app zou "Script error" tonen:\n${err}`);
    }

    if (relPosix.startsWith('js/')) {
      const err = checkRegistered(relPosix);
      if (err) problems.push(err);
    }
  }

  if (babelError) {
    console.error(`check-jsx: Babel niet beschikbaar (${babelError}) — .jsx-syntaxcontrole overgeslagen.`);
  }
  if (problems.length) {
    console.error(problems.join('\n\n'));
    process.exit(2);
  }
  process.exit(0);
})().catch(e => {
  console.error(`check-jsx: hook zelf faalde — ${e && e.message ? e.message : e}`);
  process.exit(0);
});
