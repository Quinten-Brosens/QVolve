// ─── modules/training — Hevy-stijl workout-tracker met MAPS Anabolic ──────────
// Routines (MAPS voorgeladen + eigen), live workout loggen (kg×reps afvinken),
// rusttimer, vorige prestaties en workout-geschiedenis. Alles in localStorage.

// ── Seed: MAPS Anabolic ───────────────────────────────────────────────────────
// Brondata uit de eigen MAPS Anabolic Blueprints/Calendar PDF's van de gebruiker.
let _eid = 0;
function E(name, sets, reps, o = {}) {
  return { id: 'me' + (++_eid), name, sets: String(sets), reps: String(reps), superset: o.ss || null, note: o.note || '' };
}

const MAPS_ROUTINES = [
  {
    id: 'maps-pre', group: 'MAPS · Pre Phase', name: 'Foundational — Pre Phase',
    note: 'Weken 1-3 · 2×/week · rust 90s · de basis leggen', restSec: 90,
    exercises: [
      E('Barbell Squats', 2, '12-16'),
      E('Walking Lunges', 1, '16-20'),
      E('Barbell Deadlift', 1, '8-12'),
      E('Barbell Bench Press', 2, '12-16'),
      E('Dumbbell Rows', 2, '12-16'),
      E('Dumbbell Shrugs', 2, '12-16'),
      E('Standing Dumbbell Shoulder Press', 2, '12-16'),
      E('Rear Delt Flyes', 1, '12-16'),
      E('Barbell Curls', 2, '12-16'),
      E('Tricep Pressdown', 2, '12-16'),
      E('Isometric Planks', 2, '30-60s hold'),
      E('Bodyweight Calf Raises', 2, '20-40'),
    ],
  },
  {
    id: 'maps-p1-d1', group: 'MAPS · Phase I (Strength)', name: 'Phase I — Dag 1',
    note: 'Weken 4-6 · kracht & power · rust tot 3 min', restSec: 180,
    exercises: [
      E('Box Squats', 1, '10', { note: 'opwarming' }),
      E('Barbell Squats', '4-6', '1-4'),
      E('Barbell Bench Press', '4-6', '1-4'),
      E('Weighted Pull-Ups', 2, '1-6'),
      E('Barbell Shrugs', 3, '3-6'),
      E('Barbell Curls', 2, '6-8'),
      E('Barbell Skull Crushers', 2, '6-8'),
      E('Weighted Decline Sit-Ups', 5, '8-12'),
      E('Standing Calf Raises', 5, '8-20'),
    ],
  },
  {
    id: 'maps-p1-d2', group: 'MAPS · Phase I (Strength)', name: 'Phase I — Dag 2',
    note: 'Weken 4-6 · kracht & power · rust tot 3 min', restSec: 180,
    exercises: [
      E('Good Mornings', 1, '10', { note: 'opwarming' }),
      E('Barbell Deadlifts', '4-6', '1-4'),
      E('Standing Overhead Barbell Press', '4-6', '1-4'),
      E('Rear Delt Flyes', 2, '6-8'),
      E('Standing Dumbbell Shrugs', 2, '6-8'),
      E('Dumbbell Hammer Curls', 2, '6-8'),
      E('Dumbbell Overhead Tricep Extension', 2, '6-8'),
      E('Hanging Leg Raises', 5, '8-20'),
      E('Seated Calf Raises', 3, '8-20'),
    ],
  },
  {
    id: 'maps-p2-d1', group: 'MAPS · Phase II (Muscle Fiber)', name: 'Phase II — Dag 1',
    note: 'Weken 7-9 · feel & pump · rust tot 1 min', restSec: 60,
    exercises: [
      E('Barbell Squats', 3, '8-12'),
      E('Incline Barbell Chest Press', 3, '8-12'),
      E('Barbell Rows', 3, '8-12'),
      E('Standing Dumbbell Shrugs', 3, '8-12'),
      E('Rear Delt Flyes', 2, '8-12'),
      E('Lateral Raise', 2, '8-12'),
      E('Dumbbell Supinating Curls', 3, '8-12'),
      E('Weighted Dips', 3, '8-12'),
      E('Seated Calf Raises', 3, '8-12'),
      E('Hanging Leg Raises', 3, '8-20'),
    ],
  },
  {
    id: 'maps-p2-d2', group: 'MAPS · Phase II (Muscle Fiber)', name: 'Phase II — Dag 2',
    note: 'Weken 7-9 · feel & pump · rust tot 1 min', restSec: 60,
    exercises: [
      E('Barbell Deadlifts', 3, '4-8'),
      E('Lying Leg Curls', 1, '8-12'),
      E('Barbell Shrugs', 3, '8-12'),
      E('Flat Dumbbell Chest Press', 3, '8-12'),
      E('Dumbbell Pullover', 1, '8-12'),
      E('Bodyweight Chin-Ups', 2, '6-12'),
      E('Dumbbell Shoulder Press', 3, '8-12'),
      E('Barbell Curls', 3, '8-12'),
      E('Tricep Pressdowns', 3, '8-12'),
      E('Standing Calf Raises', 3, '8-12'),
      E('Bodyweight Decline Sit-Ups', 3, '30-100'),
    ],
  },
  {
    id: 'maps-p3-d1', group: 'MAPS · Phase III (Muscle Pump)', name: 'Phase III — Dag 1',
    note: 'Weken 10-12 · maximale pump · rust max 30s', restSec: 30,
    exercises: [
      E('Barbell Squats', 3, '8-15'),
      E('Sissy Squats', 2, '12-15'),
      E('Incline Barbell Chest Press', 2, '12-15'),
      E('Cable Crossovers', 2, '12-15'),
      E('Dumbbell Rows', 2, '8-12'),
      E('Dumbbell Pullovers', 2, '12-15'),
      E('Seated Dumbbell Shrugs', 5, '12-15'),
      E('Cable Rear Delt Flyes', 2, '12-15'),
      E('Barbell Upright Rows', 2, '12-15'),
      E('Dumbbell Supinating Curls', 2, '12-15', { ss: 'A' }),
      E('Dumbbell Overhead Tricep Extension', 2, '12-15', { ss: 'A' }),
      E('Hammer Cable Curls', 2, '12-15', { ss: 'B' }),
      E('Rope Tricep Pressdowns', 2, '12-15', { ss: 'B' }),
      E('Seated Calf Raises', 2, '12-15'),
      E('Standing Calf Raises', 2, '12-15'),
      E('Hanging Leg Raises', 5, '15-20'),
    ],
  },
  {
    id: 'maps-p3-d2', group: 'MAPS · Phase III (Muscle Pump)', name: 'Phase III — Dag 2',
    note: 'Weken 10-12 · maximale pump · rust max 30s', restSec: 30,
    exercises: [
      E('Barbell Deadlifts (touch and go)', 3, '6-10'),
      E('Chin-Ups', 2, '12-15'),
      E('Barbell Shrugs', 5, '12-15'),
      E('Flat Dumbbell Chest Press', 2, '12-15'),
      E('Incline Flyes', 2, '12-15'),
      E('Arnold Presses', 2, '12-15'),
      E('Lateral Raises', 2, '12-15'),
      E('Barbell Curls', 2, '12-15', { ss: 'A' }),
      E('Dips', 2, '12-15', { ss: 'A' }),
      E('Reverse Curls', 2, '12-15', { ss: 'B' }),
      E('Tricep Pressdowns', 2, '12-15', { ss: 'B' }),
      E('Seated Calf Raises', 2, '12-15'),
      E('Standing Calf Raises', 2, '12-15'),
      E('Decline Sit-Ups', 5, '20-50'),
    ],
  },
  {
    id: 'maps-p3-d3', group: 'MAPS · Phase III (Muscle Pump)', name: 'Phase III — Dag 3',
    note: 'Weken 10-12 · maximale pump · rust max 30s', restSec: 30,
    exercises: [
      E('Good Mornings', 3, '12-15'),
      E('Cable Rows', 2, '12-15'),
      E('Pulldowns', 2, '12-15'),
      E('Standing Dumbbell Shrugs', 5, '12-15'),
      E('Incline Barbell Chest Press', 2, '12-15'),
      E('Cable Chest Presses', 2, '15-20'),
      E('Barbell Behind Neck Shoulder Press', 2, '12-15'),
      E('Rear Delt Flyes', 2, '12-15'),
      E('Hammer Curls', 2, '12-15', { ss: 'A' }),
      E('Dumbbell Skull Crushers', 2, '12-15', { ss: 'A' }),
      E('Barbell Curls', 2, '12-15', { ss: 'B' }),
      E('Bench Dips', 2, '12-15', { ss: 'B' }),
      E('Seated Calf Raises', 2, '12-15'),
      E('Standing Calf Raises', 2, '12-15'),
      E('Hanging Leg Raises', 5, '15-20'),
    ],
  },
  {
    id: 'maps-trig-1', group: 'MAPS · Trigger Sessions', name: 'Trigger Session 1 — Upper body',
    note: 'Op niet-foundational dagen · circuit · 1-3 sets · minimale rust', restSec: 0,
    exercises: [
      E('Bodyweight Lunges', 2, '10-20'),
      E('Band Chest Flyes', 2, '10-20'),
      E('Band Rows', 2, '10-20'),
      E('Band Lateral Raise', 2, '10-20'),
      E('Band Curls', 2, '10-20'),
      E('Band Tricep Pressdown', 2, '10-20'),
    ],
  },
  {
    id: 'maps-trig-2', group: 'MAPS · Trigger Sessions', name: 'Trigger Session 2 — Upper body',
    note: 'Op niet-foundational dagen · circuit · 1-3 sets · minimale rust', restSec: 0,
    exercises: [
      E('Bodyweight Squats', 2, '10-20'),
      E('Band Chest Press', 2, '10-20'),
      E('Band Straight Arm Pulldown', 2, '10-20'),
      E('Band Shrugs', 2, '10-20'),
      E('Band Hammer Curls', 2, '10-20'),
      E('Band Overhead Tricep Extension', 2, '10-20'),
    ],
  },
  {
    id: 'maps-trig-3', group: 'MAPS · Trigger Sessions', name: 'Trigger Session 3 — Upper body',
    note: 'Op niet-foundational dagen · circuit · 1-3 sets · minimale rust', restSec: 0,
    exercises: [
      E('Hanging Leg Raises', 2, '10-20'),
      E('Band Pulldowns', 2, '10-20'),
      E('Band Chest Press', 2, '10-20'),
      E('Band Rear Delt Flyes', 2, '10-20'),
      E('Standing Calf Raises', 2, '10-20'),
    ],
  },
];

// Oefeningenpool voor de picker (uniek, alfabetisch) + extra gangbare oefeningen.
const MAPS_EXERCISES = (() => {
  const set = new Set();
  MAPS_ROUTINES.forEach(r => r.exercises.forEach(e => set.add(e.name)));
  ['Leg Press', 'Leg Extension', 'Romanian Deadlift', 'Pull-Ups', 'Push-Ups',
   'Plank', 'Face Pulls', 'Cable Curls', 'Front Squat'].forEach(n => set.add(n));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
})();

// ── Helpers ───────────────────────────────────────────────────────────────────
function tUid(p) { return (p || 't') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }
function nSetsOf(ex) { return Math.max(parseInt(ex.sets, 10) || 1, 1); }

function tNewWorkoutFromRoutine(routine) {
  return {
    id: tUid('w'), routineId: routine.id, name: routine.name, startedAt: Date.now(),
    exercises: routine.exercises.map(ex => ({
      id: tUid('we'), name: ex.name, reps: ex.reps, restSec: ex.restSec != null ? ex.restSec : routine.restSec,
      superset: ex.superset || null, note: ex.note || '',
      sets: Array.from({ length: nSetsOf(ex) }, () => ({ weight: '', reps: '', done: false })),
    })),
  };
}

// Laatste prestatie van een oefening uit de geschiedenis (nieuwste eerst).
function lastPerformance(history, exerciseName) {
  for (const w of history) {
    const ex = (w.exercises || []).find(e => e.name === exerciseName);
    if (ex) {
      const done = (ex.sets || []).filter(s => s.done && (s.weight !== '' || s.reps !== ''));
      if (done.length) return done.map(s => ({ weight: s.weight, reps: s.reps }));
    }
  }
  return null;
}

function workoutVolume(w) {
  let v = 0;
  (w.exercises || []).forEach(e => (e.sets || []).forEach(s => {
    if (s.done) v += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
  }));
  return Math.round(v);
}
function doneSetCount(w) {
  let n = 0; (w.exercises || []).forEach(e => (e.sets || []).forEach(s => { if (s.done) n++; })); return n;
}
function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + 'u ' : '') + (h || m ? m + 'm ' : '') + s + 's';
}
function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

// Korte piep bij einde rusttimer (WebAudio, geen externe assets).
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; o.type = 'sine';
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    o.start(); o.stop(ctx.currentTime + 0.46);
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 700);
  } catch (e) {}
}

// ── Rusttimer (sticky balk onderaan tijdens een actieve workout) ───────────────
function RestTimer({ endAt, onChange, onDone }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = (endAt - now) / 1000;
  const firedRef = useRef(false);
  useEffect(() => { firedRef.current = false; }, [endAt]);
  useEffect(() => {
    if (left <= 0 && !firedRef.current) { firedRef.current = true; beep(); onDone && onDone(); }
  }, [left]);
  if (endAt == null) return null;
  return (
    <div className="fixed bottom-[68px] left-0 right-0 z-30 px-4">
      <div className="max-w-2xl mx-auto bg-[#182a48] text-white rounded-xl shadow-lg flex items-center gap-3 px-3 py-2">
        <Icon name="Clock" size={18} className="text-orange-400"/>
        <span className="text-sm font-semibold tabular-nums w-12">{fmtClock(Math.max(left, 0))}</span>
        <div className="flex-1 h-1.5 bg-[#2b3e60] rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.max(0, Math.min(left, 600)) / 6}%`, transition: 'width .25s linear' }}/>
        </div>
        <button onClick={() => onChange(endAt - 15000)} className="text-xs px-2 py-1 rounded bg-[#24375a] hover:bg-[#2b3e60]">-15</button>
        <button onClick={() => onChange(endAt + 15000)} className="text-xs px-2 py-1 rounded bg-[#24375a] hover:bg-[#2b3e60]">+15</button>
        <button onClick={() => onChange(null)} className="text-xs px-2 py-1 rounded bg-orange-500 hover:bg-orange-600 font-medium">Skip</button>
      </div>
    </div>
  );
}

// ── Setrij in de actieve workout ──────────────────────────────────────────────
function SetRow({ index, set, prev, onChange, onToggle, onRemove }) {
  const prevTxt = prev ? `${prev.weight || '–'} kg × ${prev.reps || '–'}` : '—';
  return (
    <div className={`grid grid-cols-[28px_1fr_64px_64px_40px] gap-2 items-center py-1.5 ${set.done ? 'opacity-95' : ''}`}>
      <span className="text-xs font-semibold text-gray-500 text-center">{index + 1}</span>
      <button onClick={() => prev && onChange({ weight: prev.weight, reps: prev.reps })}
        className="text-[11px] text-gray-400 truncate text-left hover:text-orange-500" title={prev ? 'Overnemen' : ''}>{prevTxt}</button>
      <input type="number" inputMode="decimal" value={set.weight} placeholder="kg"
        onChange={e => onChange({ weight: e.target.value })}
        className={`w-full text-center text-sm rounded-lg py-1.5 border ${set.done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-orange-400`}/>
      <input type="number" inputMode="numeric" value={set.reps} placeholder="reps"
        onChange={e => onChange({ reps: e.target.value })}
        className={`w-full text-center text-sm rounded-lg py-1.5 border ${set.done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-orange-400`}/>
      <button onClick={onToggle}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${set.done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
        <Icon name="Check" size={16}/>
      </button>
    </div>
  );
}

// ── Actieve workout ───────────────────────────────────────────────────────────
function ActiveWorkout({ workout, history, onChange, onFinish, onCancel }) {
  const [restEnd, setRestEnd] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const prevMap = useMemo(() => {
    const m = {};
    workout.exercises.forEach(e => { if (!(e.name in m)) m[e.name] = lastPerformance(history, e.name); });
    return m;
  }, [workout.exercises, history]);

  function updateExercise(exIdx, mut) {
    const ex = workout.exercises.map((e, i) => i === exIdx ? mut(e) : e);
    onChange({ ...workout, exercises: ex });
  }
  function setSet(exIdx, setIdx, patch) {
    updateExercise(exIdx, e => ({ ...e, sets: e.sets.map((s, i) => i === setIdx ? { ...s, ...patch } : s) }));
  }
  function toggleSet(exIdx, setIdx) {
    const ex = workout.exercises[exIdx];
    const becomingDone = !ex.sets[setIdx].done;
    setSet(exIdx, setIdx, { done: becomingDone });
    if (becomingDone && ex.restSec > 0) setRestEnd(Date.now() + ex.restSec * 1000);
  }
  function addSet(exIdx) {
    updateExercise(exIdx, e => {
      const last = e.sets[e.sets.length - 1] || { weight: '', reps: '' };
      return { ...e, sets: [...e.sets, { weight: last.weight, reps: '', done: false }] };
    });
  }
  function removeSet(exIdx, setIdx) {
    updateExercise(exIdx, e => ({ ...e, sets: e.sets.filter((_, i) => i !== setIdx) }));
  }

  const elapsed = (now - workout.startedAt) / 1000;
  const vol = workoutVolume(workout);
  const done = doneSetCount(workout);

  return (
    <div className="space-y-3 pb-4">
      <div className="bg-[#182a48] text-white rounded-2xl shadow-sm p-4 sticky top-14 z-20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{workout.name}</p>
            <p className="text-[11px] text-blue-200 mt-0.5">{fmtDuration(elapsed)} · {done} sets · {vol} kg volume</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="text-xs px-3 py-2 rounded-lg bg-[#24375a] hover:bg-[#2b3e60]">Annuleren</button>
            <button onClick={() => onFinish(workout)} className="text-xs px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold">Voltooien</button>
          </div>
        </div>
      </div>

      {workout.exercises.map((ex, exIdx) => (
        <div key={ex.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              {ex.superset && <span className="text-[10px] font-bold bg-orange-100 text-orange-600 rounded px-1.5 py-0.5">SS {ex.superset}</span>}
              <h3 className="text-sm font-semibold text-gray-900 truncate">{ex.name}</h3>
            </div>
            <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">doel {ex.sets ? '' : ''}{ex.reps} reps</span>
          </div>
          {ex.note && <p className="text-[11px] text-gray-400 mb-1">{ex.note}</p>}
          <div className="grid grid-cols-[28px_1fr_64px_64px_40px] gap-2 text-[10px] uppercase tracking-wide text-gray-400 font-semibold pb-1 border-b border-gray-100">
            <span className="text-center">Set</span><span>Vorige</span><span className="text-center">Kg</span><span className="text-center">Reps</span><span className="text-center">✓</span>
          </div>
          {ex.sets.map((s, setIdx) => (
            <SetRow key={setIdx} index={setIdx} set={s} prev={prevMap[ex.name] && prevMap[ex.name][setIdx]}
              onChange={patch => setSet(exIdx, setIdx, patch)}
              onToggle={() => toggleSet(exIdx, setIdx)}
              onRemove={() => removeSet(exIdx, setIdx)}/>
          ))}
          <div className="flex gap-2 mt-2">
            <button onClick={() => addSet(exIdx)} className="flex-1 text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 flex items-center justify-center gap-1">
              <Icon name="Plus" size={13}/> Set toevoegen
            </button>
            {ex.sets.length > 1 && (
              <button onClick={() => removeSet(exIdx, ex.sets.length - 1)} className="text-xs text-gray-400 border border-gray-200 rounded-lg py-1.5 px-3 hover:bg-gray-50">
                <Icon name="Minus" size={13}/>
              </button>
            )}
          </div>
        </div>
      ))}

      <button onClick={() => onFinish(workout)} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 text-sm font-semibold">
        Workout voltooien
      </button>

      {restEnd != null && <RestTimer endAt={restEnd} onChange={setRestEnd} onDone={() => setRestEnd(null)}/>}
    </div>
  );
}

// ── Routine-lijst (overzicht) ─────────────────────────────────────────────────
function RoutineList({ routines, activeWorkout, onStart, onResume, onNew, onEdit, onDelete, onHistory }) {
  const groups = useMemo(() => {
    const g = {};
    routines.forEach(r => { (g[r.group] = g[r.group] || []).push(r); });
    return g;
  }, [routines]);
  const order = Object.keys(groups);

  return (
    <div className="space-y-4">
      {activeWorkout && (
        <button onClick={onResume} className="w-full bg-[#182a48] text-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold"><Icon name="Play" size={16} className="text-orange-400"/> Workout hervatten</span>
          <span className="text-[11px] text-blue-200">{activeWorkout.name} · {doneSetCount(activeWorkout)} sets</span>
        </button>
      )}

      <div className="flex gap-2">
        <button onClick={onNew} className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-xl py-2 text-xs font-medium">
          <Icon name="Plus" size={14}/> Eigen routine
        </button>
        <button onClick={onHistory} className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-xl py-2 text-xs font-medium">
          <Icon name="RotateCcw" size={14}/> Geschiedenis
        </button>
      </div>

      {order.map(grp => (
        <div key={grp}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2 px-1">{grp}</p>
          <div className="space-y-2">
            {groups[grp].map(r => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{r.name}</h3>
                    {r.note && <p className="text-[11px] text-gray-400 mt-0.5">{r.note}</p>}
                    <p className="text-[11px] text-gray-500 mt-1">{r.exercises.length} oefeningen · {r.exercises.map(e => e.name).slice(0, 3).join(', ')}{r.exercises.length > 3 ? '…' : ''}</p>
                  </div>
                  {r.custom && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => onEdit(r)} className="text-gray-400 hover:text-gray-600 p-1"><Icon name="Pencil" size={14}/></button>
                      <button onClick={() => onDelete(r)} className="text-gray-400 hover:text-red-500 p-1"><Icon name="Trash2" size={14}/></button>
                    </div>
                  )}
                </div>
                <button onClick={() => onStart(r)} className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Icon name="Play" size={15}/> Start workout
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Workout-geschiedenis ──────────────────────────────────────────────────────
function WorkoutHistory({ history, onBack, onClear }) {
  const [open, setOpen] = useState(null);
  if (!history.length) return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700"><Icon name="ChevronLeft" size={16}/> Terug</button>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Icon name="RotateCcw" size={28} className="mx-auto text-gray-300 mb-3"/>
        <p className="text-sm text-gray-500">Nog geen voltooide workouts.</p>
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700"><Icon name="ChevronLeft" size={16}/> Terug</button>
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-red-500">Wissen</button>
      </div>
      {history.map(w => {
        const isOpen = open === w.id;
        return (
          <div key={w.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : w.id)} className="w-full p-4 flex items-center justify-between text-left">
              <div>
                <p className="text-sm font-semibold text-gray-900">{w.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{formatDateNice(toDateStr(new Date(w.finishedAt)))} · {fmtDuration(w.durationSec)} · {w.totalVolume} kg</p>
              </div>
              <Icon name="ChevronDown" size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                {w.exercises.map(ex => {
                  const done = (ex.sets || []).filter(s => s.done);
                  if (!done.length) return null;
                  return (
                    <div key={ex.id} className="text-xs">
                      <p className="font-medium text-gray-800">{ex.name}</p>
                      <p className="text-gray-500">{done.map(s => `${s.weight || '–'}×${s.reps || '–'}`).join('  ·  ')}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Routine-editor (eigen routines) ───────────────────────────────────────────
function RoutineEditor({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial ? initial.name : '');
  const [rest, setRest] = useState(initial ? initial.restSec : 90);
  const [exercises, setExercises] = useState(initial ? initial.exercises.map(e => ({ ...e })) : []);
  const [picker, setPicker] = useState('');

  function addExercise(nm) {
    const name = (nm || '').trim();
    if (!name) return;
    setExercises(xs => [...xs, E(name, 3, '8-12')]);
    setPicker('');
  }
  function updateEx(idx, patch) { setExercises(xs => xs.map((e, i) => i === idx ? { ...e, ...patch } : e)); }
  function removeEx(idx) { setExercises(xs => xs.filter((_, i) => i !== idx)); }

  function save() {
    if (!name.trim() || !exercises.length) return;
    onSave({
      id: initial ? initial.id : tUid('r'), custom: true, group: 'Eigen routines',
      name: name.trim(), note: '', restSec: parseInt(rest, 10) || 90, exercises,
    });
  }

  const matches = picker.trim()
    ? MAPS_EXERCISES.filter(n => n.toLowerCase().includes(picker.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="space-y-4">
      <button onClick={onCancel} className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700"><Icon name="ChevronLeft" size={16}/> Terug</button>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Naam</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="bv. Push dag"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Rust tussen sets</label>
          <input type="number" value={rest} onChange={e => setRest(e.target.value)} className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          <span className="text-xs text-gray-400">sec</span>
        </div>
      </div>

      {exercises.map((ex, idx) => (
        <div key={ex.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-800 truncate">{ex.name}</span>
            <button onClick={() => removeEx(idx)} className="text-gray-400 hover:text-red-500"><Icon name="Trash2" size={14}/></button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input type="number" value={ex.sets} onChange={e => updateEx(idx, { sets: e.target.value })} className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              <span className="text-xs text-gray-400">sets</span>
            </div>
            <div className="flex items-center gap-1">
              <input value={ex.reps} onChange={e => updateEx(idx, { reps: e.target.value })} className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              <span className="text-xs text-gray-400">reps</span>
            </div>
          </div>
        </div>
      ))}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <input value={picker} onChange={e => setPicker(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addExercise(picker); }}
          placeholder="Oefening zoeken of typen…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
        {matches.length > 0 && (
          <div className="mt-2 space-y-1">
            {matches.map(n => (
              <button key={n} onClick={() => addExercise(n)} className="w-full text-left text-sm text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-50">{n}</button>
            ))}
          </div>
        )}
        {picker.trim() && (
          <button onClick={() => addExercise(picker)} className="mt-2 w-full text-xs text-orange-600 border border-dashed border-orange-300 rounded-lg py-1.5 hover:bg-orange-50">
            + "{picker.trim()}" toevoegen
          </button>
        )}
      </div>

      <button onClick={save} disabled={!name.trim() || !exercises.length}
        className={`w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-1.5 ${name.trim() && exercises.length ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
        <Icon name="Save" size={15}/> Routine opslaan
      </button>
    </div>
  );
}

// ── Root van de trainingstab ──────────────────────────────────────────────────
function TrainingPanel({ userSlug, profile }) {
  const [view, setView] = useState('overview'); // overview | active | history | editor
  const [custom, setCustom] = useState([]);
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (!userSlug) return;
    setCustom(lsGet(`training-routines:${userSlug}`) || []);
    setActive(lsGet(`training-active:${userSlug}`) || null);
    setHistory(lsGet(`training-history:${userSlug}`) || []);
  }, [userSlug]);

  const routines = useMemo(() => [...custom, ...MAPS_ROUTINES], [custom]);

  function persistActive(w) { setActive(w); if (w) lsSet(`training-active:${userSlug}`, w); else lsDel(`training-active:${userSlug}`); }

  function startWorkout(routine) {
    if (active && !confirm('Er loopt al een workout. Die wordt vervangen — doorgaan?')) return;
    persistActive(tNewWorkoutFromRoutine(routine));
    setView('active');
  }
  function finishWorkout(w) {
    if (!doneSetCount(w) && !confirm('Geen sets afgevinkt. Toch opslaan?')) return;
    const entry = { ...w, finishedAt: Date.now(), durationSec: Math.round((Date.now() - w.startedAt) / 1000), totalVolume: workoutVolume(w) };
    const newHist = [entry, ...history].slice(0, 200);
    setHistory(newHist); lsSet(`training-history:${userSlug}`, newHist);
    persistActive(null); setView('history');
  }
  function cancelWorkout() {
    if (!confirm('Workout annuleren? De ingevoerde sets gaan verloren.')) return;
    persistActive(null); setView('overview');
  }
  function saveRoutine(r) {
    const updated = [...custom.filter(x => x.id !== r.id), r];
    setCustom(updated); lsSet(`training-routines:${userSlug}`, updated);
    setEditing(null); setView('overview');
  }
  function deleteRoutine(r) {
    if (!confirm(`Routine "${r.name}" verwijderen?`)) return;
    const updated = custom.filter(x => x.id !== r.id);
    setCustom(updated); lsSet(`training-routines:${userSlug}`, updated);
  }
  function clearHistory() {
    if (!confirm('Volledige geschiedenis wissen?')) return;
    setHistory([]); lsDel(`training-history:${userSlug}`);
  }

  if (view === 'active' && active) return (
    <ActiveWorkout workout={active} history={history} onChange={persistActive} onFinish={finishWorkout} onCancel={cancelWorkout}/>
  );
  if (view === 'history') return <WorkoutHistory history={history} onBack={() => setView('overview')} onClear={clearHistory}/>;
  if (view === 'editor') return <RoutineEditor initial={editing} onSave={saveRoutine} onCancel={() => { setEditing(null); setView('overview'); }}/>;

  return (
    <RoutineList routines={routines} activeWorkout={active}
      onStart={startWorkout}
      onResume={() => setView('active')}
      onNew={() => { setEditing(null); setView('editor'); }}
      onEdit={r => { setEditing(r); setView('editor'); }}
      onDelete={deleteRoutine}
      onHistory={() => setView('history')}/>
  );
}
