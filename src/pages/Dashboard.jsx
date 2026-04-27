import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { USER_ID } from '../db/seed';
import { useUser } from '../hooks/useUser';
import { PageHeader } from '../components/layout/PageHeader';
import { StatBlock } from '../components/ui/StatBlock';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekday() {
  return new Date().getDay(); // 0=Sun..6=Sat; our templates use 0=Mon so adjust
}

function getMondayBasedDay() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1; // Sun→6, Mon→0, …
}

function useNextTemplate() {
  return useLiveQuery(async () => {
    const templates = await db.workout_templates.where('user_id').equals(USER_ID).toArray();
    const active = templates.filter(t => t.is_active);
    if (!active.length) return null;
    const todayIdx = getMondayBasedDay();
    const sorted = [...active].sort((a, b) => {
      const aDist = Math.min(...(a.day_index || []).map(d => (d - todayIdx + 7) % 7));
      const bDist = Math.min(...(b.day_index || []).map(d => (d - todayIdx + 7) % 7));
      return aDist - bDist;
    });
    return sorted[0] || null;
  }, []);
}

function useWeekSessions() {
  return useLiveQuery(async () => {
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return db.workout_sessions
      .where('started_at').above(weekStart)
      .filter(s => s.user_id === USER_ID)
      .toArray();
  }, []);
}

function useLatestWeighIns() {
  return useLiveQuery(async () => {
    const all = await db.weigh_ins.where('user_id').equals(USER_ID)
      .reverse().sortBy('weighed_at');
    return all.slice(0, 8);
  }, []);
}

function useTodayLog() {
  const today = getTodayStr();
  return useLiveQuery(() =>
    db.daily_logs.where('user_id').equals(USER_ID)
      .filter(l => l.logged_date === today).first()
  , [today]);
}

function usePendingProgressions() {
  return useLiveQuery(async () => {
    const rules = await db.progression_rules.where('user_id').equals(USER_ID).toArray();
    return rules.filter(r => r.status === 'ready_to_progress' || r.status === 'stalled' || r.status === 'deload_suggested');
  }, []);
}

function WeightTrendCard({ weighIns }) {
  if (!weighIns || weighIns.length < 2) {
    return (
      <div className="card-accent-yellow p-3">
        <p className="label-micro mb-1">Weight Trend</p>
        <p className="text-text-muted text-sm">Log at least 2 weigh-ins to see trend.</p>
      </div>
    );
  }

  const sorted = [...weighIns].sort((a, b) => a.weighed_at < b.weighed_at ? -1 : 1);
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const delta = latest.weight_kg - prev.weight_kg;
  const sign = delta >= 0 ? '+' : '';

  // Rolling avg of last 4
  const last4 = sorted.slice(-4);
  const avg = last4.reduce((s, w) => s + w.weight_kg, 0) / last4.length;

  return (
    <div className="card-accent-yellow">
      <p className="label-micro mb-2">Weight Trend</p>
      <div className="flex gap-6">
        <StatBlock label="Latest" value={latest.weight_kg.toFixed(1)} unit="kg" accent />
        <StatBlock label="4-wk avg" value={avg.toFixed(1)} unit="kg" />
        <StatBlock label="vs prev wk" value={`${sign}${delta.toFixed(1)}`} unit="kg" />
      </div>
    </div>
  );
}

function ProgressionAlerts({ rules }) {
  if (!rules || !rules.length) return null;

  return (
    <div className="card-accent">
      <p className="label-micro mb-2">Progression Pending</p>
      <div className="space-y-1">
        {rules.map(r => (
          <div key={r.id} className="flex items-center justify-between">
            <span className="text-sm text-text-primary" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              {r.exercise_id}
            </span>
            <span className={`text-xs data-value ${
              r.status === 'ready_to_progress' ? 'text-green' :
              r.status === 'stalled' ? 'text-yellow' : 'text-red'
            }`}>
              {r.status === 'ready_to_progress' ? '↑ READY' :
               r.status === 'stalled' ? '⚠ STALLED' : '↓ DELOAD'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckInCard({ todayLog, navigate }) {
  const today = getTodayStr();
  if (todayLog) {
    return (
      <div className="card-accent-green p-3">
        <p className="label-micro mb-1">Today's Check-In</p>
        <div className="flex gap-4">
          <StatBlock label="Sleep" value={todayLog.sleep_hours ?? '—'} unit="h" />
          <StatBlock label="Energy" value={todayLog.energy_level ?? '—'} unit="/5" />
          <div className="flex gap-2 items-end">
            {todayLog.creatine_taken && <span className="text-xs text-green data-value">CR ✓</span>}
            {todayLog.protein_shake_taken && <span className="text-xs text-green data-value">WH ✓</span>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={() => navigate('/log')}
      className="card-accent-green w-full text-left cursor-pointer hover:border-green transition-colors"
      style={{ display: 'block' }}
    >
      <p className="label-micro mb-1">Daily Check-In</p>
      <p className="text-text-muted text-sm">No check-in logged today. Tap to log →</p>
    </button>
  );
}

export function Dashboard() {
  const user = useUser();
  const nextTemplate = useNextTemplate();
  const weekSessions = useWeekSessions();
  const weighIns = useLatestWeighIns();
  const todayLog = useTodayLog();
  const pendingRules = usePendingProgressions();
  const navigate = useNavigate();

  const today = new Date();
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const todayMon = getMondayBasedDay();

  return (
    <div>
      <div className="px-4 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-widest uppercase text-text-primary"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.2em' }}>
              IRONLOG
            </h1>
            <p className="label-micro mt-0.5">
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="label-micro">Welcome back</p>
            <p className="text-accent font-bold text-lg"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}>
              {user?.name || 'FARAZ'}
            </p>
          </div>
        </div>
      </div>

      {/* Week strip */}
      <div className="px-4 py-3 border-b border-border">
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((d, i) => {
            const isToday = i === todayMon;
            const hasSession = weekSessions?.some(s => {
              const sd = new Date(s.started_at);
              const sdMon = sd.getDay() === 0 ? 6 : sd.getDay() - 1;
              return sdMon === i;
            });
            return (
              <div key={d} className={`flex flex-col items-center py-1.5 rounded-sm ${isToday ? 'bg-bg-active' : ''}`}
                style={{ borderRadius: 2 }}>
                <span className="label-micro" style={{ fontSize: '0.55rem' }}>{d}</span>
                <div className={`mt-1 w-1.5 h-1.5 rounded-full ${
                  hasSession ? 'bg-accent' : isToday ? 'bg-border-emphasis' : 'bg-bg-elevated'
                }`} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* Next session */}
        {nextTemplate && (
          <div>
            <p className="label-micro mb-2">Next Scheduled</p>
            <button
              onClick={() => navigate('/session')}
              className="w-full text-left card-accent-purple hover:border-purple transition-all"
              style={{ cursor: 'pointer', display: 'block' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary font-bold text-lg"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}>
                    {nextTemplate.name}
                  </p>
                  <p className="label-micro mt-0.5">
                    {(nextTemplate.day_index || []).map(d => dayNames[d]).join(' · ')}
                  </p>
                </div>
                <span className="text-purple text-xl font-bold">▶</span>
              </div>
            </button>
          </div>
        )}

        {/* Week stats */}
        <div>
          <p className="label-micro mb-2">This Week</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-bg-card border border-border p-3 rounded-sm">
              <StatBlock label="Sessions" value={weekSessions?.length ?? 0} accent />
            </div>
            <div className="bg-bg-card border border-border p-3 rounded-sm">
              <StatBlock label="Sets" value={weekSessions ? '—' : 0} />
            </div>
            <div className="bg-bg-card border border-border p-3 rounded-sm">
              <StatBlock label="Goal" value="3" unit="/wk" />
            </div>
          </div>
        </div>

        {/* Check-in */}
        <CheckInCard todayLog={todayLog} navigate={navigate} />

        {/* Weight trend */}
        <WeightTrendCard weighIns={weighIns} />

        {/* Progression alerts */}
        {pendingRules && pendingRules.length > 0 && (
          <ProgressionAlerts rules={pendingRules} />
        )}

        {/* Measurement prompt */}
        <div className="mt-2">
          <button
            onClick={() => navigate('/body')}
            className="w-full text-left card-accent-teal hover:opacity-80 transition-opacity"
            style={{ cursor: 'pointer', display: 'block' }}
          >
            <p className="label-micro mb-1">Body Measurements</p>
            <p className="text-text-muted text-sm">Monthly measurements keep you honest. Tap to review →</p>
          </button>
        </div>

      </div>
    </div>
  );
}
