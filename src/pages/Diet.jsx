import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { USER_ID } from '../db/seed';
import { useUser } from '../hooks/useUser';
import { PageHeader } from '../components/layout/PageHeader';
import { StatBlock } from '../components/ui/StatBlock';
import { Modal } from '../components/ui/Modal';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

const TAB_LABELS = ['FOOD LOG', 'WEIGH-IN', 'FOOD ITEMS', 'TREND'];

// ─── Weigh-In Section ──────────────────────────────────────────────
function WeighInSection({ user }) {
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const recentWeighIns = useLiveQuery(async () => {
    const all = await db.weigh_ins.where('user_id').equals(USER_ID).toArray();
    return all.sort((a, b) => b.weighed_at < a.weighed_at ? -1 : 1).slice(0, 10);
  }, []);

  const handleSave = async () => {
    if (!weight) return;
    await db.weigh_ins.add({
      id: crypto.randomUUID(),
      user_id: USER_ID,
      weighed_at: getTodayStr(),
      weight_kg: parseFloat(weight),
      note,
    });
    setWeight('');
    setNote('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="card-accent-yellow">
        <p className="label-micro mb-2">LOG WEIGH-IN</p>
        <p className="text-text-muted text-xs mb-3"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Weigh yourself first thing in the morning, after using the bathroom. Same conditions every time.
        </p>
        <div className="space-y-2">
          <div>
            <p className="label-micro mb-1">WEIGHT (kg)</p>
            <input
              type="number"
              className="field-input text-xl"
              placeholder="77.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              step={0.1}
            />
          </div>
          <div>
            <p className="label-micro mb-1">NOTE (optional)</p>
            <input
              className="field-input"
              placeholder="e.g. after big meal yesterday"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          <button
            className="btn-primary w-full"
            onClick={handleSave}
            disabled={!weight}
          >
            {saved ? '✓ SAVED' : 'LOG WEIGHT →'}
          </button>
        </div>
      </div>

      {/* History */}
      {recentWeighIns && recentWeighIns.length > 0 && (
        <div>
          <p className="label-micro mb-2">RECENT WEIGH-INS</p>
          <div className="space-y-1">
            {recentWeighIns.map((w, i) => {
              const prev = recentWeighIns[i + 1];
              const delta = prev ? w.weight_kg - prev.weight_kg : null;
              return (
                <div key={w.id} className="flex items-center justify-between bg-bg-card border border-border px-3 py-2 rounded-sm">
                  <div>
                    <p className="text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {w.weighed_at}
                    </p>
                    {w.note && <p className="label-micro">{w.note}</p>}
                  </div>
                  <div className="text-right flex items-baseline gap-2">
                    <span className="data-value text-lg text-accent">{w.weight_kg.toFixed(1)}</span>
                    <span className="label-micro">kg</span>
                    {delta !== null && (
                      <span className={`data-value text-xs ${delta > 0 ? 'text-green' : delta < 0 ? 'text-red' : 'text-text-muted'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Food Items Library ────────────────────────────────────────────
function FoodItemsSection() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', serving_unit: '', calories_per_serving: '', protein_g: '', carbs_g: '', fat_g: '' });

  const items = useLiveQuery(
    () => db.food_items.where('user_id').equals(USER_ID).toArray(),
    []
  );

  const handleAdd = async () => {
    if (!form.name || !form.calories_per_serving) return;
    await db.food_items.add({
      id: crypto.randomUUID(),
      user_id: USER_ID,
      name: form.name,
      serving_unit: form.serving_unit,
      calories_per_serving: parseInt(form.calories_per_serving) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      is_active: true,
    });
    setForm({ name: '', serving_unit: '', calories_per_serving: '', protein_g: '', carbs_g: '', fat_g: '' });
    setShowAdd(false);
  };

  const toggleActive = async (item) => {
    await db.food_items.update(item.id, { is_active: !item.is_active });
  };

  return (
    <div className="space-y-3">
      <button className="btn-primary w-full" onClick={() => setShowAdd(true)}>
        + ADD FOOD ITEM
      </button>

      <div className="space-y-2">
        {(items || []).map(item => (
          <div key={item.id} className={`bg-bg-card border rounded-sm px-3 py-2 ${item.is_active ? 'border-border' : 'border-border opacity-40'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}>
                  {item.name}
                </p>
                <p className="label-micro">{item.serving_unit}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="data-value text-sm text-accent">{item.calories_per_serving} kcal</p>
                  <p className="label-micro">{item.protein_g}g protein</p>
                </div>
                <button
                  onClick={() => toggleActive(item)}
                  className={`w-8 h-5 rounded-full border transition-all ${item.is_active ? 'bg-accent border-accent' : 'bg-bg-elevated border-border'}`}
                  style={{ position: 'relative' }}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-bg-base transition-all ${item.is_active ? 'left-3' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Add Food Item" onClose={() => setShowAdd(false)}
          footer={
            <>
              <button className="btn-ghost flex-1" onClick={() => setShowAdd(false)}>CANCEL</button>
              <button className="btn-primary flex-1" onClick={handleAdd}>SAVE →</button>
            </>
          }
        >
          <div className="space-y-3">
            {[
              { key: 'name', label: 'Name', placeholder: 'e.g. Full-fat milk' },
              { key: 'serving_unit', label: 'Serving unit', placeholder: 'e.g. 250 ml' },
              { key: 'calories_per_serving', label: 'Calories per serving', placeholder: '150', type: 'number' },
              { key: 'protein_g', label: 'Protein (g)', placeholder: '8', type: 'number' },
              { key: 'carbs_g', label: 'Carbs (g)', placeholder: '12', type: 'number' },
              { key: 'fat_g', label: 'Fat (g)', placeholder: '8', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <p className="label-micro mb-1">{f.label.toUpperCase()}</p>
                <input
                  type={f.type || 'text'}
                  className="field-input"
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Daily Food Log ────────────────────────────────────────────────
function FoodLogSection({ user }) {
  const today = getTodayStr();

  const activeItems = useLiveQuery(
    () => db.food_items.where('user_id').equals(USER_ID).filter(i => i.is_active).toArray(),
    []
  );

  const todayLogs = useLiveQuery(
    () => db.food_logs.where('user_id').equals(USER_ID).filter(l => l.logged_date === today).toArray(),
    [today]
  );

  const getServings = (foodItemId) => {
    const log = todayLogs?.find(l => l.food_item_id === foodItemId);
    return log?.servings || 0;
  };

  const setServings = async (item, servings) => {
    const existing = todayLogs?.find(l => l.food_item_id === item.id);
    const cal = Math.round(servings * item.calories_per_serving);
    const prot = servings * item.protein_g;

    if (servings === 0) {
      if (existing) await db.food_logs.delete(existing.id);
      return;
    }

    if (existing) {
      await db.food_logs.update(existing.id, {
        servings, calories_total: cal, protein_total_g: prot
      });
    } else {
      await db.food_logs.add({
        id: crypto.randomUUID(),
        user_id: USER_ID,
        food_item_id: item.id,
        logged_date: today,
        servings,
        calories_total: cal,
        protein_total_g: prot,
      });
    }
  };

  // Totals
  const totalCal = (todayLogs || []).reduce((s, l) => s + (l.calories_total || 0), 0);
  const totalProt = (todayLogs || []).reduce((s, l) => s + (l.protein_total_g || 0), 0);
  const baseProt = user?.base_diet_protein_g || 60;
  const targetProt = user?.protein_target_g || 150;
  const totalProtWithBase = totalProt + baseProt;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="card-accent-yellow">
        <p className="label-micro mb-2">TODAY'S ADD-ONS</p>
        <div className="grid grid-cols-3 gap-3">
          <StatBlock label="Add-on kcal" value={totalCal} accent />
          <StatBlock label="Add-on protein" value={`${totalProt.toFixed(0)}g`} />
          <StatBlock label="Total protein est." value={`${totalProtWithBase.toFixed(0)}g`} />
        </div>
        <div className="mt-2 progress-bar">
          <div className="progress-bar-fill" style={{ width: `${Math.min(100, (totalProtWithBase / targetProt) * 100)}%` }} />
        </div>
        <p className="label-micro mt-1">{totalProtWithBase.toFixed(0)}g / {targetProt}g target (includes ~{baseProt}g base diet)</p>
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {(activeItems || []).map(item => {
          const servings = getServings(item.id);
          return (
            <div key={item.id} className="bg-bg-card border border-border rounded-sm px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {item.name}
                  </p>
                  <p className="label-micro">{item.serving_unit} · {item.calories_per_serving} kcal · {item.protein_g}g protein</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    className="tap-option w-8 h-8 text-sm"
                    onClick={() => setServings(item, Math.max(0, servings - 0.5))}
                  >−</button>
                  <span className="data-value text-base w-8 text-center text-accent">{servings}</span>
                  <button
                    className="tap-option w-8 h-8 text-sm"
                    onClick={() => setServings(item, servings + 0.5)}
                  >+</button>
                </div>
              </div>
              {servings > 0 && (
                <p className="label-micro mt-1 text-green">
                  {Math.round(servings * item.calories_per_serving)} kcal · {(servings * item.protein_g).toFixed(1)}g protein
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Trend + Calibration ──────────────────────────────────────────
function TrendSection({ user }) {
  const weighIns = useLiveQuery(async () => {
    const all = await db.weigh_ins.where('user_id').equals(USER_ID).toArray();
    return all.sort((a, b) => a.weighed_at < b.weighed_at ? -1 : 1);
  }, []);

  const foodLogs = useLiveQuery(
    () => db.food_logs.where('user_id').equals(USER_ID).toArray(),
    []
  );

  if (!weighIns || weighIns.length < 2) {
    return (
      <div className="card-accent-yellow p-4">
        <p className="label-micro mb-2">Surplus Calibration</p>
        <p className="text-text-muted text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Log at least 4 weekly weigh-ins to see your personal calorie-to-gain calibration curve.
          This is the most important long-term metric — it reveals exactly how many add-on calories
          produce how much weight gain per week for your specific metabolism.
        </p>
        <p className="label-micro mt-2">{weighIns?.length || 0} / 4 weigh-ins logged</p>
      </div>
    );
  }

  // Compute weekly averages
  const goalRate = user?.goal_rate_kg_week || 0.5;
  const sorted = weighIns;
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const totalGain = latest.weight_kg - first.weight_kg;
  const weeks = Math.max(1, (new Date(latest.weighed_at) - new Date(first.weighed_at)) / (7 * 24 * 3600 * 1000));
  const avgGainPerWeek = totalGain / weeks;

  // Rolling 4-week average
  const last4 = sorted.slice(-4);
  const rollingAvg = last4.reduce((s, w) => s + w.weight_kg, 0) / last4.length;

  // Rate assessment
  let advice = null;
  if (sorted.length >= 4) {
    if (avgGainPerWeek < 0.2) {
      advice = { type: 'warning', msg: `Your trend shows ${avgGainPerWeek.toFixed(2)} kg/wk — below target (${goalRate} kg/wk). Consider adding ~200 kcal to your daily add-ons. One extra serving of full-fat milk would achieve this.` };
    } else if (avgGainPerWeek > 0.8) {
      advice = { type: 'warning', msg: `Your trend shows ${avgGainPerWeek.toFixed(2)} kg/wk — above target. Consider removing one add-on item (~100–200 kcal) if waist measurements are growing faster than shoulders.` };
    } else {
      advice = { type: 'success', msg: `On target: ${avgGainPerWeek.toFixed(2)} kg/wk average gain.` };
    }
  }

  return (
    <div className="space-y-3">
      {/* Overview */}
      <div className="card-accent-yellow">
        <p className="label-micro mb-2">Surplus Status</p>
        <div className="grid grid-cols-2 gap-3">
          <StatBlock label="Total gain" value={`${totalGain >= 0 ? '+' : ''}${totalGain.toFixed(1)}`} unit="kg" accent />
          <StatBlock label="Avg per week" value={`${avgGainPerWeek >= 0 ? '+' : ''}${avgGainPerWeek.toFixed(2)}`} unit="kg/wk" />
          <StatBlock label="4-wk rolling avg" value={rollingAvg.toFixed(1)} unit="kg" />
          <StatBlock label="Target rate" value={goalRate} unit="kg/wk" />
        </div>
      </div>

      {advice && (
        <div className={`px-3 py-3 rounded-sm border text-sm ${
          advice.type === 'success' ? 'border-green text-green' : 'border-yellow text-yellow'
        }`} style={{ fontFamily: 'Barlow Condensed, sans-serif', borderRadius: 2 }}>
          {advice.msg}
        </div>
      )}

      {/* Weigh-in history chart (simple text bars) */}
      <div>
        <p className="label-micro mb-2">Weight History</p>
        {sorted.slice(-8).map((w, i, arr) => {
          const minW = Math.min(...arr.map(x => x.weight_kg));
          const maxW = Math.max(...arr.map(x => x.weight_kg));
          const range = maxW - minW || 1;
          const pct = ((w.weight_kg - minW) / range) * 100;
          return (
            <div key={w.id} className="flex items-center gap-2 mb-1.5">
              <span className="label-micro w-20 text-right">{w.weighed_at.slice(5)}</span>
              <div className="flex-1 h-4 bg-bg-elevated rounded-sm overflow-hidden">
                <div
                  className="h-full bg-yellow opacity-70"
                  style={{ width: `${Math.max(5, pct)}%`, borderRadius: 1 }}
                />
              </div>
              <span className="data-value text-xs w-14 text-right text-accent">{w.weight_kg.toFixed(1)} kg</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Diet() {
  const [tab, setTab] = useState(0);
  const user = useUser();

  return (
    <div>
      <PageHeader title="Diet" subtitle="Calorie surplus calibration" />

      <div className="flex border-b border-border">
        {TAB_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex-1 py-3 text-xs transition-colors ${
              tab === i ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-primary'
            }`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 0 && <FoodLogSection user={user} />}
        {tab === 1 && <WeighInSection user={user} />}
        {tab === 2 && <FoodItemsSection />}
        {tab === 3 && <TrendSection user={user} />}
      </div>
    </div>
  );
}
