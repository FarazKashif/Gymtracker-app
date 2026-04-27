import Dexie from 'dexie';

export const db = new Dexie('ironlog');

db.version(1).stores({
  users:              '++id',
  exercises:          '++id, movement_pattern, parent_exercise_id',
  workout_templates:  '++id, user_id',
  template_exercises: '++id, template_id, exercise_id',
  workout_sessions:   '++id, user_id, template_id, started_at',
  set_logs:           '++id, session_id, exercise_id, logged_at',
  weigh_ins:          '++id, user_id, weighed_at',
  body_measurements:  '++id, user_id, measured_at',
  daily_logs:         '++id, user_id, logged_date',
  food_items:         '++id, user_id',
  food_logs:          '++id, user_id, food_item_id, logged_date',
  progression_rules:  '++id, [user_id+exercise_id]',
});

export default db;
