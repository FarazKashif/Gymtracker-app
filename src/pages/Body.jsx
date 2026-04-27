import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { USER_ID } from '../db/seed';
import { PageHeader } from '../components/layout/PageHeader';
import { StatBlock } from '../components/ui/StatBlock';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

const MEASUREMENTS = [
  { key: 'shoulder_cm', label: 'Shoulders', note: 'Widest point' },
  { key: 'chest_cm', label: 'Chest', note: 'At nipple line' },
  { key: 'waist_cm', label: 'Waist', note: 'At navel' },
  { key: 'hips_cm', label: 'Hips', note: 'Widest point' },
  { key: 'upper_arm_flexed_cm', label: 'Upper arm', note: 'Dominant, flexed' },
  { key: 'forearm_cm', label: 'Forearm', note: 'Dominant, widest' },
  { key: 'thigh_cm', label: 'Thigh', note: 'Dominant, widest' },
  { key: 'calf_cm', label: 'Calf', note: 'Dominant, widest' },
  { key: 'neck_cm', label: 'Neck', note: 'At thyroid cartilage' },
];

const TAB_LABELS = ['ENTRY', 'HISTORY', 'DIAGNOSTICS'];

// ─── Measurement Entry ─────────────────────────────────────────────
function MeasurementEntry() {
  const [date, setDate] = useState(getTodayStr());
  const [values, setValues] = useState(
    Object.fromEntries(MEASUREMENTS.map(m => [m.key, '']))
  );
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const entry = {
      id: crypto.randomUUID(),
      user_id: USER_ID,
      measured_at: date,
    };
    MEASUREMENTS.forEach(m => {
      entry[m.key] = parseFloat(values[m.key]) || null;
    });
    await db.body_measurements.add(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setValues(Object.fromEntries(MEASUREMENTS.map(m => [m.key, ''])));
  };

  const anyFilled = MEASUREMENTS.some(m => values[m.key]);

  return (
    <div className="space-y-4">
      <div className="card-accent-teal">
        <p className="label-micro mb-1">Monthly Body Scan</p>
        <p className="text-text-muted text-xs" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Take all measurements in the morning, unflexed (except upper arm), with the same tape
          position each time. Enter only the measurements you have.
        </p>
      </div>

      <div>
        <p className="label-micro mb-1">DATE</p>
        <input type="date" className="field-input" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="space-y-2">
        {MEASUREMENTS.map(m => (
          <div key={m.key} className="flex items-center justify-between bg-bg-card border border-border px-3 py-2 rounded-sm">
            <div>
              <p className="font-bold text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}>
                {m.label}
              </p>
              <p className="label-micro">{m.note}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="field-input w-24 text-right"
                placeholder="cm"
                value={values[m.key]}
                onChange={e => setValues(prev => ({ ...prev, [m.key]: e.target.value }))}
                step={0.1}
                min={0}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn-primary w-full"
        onClick={handleSave}
        disabled={!anyFilled}
      >
        {saved ? '✓ SAVED' : 'SAVE MEASUREMENTS →'}
      </button>

      <div className="card-accent p-3 mt-2">
        <p className="label-micro mb-1">Photo Reminder</p>
        <p className="text-text-muted text-xs" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Take front, side, and back photos in the same location, lighting, and time of day.
          Save them to your phone's gallery — IronLog does not store images.
        </p>
      </div>
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────
function MeasurementHistory() {
  const measurements = useLiveQuery(async () => {
    const all = await db.body_measurements.where('user_id').equals(USER_ID).toArray();
    return all.sort((a, b) => b.measured_at < a.measured_at ? -1 : 1);
  }, []);

  if (!measurements?.length) {
    return (
      <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        No measurements logged yet. Use the Entry tab to log your first scan.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {measurements.map((m, i) => {
        const baseline = measurements[measurements.length - 1];
        return (
          <div key={m.id} className="bg-bg-card border border-border rounded-sm px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}>
                {m.measured_at}
              </p>
              {i === 0 && <span className="label-micro text-accent">LATEST</span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MEASUREMENTS.filter(mf => m[mf.key] != null).map(mf => {
                const delta = i === 0 && baseline && baseline.id !== m.id
                  ? (m[mf.key] - baseline[mf.key]).toFixed(1)
                  : null;
                const isWaist = mf.key === 'waist_cm';
                const isMuscle = ['shoulder_cm', 'upper_arm_flexed_cm'].includes(mf.key);
                return (
                  <div key={mf.key} className="stat-block">
                    <span className="stat-label">{mf.label.slice(0, 10)}</span>
                    <span className="stat-value text-sm">{m[mf.key]}<span className="stat-unit">cm</span></span>
                    {delta !== null && (
                      <span className={`text-xs data-value ${
                        parseFloat(delta) > 0
                          ? isMuscle ? 'text-green' : isWaist ? 'text-yellow' : 'text-green'
                          : 'text-text-muted'
                      }`}>
                        {parseFloat(delta) >= 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Diagnostics ──────────────────────────────────────────────────
function Diagnostics() {
  const measurements = useLiveQuery(async () => {
    const all = await db.body_measurements.where('user_id').equals(USER_ID).toArray();
    return all.sort((a, b) => a.measured_at < b.measured_at ? -1 : 1);
  }, []);

  const weighIns = useLiveQuery(async () => {
    const all = await db.weigh_ins.where('user_id').equals(USER_ID).toArray();
    return all.sort((a, b) => a.weighed_at < b.weighed_at ? -1 : 1);
  }, []);

  if (!measurements || measurements.length < 2) {
    return (
      <div className="card-accent-teal p-4">
        <p className="label-micro mb-2">Body Composition Diagnostics</p>
        <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Log at least 2 monthly measurements to see diagnostic ratios.
          The key insight: shoulder and arm measurements should grow faster than your waist.
        </p>
      </div>
    );
  }

  const baseline = measurements[0];
  const latest = measurements[measurements.length - 1];

  const delta = (key) => {
    const b = baseline[key]; const l = latest[key];
    if (b == null || l == null) return null;
    return l - b;
  };

  const shoulderDelta = delta('shoulder_cm');
  const armDelta = delta('upper_arm_flexed_cm');
  const waistDelta = delta('waist_cm');

  const diagOk = shoulderDelta !== null && waistDelta !== null
    ? shoulderDelta > waistDelta * 1.5 || waistDelta <= 0
    : null;

  const totalWeightGain = weighIns && weighIns.length >= 2
    ? weighIns[weighIns.length - 1].weight_kg - weighIns[0].weight_kg
    : null;

  return (
    <div className="space-y-4">
      {/* Key ratios */}
      <div className="card-accent-teal">
        <p className="label-micro mb-2">Growth Ratio Diagnosis</p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatBlock label="Shoulders Δ" value={shoulderDelta != null ? `${shoulderDelta >= 0 ? '+' : ''}${shoulderDelta.toFixed(1)}` : '—'} unit="cm" />
          <StatBlock label="Arm Δ" value={armDelta != null ? `${armDelta >= 0 ? '+' : ''}${armDelta.toFixed(1)}` : '—'} unit="cm" />
          <StatBlock label="Waist Δ" value={waistDelta != null ? `${waistDelta >= 0 ? '+' : ''}${waistDelta.toFixed(1)}` : '—'} unit="cm" accent />
        </div>

        {diagOk !== null && (
          <div className={`px-3 py-2 rounded-sm text-sm border ${
            diagOk ? 'border-green text-green' : 'border-yellow text-yellow'
          }`} style={{ borderRadius: 2, fontFamily: 'Barlow Condensed, sans-serif' }}>
            {diagOk
              ? '✓ Muscle is growing faster than fat. Composition is tracking well.'
              : '⚠ Waist growing faster than shoulders. Check surplus size and fat distribution.'
            }
          </div>
        )}
      </div>

      {/* All deltas from baseline */}
      <div>
        <p className="label-micro mb-2">Change from Baseline ({baseline.measured_at})</p>
        <div className="space-y-1.5">
          {MEASUREMENTS.map(m => {
            const d = delta(m.key);
            if (d === null) return null;
            const isWaist = m.key === 'waist_cm';
            const isMuscle = ['shoulder_cm', 'upper_arm_flexed_cm', 'chest_cm'].includes(m.key);
            const sign = d >= 0 ? '+' : '';
            const good = isMuscle ? d > 0 : isWaist ? d <= 1 : true;
            return (
              <div key={m.key} className="flex items-center justify-between bg-bg-card border border-border px-3 py-2 rounded-sm">
                <p className="text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{m.label}</p>
                <div className="flex items-center gap-2">
                  <span className="data-value text-sm">{latest[m.key]}cm</span>
                  <span className={`data-value text-xs ${d > 0 ? (good ? 'text-green' : 'text-yellow') : 'text-text-muted'}`}>
                    {sign}{d.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalWeightGain !== null && (
        <div className="card-accent p-3">
          <p className="label-micro mb-1">Weight vs Measurements</p>
          <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Total scale gain: <span className="text-accent data-value">{totalWeightGain >= 0 ? '+' : ''}{totalWeightGain.toFixed(1)} kg</span>
            {shoulderDelta !== null && ` · Shoulder: ${shoulderDelta >= 0 ? '+' : ''}${shoulderDelta.toFixed(1)} cm`}
            {waistDelta !== null && ` · Waist: ${waistDelta >= 0 ? '+' : ''}${waistDelta.toFixed(1)} cm`}
          </p>
        </div>
      )}
    </div>
  );
}

export function Body() {
  const [tab, setTab] = useState(0);

  return (
    <div>
      <PageHeader title="Body" subtitle="Monthly measurements + diagnostics" />

      <div className="flex border-b border-border">
        {TAB_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex-1 py-3 text-xs transition-colors ${
              tab === i ? 'text-teal border-b-2 border-teal' : 'text-text-muted hover:text-text-primary'
            }`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.15em', borderColor: tab === i ? '#2DD4BF' : undefined }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 0 && <MeasurementEntry />}
        {tab === 1 && <MeasurementHistory />}
        {tab === 2 && <Diagnostics />}
      </div>
    </div>
  );
}
