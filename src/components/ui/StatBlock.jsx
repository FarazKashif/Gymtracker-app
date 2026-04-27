export function StatBlock({ label, value, unit, accent, className = '' }) {
  return (
    <div className={`stat-block ${className}`}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent ? 'text-accent' : ''}`}>
        {value}
        {unit && <span className="stat-unit ml-1">{unit}</span>}
      </span>
    </div>
  );
}
