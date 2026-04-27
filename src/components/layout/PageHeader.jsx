export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="px-4 pt-5 pb-3 flex items-end justify-between border-b border-border">
      <div>
        <h1 className="text-2xl font-bold tracking-widest uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.2em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="label-micro mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
