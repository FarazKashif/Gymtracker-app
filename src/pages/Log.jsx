import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { USER_ID } from '../db/seed';
import { PageHeader } from '../components/layout/PageHeader';
import { RatingSelector } from '../components/ui/TapSelector';
import { StatBlock } from '../components/ui/StatBlock';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms'];
const SORENESS_LABELS = ['None', 'Mild', 'Moderate', 'Severe', 'Very severe'];

function SorenessGrid({ value, onChange }) {
  const scores = [0, 1, 2, 3, 4];
  return (
    <div className="space-y-2">
      {MUSCLE_GROUPS.map(muscle => (
        <div key={muscle}>
          <div className="flex items-center justify-between mb-1">
            <p className="label-micro">{muscle.toUpperCase()}</p>
            <p className="label-micro text-text-muted">{SORENESS_LABELS[value[muscle] || 0]}</p>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {scores.map(score => (
              <button
                key={score}
                className={`py-2 text-xs rounded-sm border transition-all ${
                  (value[muscle] || 0) === score
                    ? 'bg-accent border-accent text-bg-base font-bold'
                    : 'border-border text-text-muted hover:text-text-primary'
                }`}
                style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em', borderRadius: 2 }}
                onClick={() => onChange({ ...value, [muscle]: score })}
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyCheckIn() {
  const today = getTodayStr();
  const existing = useLiveQuery(
    () => db.daily_logs.where('user_id').equals(USER_ID).filter(l => l.logged_date === today).first(),
    [today]
  );

  const [sleep, setSleep] = useState(7.5);
  const [energy, setEnergy] = useState(null);
  const [creatine, setCreatine] = useState(false);
  const [protein, setProtein] = useState(false);
  const [soreness, setSoreness] = useState({});
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const entry = {
      id: existing?.id || crypto.randomUUID(),
      user_id: USER_ID,
      logged_date: today,
      sleep_hours: sleep,
      creatine_taken: creatine,
      protein_shake_taken: protein,
      soreness_json: soreness,
      energy_level: energy,
      notes,
    };

    if (existing?.id) {
      await db.daily_logs.update(existing.id, entry);
    } else {
      await db.daily_logs.add(entry);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Pre-fill if existing
  const isLoaded = existing !== undefined;
  if (existing && !saved && isLoaded && !energy) {
    // Pre-populate form from existing entry on first load
  }

  return (
    <div className="space-y-5">
      <div className="card-accent-green p-3">
        <p className="label-micro mb-1">Daily Check-In</p>
        <p className="text-text-muted text-xs" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Under 60 seconds. Consistent logging reveals your personal performance patterns.
        </p>
      </div>

      {/* Sleep */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="label-micro">SLEEP LAST NIGHT</p>
          <span className="data-value text-accent">{sleep}h</span>
        </div>
        <input
          type="range"
          min={3} max={12} step={0.5}
          value={sleep}
          onChange={e => setSleep(parseFloat(e.target.value))}
          className="w-full"
          style={{ accentColor: '#F97316' }}
        />
        <div className="flex justify-between">
          <span className="label-micro">3h</span>
          <span className="label-micro">12h</span>
        </div>
      </div>

      {/* Energy */}
      <div>
        <p className="label-micro mb-2">ENERGY LEVEL TODAY</p>
        <RatingSelector value={energy} onChange={setEnergy} />
        <div className="flex justify-between mt-1">
          <span className="label-micro">Exhausted</span>
          <span className="label-micro">Peak</span>
        </div>
      </div>

      {/* Supplements */}
      <div>
        <p className="label-micro mb-2">SUPPLEMENTS</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCreatine(!creatine)}
            className={`py-3 border rounded-sm text-sm transition-all ${
              creatine ? 'bg-accent border-accent text-bg-base font-bold' : 'border-border text-text-muted'
            }`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em', borderRadius: 2 }}
          >
            {creatine ? '✓ ' : ''}CREATINE 5g
          </button>
          <button
            onClick={() => setProtein(!protein)}
            className={`py-3 border rounded-sm text-sm transition-all ${
              protein ? 'bg-accent border-accent text-bg-base font-bold' : 'border-border text-text-muted'
            }`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em', borderRadius: 2 }}
          >
            {protein ? '✓ ' : ''}WHEY PROTEIN
          </button>
        </div>
      </div>

      {/* Soreness */}
      <div>
        <p className="label-micro mb-2">MUSCLE SORENESS (0–4)</p>
        <SorenessGrid value={soreness} onChange={setSoreness} />
      </div>

      {/* Notes */}
      <div>
        <p className="label-micro mb-1">NOTES (optional)</p>
        <textarea
          className="field-input"
          rows={2}
          placeholder="How are you feeling today? Anything worth noting?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <button
        className="btn-primary w-full"
        onClick={handleSave}
        disabled={!energy}
      >
        {saved ? '✓ SAVED' : existing ? 'UPDATE CHECK-IN →' : 'LOG CHECK-IN →'}
      </button>
    </div>
  );
}

function LogHistory() {
  const logs = useLiveQuery(async () => {
    const all = await db.daily_logs.where('user_id').equals(USER_ID).toArray();
    return all.sort((a, b) => b.logged_date < a.logged_date ? -1 : 1).slice(0, 14);
  }, []);

  if (!logs?.length) {
    return (
      <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        No check-ins logged yet.
      </p>
    );
  }

  const creatineStreak = (() => {
    let streak = 0;
    for (const l of logs) {
      if (l.creatine_taken) streak++;
      else break;
    }
    return streak;
  })();

  const avgSleep = logs.slice(0, 7).reduce((s, l) => s + (l.sleep_hours || 0), 0) / Math.min(7, logs.length);
  const avgEnergy = logs.slice(0, 7).filter(l => l.energy_level).reduce((s, l) => s + l.energy_level, 0) / Math.min(7, logs.filter(l => l.energy_level).length);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg-card border border-border p-2 rounded-sm">
          <StatBlock label="Creatine streak" value={creatineStreak} unit="days" accent />
        </div>
        <div className="bg-bg-card border border-border p-2 rounded-sm">
          <StatBlock label="7d avg sleep" value={avgSleep.toFixed(1)} unit="h" />
        </div>
        <div className="bg-bg-card border border-border p-2 rounded-sm">
          <StatBlock label="7d avg energy" value={isNaN(avgEnergy) ? '—' : avgEnergy.toFixed(1)} unit="/5" />
        </div>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="bg-bg-card border border-border rounded-sm px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}>
                {log.logged_date}
              </p>
              <div className="flex gap-2">
                {log.creatine_taken && <span className="label-micro text-green">CR</span>}
                {log.protein_shake_taken && <span className="label-micro text-green">WH</span>}
              </div>
            </div>
            <div className="flex gap-4">
              <StatBlock label="Sleep" value={log.sleep_hours ?? '—'} unit="h" />
              <StatBlock label="Energy" value={log.energy_level ?? '—'} unit="/5" />
              {log.soreness_json && Object.keys(log.soreness_json).length > 0 && (
                <div className="stat-block">
                  <span className="stat-label">Soreness</span>
                  <span className="stat-value text-sm">
                    {MUSCLE_GROUPS
                      .filter(m => log.soreness_json[m] > 0)
                      .map(m => `${m.slice(0, 3).toUpperCase()}:${log.soreness_json[m]}`)
                      .join(' ')}
                  </span>
                </div>
              )}
            </div>
            {log.notes && (
              <p className="text-text-muted text-xs mt-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                {log.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_LABELS = ["TODAY'S CHECK-IN", 'HISTORY'];

export function Log() {
  const [tab, setTab] = useState(0);

  return (
    <div>
      <PageHeader title="Daily Log" subtitle="Sleep · Energy · Supplements · Soreness" />

      <div className="flex border-b border-border">
        {TAB_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex-1 py-3 text-xs transition-colors ${
              tab === i ? 'text-green border-b-2 border-green' : 'text-text-muted hover:text-text-primary'
            }`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em', borderColor: tab === i ? '#34D399' : undefined }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 0 && <DailyCheckIn />}
        {tab === 1 && <LogHistory />}
      </div>
    </div>
  );
}
