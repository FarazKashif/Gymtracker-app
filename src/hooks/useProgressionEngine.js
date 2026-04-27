import { db } from '../db/database';
import { USER_ID } from '../db/seed';

// Default increment config by movement pattern
function getDefaultIncrement(exercise) {
  if (!exercise) return 2.5;
  if (exercise.movement_pattern === 'squat' || exercise.movement_pattern === 'hinge') return 5;
  if (exercise.movement_pattern === 'isolation') return 2.5;
  return 2.5;
}

export async function evaluateProgression(sessionId) {
  const setLogs = await db.set_logs.where('session_id').equals(sessionId).toArray();
  if (!setLogs.length) return [];

  const exerciseIds = [...new Set(setLogs.map(s => s.exercise_id))];
  const exercises = await db.exercises.bulkGet(exerciseIds);
  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]));

  const progressions = [];

  for (const exId of exerciseIds) {
    const ex = exMap[exId];
    if (!ex) continue;

    const exSets = setLogs
      .filter(s => s.exercise_id === exId)
      .sort((a, b) => a.set_number - b.set_number);

    if (!exSets.length) continue;

    const lastSet = exSets[exSets.length - 1];
    const maxWeight = Math.max(...exSets.map(s => s.actual_weight_kg || 0));

    // Get or create progression rule
    let rule = await db.progression_rules
      .where('[user_id+exercise_id]').equals([USER_ID, exId])
      .first();

    if (!rule) {
      rule = {
        user_id: USER_ID,
        exercise_id: exId,
        current_weight_kg: maxWeight,
        current_rep_target: ex.default_rep_max,
        increment_kg: getDefaultIncrement(ex),
        sessions_at_current_weight: 0,
        last_session_reps: [],
        status: 'on_track',
        last_updated: Date.now(),
      };
      rule.id = await db.progression_rules.add(rule);
    }

    const repTarget = rule.current_rep_target || ex.default_rep_max;
    const lastSetReps = lastSet.actual_reps || 0;
    const allReps = exSets.map(s => s.actual_reps || 0);

    let newStatus = rule.status;
    let readyToProgress = false;

    if (ex.is_bodyweight) {
      const totalReps = allReps.reduce((a, b) => a + b, 0);
      const prevTotal = (rule.last_session_reps || []).reduce((a, b) => a + b, 0);
      readyToProgress = totalReps > prevTotal && prevTotal > 0;
      newStatus = readyToProgress ? 'ready_to_progress' : 'on_track';
    } else {
      if (lastSetReps >= repTarget) {
        readyToProgress = true;
        newStatus = 'ready_to_progress';
      } else {
        const sessionsStuck = rule.sessions_at_current_weight + 1;
        if (sessionsStuck >= 5) newStatus = 'deload_suggested';
        else if (sessionsStuck >= 3) newStatus = 'stalled';
        else newStatus = 'on_track';
      }
    }

    const newSessions = readyToProgress ? 0 : (rule.sessions_at_current_weight || 0) + 1;
    const newWeight = readyToProgress
      ? maxWeight + (rule.increment_kg || getDefaultIncrement(ex))
      : rule.current_weight_kg;

    await db.progression_rules.update(rule.id, {
      current_weight_kg: readyToProgress ? newWeight : rule.current_weight_kg,
      sessions_at_current_weight: newSessions,
      last_session_reps: allReps,
      status: newStatus,
      last_updated: Date.now(),
    });

    if (readyToProgress && !ex.is_bodyweight) {
      progressions.push({
        exerciseId: exId,
        exerciseName: ex.name,
        currentWeight: maxWeight,
        newWeight,
        reps: lastSetReps,
        setsPerformed: allReps,
      });
    }
  }

  return progressions;
}
