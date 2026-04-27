export function TapSelector({ options, value, onChange, cols = 5 }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`tap-option${value === opt.value ? ' selected' : ''}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function RirSelector({ value, onChange }) {
  const options = [
    { label: '0', value: 0 },
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3+', value: 3 },
  ];
  return <TapSelector options={options} value={value} onChange={onChange} cols={4} />;
}

export function RatingSelector({ value, onChange }) {
  const options = [1, 2, 3, 4, 5].map(n => ({ label: String(n), value: n }));
  return <TapSelector options={options} value={value} onChange={onChange} cols={5} />;
}
