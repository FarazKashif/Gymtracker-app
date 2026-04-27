import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/',          label: 'HOME',    glyph: '◎' },
  { to: '/session',   label: 'SESSION', glyph: '▶' },
  { to: '/planner',   label: 'PLAN',    glyph: '◧' },
  { to: '/diet',      label: 'DIET',    glyph: '◷' },
  { to: '/body',      label: 'BODY',    glyph: '→' },
  { to: '/log',       label: 'LOG',     glyph: '▪' },
  { to: '/analytics', label: 'STATS',   glyph: '∿' },
];

export function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}>
        {navItems.map(({ to, label, glyph }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive
                  ? 'text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`
            }
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{glyph}</span>
            <span style={{ fontSize: '0.5rem', letterSpacing: '0.15em', fontWeight: 600, fontFamily: 'Barlow Condensed, sans-serif' }}>
              {label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
