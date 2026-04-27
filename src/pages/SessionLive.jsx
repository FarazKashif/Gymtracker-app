import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { USER_ID } from '../db/seed';
import { useAppStore } from '../store/appStore';
import { evaluateProgression } from '../hooks/useProgressionEngine';
import { RirSelector, RatingSelector } from '../components/ui/TapSelector';
import { Modal } from '../components/ui/Modal';

// ─── Rest Timer ────────────────────────────────────────────────────
function RestTimer({ seconds, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const [overtime, setOvertime] = useState(false);
  const startRef = useRef(Date.now());
  const overtimeRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const rem = seconds - elapsed;
      if (rem <= 0) {
        setRemaining(0);
        setOvertime(true);
        overtimeRef.current = Math.abs(rem);
      } else {
        setRemaining(rem);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [seconds]);

  useEffect(() => {
    if (overtime) {
      const interval = setInterval(() => {
        overtimeRef.current += 1;
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [overtime]);

  const pct = Math.max(0, remaining / seconds);
  const totalElapsed = Math.floor((Date.now() - startRef.current) / 1000);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-base"
      style={{ background: 'rgba(10,10,10,0.97)' }}>
      <p className="label-micro mb-4">{overtime ? 'OVERTIME' : 'REST'}</p>

      {/* Circular progress */}
      <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
        <svg width="180" height="180" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
          <circle cx="90" cy="90" r="82" fill="none" stroke="#1A1A1A" strokeWidth="6" />
          <circle
            cx="90" cy="90" r="82" fill="none"
            stroke={overtime ? '#F87171' : '#F97316'}
            strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 82}`}
            strokeDashoffset={`${2 * Math.PI * 82 * (1 - pct)}`}
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <div className="text-center">
          <div className="data-value" style={{ fontSize: '3.5rem', fontWeight: 500, color: overtime ? '#F87171' : '#DEDED6', lineHeight: 1 }}>
            {overtime ? `+${Math.floor(totalElapsed - seconds)}` : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}
          </div>
          <div className="label-micro mt-1">{overtime ? 'sec over' : 'remaining'}</div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          className="btn-primary px-8 py-3 text-lg"
          onClick={() => onDone(totalElapsed)}
        >
          START NEXT SET
        </button>
        <button className="btn-ghost" onClick={() => onSkip(totalElapsed)}>SKIP</button>
      </div>
    </div>
  );
}

// ─── Set Logger Row ────────────────────────────────────────────────
function SetRow({ setNum, plannedReps, plannedWeight, isBodyweight, onLog, lastLoggedReps }) {
  const [reps, setReps] = useState(lastLoggedReps || plannedReps || 0);
  const [weight, setWeight] = useState(plannedWeight || 0);
  const [rir, setRir] = useState(2);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="bg-bg-elevated border border-border rounded-sm p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="label-micro">SET {setNum}</span>
        <span className="label-micro">
          PLAN: {plannedReps} reps{!isBodyweight && ` @ ${plannedWeight}kg`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Reps */}
        <div>
          <p className="label-micro mb-1">REPS</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="tap-option w-10 h-10"
              onClick={() => setReps(r => Math.max(0, r - 1))}
            >−</button>
            <input
              type="number"
              className="field-input text-center"
              value={reps}
              min={0} max={99}
              onChange={e => setReps(parseInt(e.target.value) || 0)}
            />
            <button
              type="button"
              className="tap-option w-10 h-10"
              onClick={() => setReps(r => r + 1)}
            >+</button>
          </div>
        </div>

        {/* Weight */}
        {!isBodyweight && (
          <div>
            <p className="label-micro mb-1">WEIGHT (kg)</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="tap-option w-10 h-10"
                onClick={() => setWeight(w => Math.max(0, parseFloat((w - 2.5).toFixed(2))))}
              >−</button>
              <input
                type="number"
                className="field-input text-center"
                value={weight}
                step={2.5}
                min={0}
                onChange={e => setWeight(parseFloat(e.target.value) || 0)}
              />
              <button
                type="button"
                className="tap-option w-10 h-10"
                onClick={() => setWeight(w => parseFloat((w + 2.5).toFixed(2)))}
              >+</button>
            </div>
          </div>
        )}
      </div>

      {/* RIR */}
      <div>
        <p className="label-micro mb-1">REPS IN RESERVE</p>
        <RirSelector value={rir} onChange={setRir} />
      </div>

      {/* Optional note */}
      {showNote ? (
        <input
          className="field-input"
          placeholder="Set note..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      ) : (
        <button
          type="button"
          className="text-text-muted text-xs"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}
          onClick={() => setShowNote(true)}
        >
          + ADD NOTE
        </button>
      )}

      <button
        className="btn-primary w-full"
        onClick={() => onLog({ reps, weight, rir, note })}
      >
        LOG SET {setNum} →
      </button>
    </div>
  );
}

// ─── Exercise Block ────────────────────────────────────────────────
function ExerciseBlock({ templateExercise, exercise, sessionId, setLogs, onSetLogged }) {
  const loggedSets = setLogs.filter(
    s => s.session_id === sessionId && s.exercise_id === exercise.id
  );
  const completedCount = loggedSets.length;
  const totalSets = templateExercise.planned_sets;
  const allDone = completedCount >= totalSets;

  const patternColour = {
    squat: 'border-l-purple',
    press: 'border-l-yellow',
    hinge: 'border-l-red',
    pull: 'border-l-teal',
    isolation: 'border-l-green',
    core: 'border-l-accent',
  }[exercise.movement_pattern] || 'border-l-border';

  return (
    <div className="bg-bg-card border border-border rounded-sm overflow-hidden"
      style={{ borderLeft: `3px solid var(--tw-border-opacity)` }}>
      <div className={`border-l-4 ${patternColour} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-base text-text-primary"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}>
              {exercise.name}
            </p>
            <p className="label-micro mt-0.5">
              {exercise.movement_pattern.toUpperCase()} · {exercise.muscle_groups?.slice(0, 2).join(', ').toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <span className="data-value text-lg text-accent">{completedCount}</span>
            <span className="text-text-muted data-value text-lg">/{totalSets}</span>
          </div>
        </div>

        {/* Logged sets summary */}
        {loggedSets.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {loggedSets.map(ls => (
              <div key={ls.id} className="flex items-center justify-between">
                <span className="label-micro">SET {ls.set_number}</span>
                <span className="data-value text-xs text-green">
                  {ls.actual_reps} reps{!exercise.is_bodyweight ? ` @ ${ls.actual_weight_kg}kg` : ''}
                  {ls.reps_in_reserve !== undefined ? ` RIR${ls.reps_in_reserve}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Technique note */}
        {exercise.notes && (
          <p className="mt-2 text-text-muted text-xs" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            ◎ {exercise.notes}
          </p>
        )}
      </div>

      {/* Next set input */}
      {!allDone && (
        <div className="px-4 pb-4 pt-2">
          <SetRow
            setNum={completedCount + 1}
            plannedReps={templateExercise.planned_reps_max}
            plannedWeight={templateExercise.planned_weight_kg}
            isBodyweight={exercise.is_bodyweight}
            lastLoggedReps={loggedSets[loggedSets.length - 1]?.actual_reps}
            onLog={({ reps, weight, rir, note }) => onSetLogged({
              exercise,
              templateExercise,
              setNum: completedCount + 1,
              reps,
              weight,
              rir,
              note,
            })}
          />
        </div>
      )}

      {allDone && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-green data-value text-sm">✓ COMPLETE</p>
        </div>
      )}
    </div>
  );
}

// ─── Session Live Main ──────────────────────────────────────────────
export function SessionLive() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const clearActiveSession = useAppStore(s => s.clearActiveSession);
  const setPendingProgressions = useAppStore(s => s.setPendingProgressions);
  const setNotification = useAppStore(s => s.setNotification);

  const [restTimer, setRestTimer] = useState(null); // { seconds, onDone, onSkip }
  const [lastRestSec, setLastRestSec] = useState(null);
  const [showFinish, setShowFinish] = useState(false);
  const [sessionRating, setSessionRating] = useState(null);
  const [sessionNote, setSessionNote] = useState('');
  const [bodyweight, setBodyweight] = useState('');
  const [progressions, setProgressions] = useState([]);

  const session = useLiveQuery(() => db.workout_sessions.get(sessionId), [sessionId]);

  const templateExercises = useLiveQuery(async () => {
    if (!session?.template_id) return [];
    return db.template_exercises.where('template_id').equals(session.template_id).sortBy('order_index');
  }, [session?.template_id]);

  const exerciseDetails = useLiveQuery(async () => {
    if (!templateExercises?.length) return [];
    const ids = templateExercises.map(te => te.exercise_id);
    const exes = await db.exercises.bulkGet(ids);
    return exes.filter(Boolean);
  }, [templateExercises]);

  const setLogs = useLiveQuery(
    () => db.set_logs.where('session_id').equals(sessionId).toArray(),
    [sessionId]
  ) || [];

  const handleSetLogged = useCallback(async ({ exercise, templateExercise, setNum, reps, weight, rir, note }) => {
    const logId = crypto.randomUUID();
    await db.set_logs.add({
      id: logId,
      session_id: sessionId,
      exercise_id: exercise.id,
      set_number: setNum,
      planned_reps: templateExercise.planned_reps_max,
      planned_weight_kg: templateExercise.planned_weight_kg,
      actual_reps: reps,
      actual_weight_kg: weight,
      reps_in_reserve: rir,
      rest_after_sec: null,
      logged_at: Date.now(),
      note: note || '',
    });

    // Start rest timer
    const restSec = templateExercise.rest_sec || 90;
    setRestTimer({
      seconds: restSec,
      logId,
    });
  }, [sessionId]);

  const handleRestDone = useCallback(async (actualSec) => {
    if (restTimer?.logId) {
      await db.set_logs.update(restTimer.logId, { rest_after_sec: actualSec });
    }
    setLastRestSec(actualSec);
    setRestTimer(null);
  }, [restTimer]);

  const handleFinish = async () => {
    const endTime = Date.now();
    const startTime = session.started_at;
    const durationMin = Math.round((endTime - startTime) / 60000);

    await db.workout_sessions.update(sessionId, {
      ended_at: endTime,
      duration_min: durationMin,
      session_rating: sessionRating,
      bodyweight_kg: bodyweight ? parseFloat(bodyweight) : null,
      notes: sessionNote,
    });

    // Run progression engine
    const pending = await evaluateProgression(sessionId);
    setProgressions(pending);

    clearActiveSession();

    if (pending.length > 0) {
      setPendingProgressions(pending);
    }

    setNotification({ message: `Session complete — ${durationMin} min`, type: 'success' });
    navigate('/session');
  };

  if (!session || !templateExercises || !exerciseDetails) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-text-muted">Loading session...</p>
      </div>
    );
  }

  // Check if already finished
  if (session.ended_at) {
    return (
      <div className="px-4 pt-5">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate('/session')} className="text-text-muted hover:text-text-primary">← BACK</button>
        </div>
        <div className="card-accent-green p-4">
          <p className="section-header mb-2">Session Complete</p>
          <p className="label-micro">
            {new Date(session.started_at).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long'
            }).toUpperCase()}
          </p>
          {session.duration_min && (
            <p className="data-value text-2xl text-accent mt-2">{session.duration_min} min</p>
          )}
        </div>

        {/* Show all set logs */}
        <div className="mt-4 space-y-2">
          {(exerciseDetails || []).map((ex) => {
            const logs = setLogs.filter(s => s.exercise_id === ex.id);
            if (!logs.length) return null;
            return (
              <div key={ex.id} className="bg-bg-card border border-border p-3 rounded-sm">
                <p className="font-bold text-sm mb-1"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}>
                  {ex.name}
                </p>
                {logs.map(l => (
                  <div key={l.id} className="flex justify-between py-0.5">
                    <span className="label-micro">SET {l.set_number}</span>
                    <span className="data-value text-xs text-green">
                      {l.actual_reps} reps{!ex.is_bodyweight ? ` @ ${l.actual_weight_kg}kg` : ''}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const allSetsComplete = templateExercises.every(te => {
    const logged = setLogs.filter(s => s.exercise_id === te.exercise_id).length;
    return logged >= te.planned_sets;
  });

  return (
    <div className="pb-4">
      {/* Rest timer overlay */}
      {restTimer && (
        <RestTimer
          seconds={restTimer.seconds}
          onDone={handleRestDone}
          onSkip={handleRestDone}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-bg-base border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}>
              {session.template_id?.split('-')[0]?.toUpperCase() || 'SESSION'}
            </p>
            <p className="label-micro">
              {new Date(session.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — IN PROGRESS
            </p>
          </div>
          <div className="flex gap-2">
            {allSetsComplete && (
              <button className="btn-primary" onClick={() => setShowFinish(true)}>
                FINISH →
              </button>
            )}
            <button className="btn-ghost" onClick={() => setShowFinish(true)}>
              END
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${templateExercises.length
                ? (templateExercises.filter(te =>
                  setLogs.filter(s => s.exercise_id === te.exercise_id).length >= te.planned_sets
                ).length / templateExercises.length) * 100
                : 0}%`
            }}
          />
        </div>
      </div>

      {/* Exercise blocks */}
      <div className="px-4 pt-4 space-y-4">
        {(templateExercises || []).map((te, i) => {
          const ex = exerciseDetails.find(e => e.id === te.exercise_id);
          if (!ex) return null;
          return (
            <ExerciseBlock
              key={te.id}
              templateExercise={te}
              exercise={ex}
              sessionId={sessionId}
              setLogs={setLogs}
              onSetLogged={handleSetLogged}
            />
          );
        })}

        {allSetsComplete && (
          <button
            className="btn-primary w-full py-4 text-lg"
            onClick={() => setShowFinish(true)}
          >
            ALL SETS COMPLETE — FINISH SESSION →
          </button>
        )}
      </div>

      {/* Finish modal */}
      {showFinish && (
        <Modal
          title="Finish Session"
          onClose={() => setShowFinish(false)}
          footer={
            <>
              <button className="btn-ghost flex-1" onClick={() => setShowFinish(false)}>CANCEL</button>
              <button
                className="btn-primary flex-1"
                onClick={handleFinish}
                disabled={!sessionRating}
              >
                COMPLETE →
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="label-micro mb-2">SESSION RATING</p>
              <RatingSelector value={sessionRating} onChange={setSessionRating} />
            </div>
            <div>
              <p className="label-micro mb-1">BODYWEIGHT TODAY (optional)</p>
              <input
                type="number"
                className="field-input"
                placeholder="e.g. 77.5"
                value={bodyweight}
                onChange={e => setBodyweight(e.target.value)}
                step={0.1}
              />
            </div>
            <div>
              <p className="label-micro mb-1">SESSION NOTE (optional)</p>
              <textarea
                className="field-input"
                placeholder="Any notes about today's session..."
                rows={2}
                value={sessionNote}
                onChange={e => setSessionNote(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Progression confirmations modal */}
      {progressions.length > 0 && (
        <Modal
          title="Ready to Progress"
          onClose={() => setProgressions([])}
        >
          <div className="space-y-3">
            <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              You hit your rep targets on these exercises. Confirm the weight increase for next session.
            </p>
            {progressions.map(p => (
              <div key={p.exerciseId} className="card-accent p-3">
                <p className="font-bold text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}>
                  {p.exerciseName}
                </p>
                <p className="data-value text-sm mt-1">
                  <span className="text-text-muted">{p.currentWeight}kg</span>
                  <span className="text-accent mx-2">→</span>
                  <span className="text-green">{p.newWeight}kg</span>
                </p>
                <p className="label-micro mt-1">{p.reps} reps on final set</p>
              </div>
            ))}
            <button className="btn-primary w-full" onClick={() => setProgressions([])}>
              CONFIRM ALL →
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
