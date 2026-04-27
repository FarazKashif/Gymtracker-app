import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { USER_ID } from '../db/seed';
import { PageHeader } from '../components/layout/PageHeader';
import { Modal } from '../components/ui/Modal';

const MOVEMENT_COLOURS = {
  squat: { text: 'text-purple', border: '#C084FC' },
  press: { text: 'text-yellow', border: '#FBBF24' },
  hinge: { text: 'text-red', border: '#F87171' },
  pull: { text: 'text-teal', border: '#2DD4BF' },
  isolation: { text: 'text-green', border: '#34D399' },
  core: { text: 'text-accent', border: '#F97316' },
};

const TAB_LABELS = ['TEMPLATES', 'EXERCISES', 'PROGRESSION'];

function ExerciseLibrary() {
  const [filter, setFilter] = useState('all');
  const patterns = ['all', 'squat', 'press', 'hinge', 'pull', 'isolation', 'core'];

  const exercises = useLiveQuery(async () => {
    if (filter === 'all') return db.exercises.toArray();
    return db.exercises.where('movement_pattern').equals(filter).toArray();
  }, [filter]);

  return (
    <div>
      {/* Filter row */}
      <div className="overflow-x-auto flex gap-1 pb-1 mb-4" style={{ scrollbarWidth: 'none' }}>
        {patterns.map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs rounded-sm border transition-all ${
              filter === p
                ? 'bg-accent border-accent text-bg-base font-bold'
                : 'border-border text-text-muted hover:text-text-primary'
            }`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em', minWidth: 'fit-content' }}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {(exercises || []).map(ex => {
          const col = MOVEMENT_COLOURS[ex.movement_pattern] || { text: 'text-text-muted', border: '#222' };
          return (
            <div key={ex.id} className="bg-bg-card border border-border rounded-sm overflow-hidden"
              style={{ borderLeft: `3px solid ${col.border}` }}>
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-text-primary"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}>
                    {ex.name}
                  </p>
                  <div className="flex gap-2">
                    <span className={`label-micro ${col.text}`}>{ex.movement_pattern.toUpperCase()}</span>
                    <span className="label-micro">L{ex.variation_level}</span>
                  </div>
                </div>
                <p className="label-micro mt-0.5">
                  {(ex.muscle_groups || []).join(' · ').toUpperCase()}
                </p>
                <p className="label-micro mt-0.5">
                  {ex.default_rep_min}–{ex.default_rep_max} reps · {ex.default_rest_sec}s rest
                  {ex.is_bodyweight ? ' · BODYWEIGHT' : ''}
                  {ex.is_compound ? ' · COMPOUND' : ' · ISOLATION'}
                </p>
                {ex.notes && (
                  <p className="text-text-muted text-xs mt-1"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {ex.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TemplateEditor({ template, onSave }) {
  const [name, setName] = useState(template?.name || '');
  const [selectedDays, setSelectedDays] = useState(template?.day_index || []);
  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const exercises = useLiveQuery(async () => {
    if (!template?.id) return [];
    const tes = await db.template_exercises.where('template_id').equals(template.id).sortBy('order_index');
    const exIds = tes.map(t => t.exercise_id);
    const exDetails = await db.exercises.bulkGet(exIds);
    return tes.map((te, i) => ({ te, ex: exDetails[i] })).filter(x => x.ex);
  }, [template?.id]);

  const toggleDay = (d) => setSelectedDays(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="label-micro mb-1">TEMPLATE NAME</p>
        <input
          className="field-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Full Body A"
        />
      </div>

      <div>
        <p className="label-micro mb-2">TRAINING DAYS</p>
        <div className="grid grid-cols-7 gap-1">
          {dayLabels.map((d, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`tap-option text-xs py-2 ${selectedDays.includes(i) ? 'selected' : ''}`}
            >
              {d.slice(0, 1)}
            </button>
          ))}
        </div>
      </div>

      {exercises && exercises.length > 0 && (
        <div>
          <p className="label-micro mb-2">EXERCISES ({exercises.length})</p>
          <div className="space-y-1.5">
            {exercises.map(({ te, ex }) => (
              <div key={te.id} className="flex items-center justify-between bg-bg-elevated border border-border px-3 py-2 rounded-sm">
                <div>
                  <p className="text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{ex.name}</p>
                  <p className="label-micro">{te.planned_sets} × {te.planned_reps_min}–{te.planned_reps_max}
                    {te.planned_weight_kg ? ` @ ${te.planned_weight_kg}kg` : ''}
                    {` · ${te.rest_sec}s rest`}</p>
                </div>
                <span className="label-micro">{te.order_index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressionSettings() {
  const rules = useLiveQuery(async () => {
    const all = await db.progression_rules.where('user_id').equals(USER_ID).toArray();
    const exIds = all.map(r => r.exercise_id);
    const exes = await db.exercises.bulkGet(exIds);
    return all.map((r, i) => ({ rule: r, ex: exes[i] })).filter(x => x.ex);
  }, []);

  if (!rules || !rules.length) {
    return (
      <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        No progression data yet. Complete sessions to build your progression history.
      </p>
    );
  }

  const statusColour = {
    on_track: 'text-text-muted',
    ready_to_progress: 'text-green',
    stalled: 'text-yellow',
    deload_suggested: 'text-red',
  };

  return (
    <div className="space-y-2">
      {rules.map(({ rule, ex }) => (
        <div key={rule.id} className="bg-bg-card border border-border px-3 py-2.5 rounded-sm">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}>
              {ex.name}
            </p>
            <span className={`label-micro ${statusColour[rule.status] || 'text-text-muted'}`}>
              {rule.status?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          <div className="flex gap-4 mt-1">
            <div className="stat-block">
              <span className="stat-label">Current</span>
              <span className="stat-value text-sm">{rule.current_weight_kg}<span className="stat-unit">kg</span></span>
            </div>
            <div className="stat-block">
              <span className="stat-label">Increment</span>
              <span className="stat-value text-sm">+{rule.increment_kg}<span className="stat-unit">kg</span></span>
            </div>
            <div className="stat-block">
              <span className="stat-label">Sessions</span>
              <span className="stat-value text-sm">{rule.sessions_at_current_weight}</span>
            </div>
          </div>
          {rule.last_session_reps?.length > 0 && (
            <p className="label-micro mt-1">
              LAST SESSION: {rule.last_session_reps.join(', ')} reps
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function TemplatesList() {
  const [editTemplate, setEditTemplate] = useState(null);
  const templates = useLiveQuery(async () => {
    return db.workout_templates.where('user_id').equals(USER_ID).toArray();
  }, []);

  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div>
      <div className="space-y-3">
        {(templates || []).map(t => (
          <div key={t.id} className="card-accent-purple">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-base" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}>
                {t.name}
              </p>
              <button
                onClick={() => setEditTemplate(t)}
                className="label-micro hover:text-text-primary transition-colors"
              >
                EDIT →
              </button>
            </div>
            <p className="label-micro">
              {(t.day_index || []).map(d => dayLabels[d]).join(' · ')}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-green' : 'bg-border-emphasis'}`} />
              <span className="label-micro">{t.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
          </div>
        ))}
      </div>

      {editTemplate && (
        <Modal title={`Edit: ${editTemplate.name}`} onClose={() => setEditTemplate(null)}>
          <TemplateEditor template={editTemplate} />
        </Modal>
      )}
    </div>
  );
}

export function Planner() {
  const [tab, setTab] = useState(0);

  return (
    <div>
      <PageHeader title="Planner" subtitle="Templates · Exercises · Progression" />

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TAB_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex-1 py-3 text-xs transition-colors ${
              tab === i
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-primary'
            }`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.15em' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 0 && <TemplatesList />}
        {tab === 1 && <ExerciseLibrary />}
        {tab === 2 && <ProgressionSettings />}
      </div>
    </div>
  );
}
