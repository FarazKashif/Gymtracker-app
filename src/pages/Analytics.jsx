import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import { db } from '../db/database';
import { USER_ID } from '../db/seed';
import { PageHeader } from '../components/layout/PageHeader';

const CHART_COLOURS = {
  accent: '#F97316',
  green: '#34D399',
  purple: '#C084FC',
  yellow: '#FBBF24',
  teal: '#2DD4BF',
  red: '#F87171',
  muted: '#5A5A54',
};

const chartTheme = {
  style: { background: 'transparent' },
};

const axisStyle = {
  tick: { fill: '#5A5A54', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
  axisLine: { stroke: '#222222' },
  tickLine: { stroke: '#222222' },
};

const tooltipStyle = {
  contentStyle: { background: '#111111', border: '1px solid #2E2E2E', borderRadius: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
  itemStyle: { color: '#DEDED6' },
  labelStyle: { color: '#5A5A54', fontSize: 9, letterSpacing: '0.1em' },
};

const TAB_LABELS = ['STRENGTH', 'VOLUME', 'SLEEP', 'SURPLUS', 'RADAR'];

// ─── Strength Curves ──────────────────────────────────────────────
function StrengthCurves() {
  const [selectedExId, setSelectedExId] = useState(null);

  const exercises = useLiveQuery(async () => {
    const rules = await db.progression_rules.where('user_id').equals(USER_ID).toArray();
    if (!rules.length) return [];
    const exIds = rules.map(r => r.exercise_id);
    const exes = await db.exercises.bulkGet(exIds);
    return exes.filter(Boolean);
  }, []);

  const chartData = useLiveQuery(async () => {
    if (!selectedExId) return [];
    const setLogs = await db.set_logs.where('exercise_id').equals(selectedExId).toArray();
    if (!setLogs.length) return [];

    const sessionIds = [...new Set(setLogs.map(s => s.session_id))];
    const sessions = await db.workout_sessions.bulkGet(sessionIds);
    const sessionMap = Object.fromEntries(sessions.filter(Boolean).map(s => [s.id, s]));

    // Group by session, take max weight per session
    const grouped = {};
    for (const log of setLogs) {
      const sess = sessionMap[log.session_id];
      if (!sess) continue;
      const date = new Date(sess.started_at).toISOString().slice(0, 10);
      if (!grouped[date] || grouped[date].weight < log.actual_weight_kg) {
        grouped[date] = { date, weight: log.actual_weight_kg || 0, reps: log.actual_reps || 0 };
      }
    }
    return Object.values(grouped).sort((a, b) => a.date < b.date ? -1 : 1);
  }, [selectedExId]);

  return (
    <div className="space-y-4">
      <div>
        <p className="label-micro mb-2">SELECT EXERCISE</p>
        <div className="overflow-x-auto flex gap-1 pb-1" style={{ scrollbarWidth: 'none' }}>
          {(exercises || []).map(ex => (
            <button
              key={ex.id}
              onClick={() => setSelectedExId(ex.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs rounded-sm border transition-all ${
                selectedExId === ex.id
                  ? 'bg-accent border-accent text-bg-base font-bold'
                  : 'border-border text-text-muted hover:text-text-primary'
              }`}
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>

      {!selectedExId && (
        <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Select an exercise to see its strength progression curve.
        </p>
      )}

      {selectedExId && chartData && chartData.length < 2 && (
        <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Not enough data yet. Log at least 2 sessions for this exercise.
        </p>
      )}

      {selectedExId && chartData && chartData.length >= 2 && (
        <div>
          <p className="label-micro mb-2">WORKING WEIGHT OVER TIME</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} {...chartTheme}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="2 4" />
              <XAxis dataKey="date" {...axisStyle} tickFormatter={d => d.slice(5)} />
              <YAxis {...axisStyle} unit="kg" />
              <Tooltip {...tooltipStyle} />
              <Line
                type="monotone" dataKey="weight" stroke={CHART_COLOURS.accent}
                strokeWidth={2} dot={{ r: 3, fill: CHART_COLOURS.accent }} activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Volume Load ──────────────────────────────────────────────────
function VolumeLoad() {
  const data = useLiveQuery(async () => {
    const sessions = await db.workout_sessions.where('user_id').equals(USER_ID).toArray();
    if (!sessions.length) return [];

    const result = [];
    for (const sess of sessions.sort((a, b) => a.started_at - b.started_at)) {
      const setLogs = await db.set_logs.where('session_id').equals(sess.id).toArray();
      const date = new Date(sess.started_at).toISOString().slice(0, 10);
      const volume = setLogs.reduce((s, l) => s + (l.actual_sets || 1) * (l.actual_reps || 0) * (l.actual_weight_kg || 0), 0);
      const totalSets = setLogs.length;
      result.push({ date, volume: Math.round(volume), sets: totalSets });
    }
    return result;
  }, []);

  if (!data || data.length < 2) {
    return (
      <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        Log at least 2 sessions to see volume trends.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="label-micro mb-2">TOTAL VOLUME (sets × reps × kg)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} {...chartTheme}>
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="2 4" />
            <XAxis dataKey="date" {...axisStyle} tickFormatter={d => d.slice(5)} />
            <YAxis {...axisStyle} unit="kg" />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="volume" fill={CHART_COLOURS.purple} radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="label-micro mb-2">SETS PER SESSION</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} {...chartTheme}>
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="2 4" />
            <XAxis dataKey="date" {...axisStyle} tickFormatter={d => d.slice(5)} />
            <YAxis {...axisStyle} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="sets" stroke={CHART_COLOURS.teal} strokeWidth={2} dot={{ r: 3, fill: CHART_COLOURS.teal }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Sleep vs Performance ─────────────────────────────────────────
function SleepPerformance() {
  const data = useLiveQuery(async () => {
    const sessions = await db.workout_sessions
      .where('user_id').equals(USER_ID)
      .filter(s => s.session_rating != null)
      .toArray();

    const result = [];
    for (const sess of sessions) {
      const date = new Date(sess.started_at).toISOString().slice(0, 10);
      const log = await db.daily_logs
        .where('user_id').equals(USER_ID)
        .filter(l => l.logged_date === date)
        .first();
      if (log?.sleep_hours) {
        result.push({
          sleep: log.sleep_hours,
          rating: sess.session_rating,
          date,
        });
      }
    }
    return result;
  }, []);

  if (!data || data.length < 3) {
    return (
      <div className="space-y-3">
        <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Log sleep in your daily check-in and rate your sessions to build the sleep–performance correlation.
          After 10+ data points, a clear threshold will emerge showing your optimal sleep duration.
        </p>
        <p className="label-micro">{data?.length || 0} / 10 data points collected</p>
      </div>
    );
  }

  return (
    <div>
      <p className="label-micro mb-2">SLEEP HOURS vs SESSION RATING</p>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart {...chartTheme}>
          <CartesianGrid stroke="#1A1A1A" strokeDasharray="2 4" />
          <XAxis
            dataKey="sleep" type="number" domain={[4, 10]} name="Sleep"
            {...axisStyle} unit="h" label={{ value: 'Sleep (h)', position: 'insideBottom', offset: -2, fill: '#5A5A54', fontSize: 10 }}
          />
          <YAxis
            dataKey="rating" type="number" domain={[0, 5]} name="Rating"
            {...axisStyle} label={{ value: 'Rating', angle: -90, position: 'insideLeft', fill: '#5A5A54', fontSize: 10 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div style={{ background: '#111', border: '1px solid #2E2E2E', padding: '6px 10px', borderRadius: 2, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                  <p style={{ color: '#5A5A54', fontSize: 9, letterSpacing: '0.1em' }}>{d.date}</p>
                  <p style={{ color: '#DEDED6' }}>{d.sleep}h sleep → {d.rating}/5 session</p>
                </div>
              );
            }}
          />
          <Scatter data={data} fill={CHART_COLOURS.green} opacity={0.8} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Surplus Calibration ──────────────────────────────────────────
function SurplusCalibration() {
  const data = useLiveQuery(async () => {
    const weighIns = await db.weigh_ins.where('user_id').equals(USER_ID).toArray();
    if (weighIns.length < 4) return null;

    const sorted = [...weighIns].sort((a, b) => a.weighed_at < b.weighed_at ? -1 : 1);
    const result = [];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const gainKg = curr.weight_kg - prev.weight_kg;

      // Average daily add-on calories between these two weigh-ins
      const foodLogs = await db.food_logs
        .where('user_id').equals(USER_ID)
        .filter(l => l.logged_date >= prev.weighed_at && l.logged_date < curr.weighed_at)
        .toArray();

      if (foodLogs.length > 0) {
        const daySpan = Math.max(1, (new Date(curr.weighed_at) - new Date(prev.weighed_at)) / (24 * 3600 * 1000));
        const totalCals = foodLogs.reduce((s, l) => s + (l.calories_total || 0), 0);
        const avgDailyCals = totalCals / daySpan;
        result.push({ calories: Math.round(avgDailyCals), gain: parseFloat(gainKg.toFixed(2)), date: curr.weighed_at });
      }
    }
    return result.length >= 3 ? result : null;
  }, []);

  if (data === undefined) return <p className="text-text-muted text-sm">Loading...</p>;

  if (!data) {
    return (
      <div className="card-accent-yellow p-4">
        <p className="label-micro mb-2">Surplus Calibration Curve</p>
        <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          This chart needs at least 4 consecutive weekly weigh-ins with daily food log data.
          Once built, it becomes your personal metabolic map — showing exactly how many add-on
          calories produce how much weight gain for your specific metabolism.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="label-micro mb-2">ADD-ON CALORIES vs WEEKLY GAIN</p>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart {...chartTheme}>
          <CartesianGrid stroke="#1A1A1A" strokeDasharray="2 4" />
          <XAxis dataKey="calories" type="number" name="Calories" {...axisStyle} unit=" kcal"
            label={{ value: 'Avg daily add-ons (kcal)', position: 'insideBottom', offset: -2, fill: '#5A5A54', fontSize: 10 }} />
          <YAxis dataKey="gain" type="number" name="Gain" {...axisStyle} unit="kg"
            label={{ value: 'Weekly gain (kg)', angle: -90, position: 'insideLeft', fill: '#5A5A54', fontSize: 10 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div style={{ background: '#111', border: '1px solid #2E2E2E', padding: '6px 10px', borderRadius: 2, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                  <p style={{ color: '#5A5A54', fontSize: 9 }}>{d.date}</p>
                  <p style={{ color: '#DEDED6' }}>{d.calories} kcal/day → {d.gain > 0 ? '+' : ''}{d.gain} kg/wk</p>
                </div>
              );
            }}
          />
          <Scatter data={data} fill={CHART_COLOURS.yellow} opacity={0.8} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Measurement Radar ────────────────────────────────────────────
function MeasurementRadar() {
  const data = useLiveQuery(async () => {
    const all = await db.body_measurements.where('user_id').equals(USER_ID).toArray();
    if (all.length < 2) return null;
    const sorted = [...all].sort((a, b) => a.measured_at < b.measured_at ? -1 : 1);
    return { baseline: sorted[0], latest: sorted[sorted.length - 1] };
  }, []);

  if (!data) {
    return (
      <div className="card-accent-teal p-4">
        <p className="label-micro mb-2">Measurement Delta Radar</p>
        <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Log at least 2 monthly body measurements to see your growth radar chart.
        </p>
      </div>
    );
  }

  const { baseline, latest } = data;
  const fields = [
    { key: 'shoulder_cm', label: 'Shoulders' },
    { key: 'chest_cm', label: 'Chest' },
    { key: 'upper_arm_flexed_cm', label: 'Arm' },
    { key: 'forearm_cm', label: 'Forearm' },
    { key: 'neck_cm', label: 'Neck' },
    { key: 'thigh_cm', label: 'Thigh' },
    { key: 'calf_cm', label: 'Calf' },
    { key: 'waist_cm', label: 'Waist' },
  ];

  const radarData = fields
    .filter(f => baseline[f.key] != null && latest[f.key] != null)
    .map(f => ({
      subject: f.label,
      baseline: 100,
      current: parseFloat(((latest[f.key] / baseline[f.key]) * 100).toFixed(1)),
    }));

  if (radarData.length < 3) {
    return <p className="text-text-muted text-sm">Not enough measurements across categories.</p>;
  }

  return (
    <div>
      <p className="label-micro mb-2">% CHANGE FROM BASELINE</p>
      <p className="text-text-muted text-xs mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        Radar shows current measurements as % of baseline. Shoulders and arms should extend further than waist.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius={90} data={radarData} {...chartTheme}>
          <PolarGrid stroke="#1A1A1A" />
          <PolarAngleAxis dataKey="subject"
            tick={{ fill: '#5A5A54', fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif' }} />
          <PolarRadiusAxis angle={30} domain={[95, 115]}
            tick={{ fill: '#3A3A34', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }} />
          <Radar name="Baseline" dataKey="baseline" stroke="#2E2E2E" fill="#222222" fillOpacity={0.3} />
          <Radar name="Current" dataKey="current" stroke={CHART_COLOURS.teal} fill={CHART_COLOURS.teal} fillOpacity={0.2} />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#5A5A54', fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}>
                {value.toUpperCase()}
              </span>
            )}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div style={{ background: '#111', border: '1px solid #2E2E2E', padding: '6px 10px', borderRadius: 2, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                  {payload.map(p => (
                    <p key={p.name} style={{ color: p.stroke }}>{p.name}: {p.value}%</p>
                  ))}
                </div>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Analytics() {
  const [tab, setTab] = useState(0);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Strength · Volume · Sleep · Surplus · Body" />

      <div className="flex border-b border-border overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TAB_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex-shrink-0 px-3 py-3 text-xs transition-colors ${
              tab === i ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-primary'
            }`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 0 && <StrengthCurves />}
        {tab === 1 && <VolumeLoad />}
        {tab === 2 && <SleepPerformance />}
        {tab === 3 && <SurplusCalibration />}
        {tab === 4 && <MeasurementRadar />}
      </div>
    </div>
  );
}
