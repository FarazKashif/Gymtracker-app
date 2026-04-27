import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { USER_ID } from '../db/seed';
import { useAppStore } from '../store/appStore';
import { PageHeader } from '../components/layout/PageHeader';

function useTemplates() {
  return useLiveQuery(async () => {
    const templates = await db.workout_templates.where('user_id').equals(USER_ID).toArray();
    const enriched = await Promise.all(templates.map(async (t) => {
      const exercises = await db.template_exercises.where('template_id').equals(t.id).sortBy('order_index');
      const exIds = exercises.map(e => e.exercise_id);
      const exDetails = await db.exercises.bulkGet(exIds);
      return { ...t, exercises, exDetails };
    }));
    return enriched;
  }, []);
}

function useRecentSessions() {
  return useLiveQuery(async () => {
    const sessions = await db.workout_sessions.where('user_id').equals(USER_ID)
      .reverse().sortBy('started_at');
    return sessions.slice(0, 5);
  }, []);
}

export function SessionPage() {
  const navigate = useNavigate();
  const setActiveSession = useAppStore(s => s.setActiveSession);
  const activeSessionId = useAppStore(s => s.activeSessionId);
  const templates = useTemplates();
  const recentSessions = useRecentSessions();

  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  async function startSession(template) {
    const sessionId = crypto.randomUUID();
    await db.workout_sessions.add({
      id: sessionId,
      user_id: USER_ID,
      template_id: template.id,
      started_at: Date.now(),
      ended_at: null,
      duration_min: null,
      session_rating: null,
      bodyweight_kg: null,
      notes: '',
    });
    setActiveSession(sessionId, template.id);
    navigate(`/session/${sessionId}`);
  }

  return (
    <div>
      <PageHeader title="Session" subtitle="Select a template to begin" />

      {/* Resume active if any */}
      {activeSessionId && (
        <div className="px-4 pt-4">
          <div className="card-accent p-3 mb-3">
            <p className="label-micro mb-1">Active Session</p>
            <p className="text-text-muted text-sm mb-2">You have an unfinished session in progress.</p>
            <button
              className="btn-primary w-full"
              onClick={() => navigate(`/session/${activeSessionId}`)}
            >
              Resume Session →
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pt-4 space-y-3">
        <p className="label-micro">Templates</p>

        {!templates ? (
          <p className="text-text-muted text-sm">Loading...</p>
        ) : templates.map(t => (
          <div key={t.id} className="card-accent-purple">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-lg text-text-primary"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}>
                  {t.name}
                </p>
                <p className="label-micro mt-0.5">
                  {(t.day_index || []).map(d => dayNames[d]).join(' · ')}
                </p>
              </div>
              <span className="label-micro">{t.exercises?.length} exercises</span>
            </div>

            {/* Exercise list */}
            <div className="space-y-0.5 mb-3">
              {(t.exDetails || []).filter(Boolean).map((ex, i) => {
                const te = t.exercises?.[i];
                return (
                  <div key={ex.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-sm text-text-primary" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {ex.name}
                    </span>
                    <span className="label-micro">
                      {te?.planned_sets}×{te?.planned_reps_min}–{te?.planned_reps_max}
                      {te?.planned_weight_kg ? ` @ ${te.planned_weight_kg}kg` : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => startSession(t)}
            >
              Start {t.name} →
            </button>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <div className="px-4 pt-5 pb-4">
          <p className="label-micro mb-2">Recent Sessions</p>
          <div className="space-y-1.5">
            {recentSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-bg-card border border-border px-3 py-2 rounded-sm">
                <div>
                  <p className="text-sm text-text-primary" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {new Date(s.started_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                  </p>
                  {s.duration_min && (
                    <p className="label-micro">{s.duration_min} min</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {s.session_rating && (
                    <span className="text-accent data-value text-sm">{s.session_rating}/5</span>
                  )}
                  <button
                    onClick={() => navigate(`/session/${s.id}`)}
                    className="text-text-muted hover:text-text-primary text-sm"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}
                  >
                    VIEW →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
