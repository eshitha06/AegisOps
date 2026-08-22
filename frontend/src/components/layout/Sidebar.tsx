import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  BrainCircuit,
  TrendingUp,
  Shield,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/incidents', label: 'Incident Command', icon: AlertTriangle },
  { to: '/recommendations', label: 'AI Recommendations', icon: BrainCircuit },
  { to: '/predictions', label: 'Predictions', icon: TrendingUp },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-brand-dark/80 border-r border-brand-border/40 backdrop-blur-xl z-40 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-brand-border/30">
        <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Resilio
          </h1>
          <p className="text-[10px] font-medium text-brand-primary/80 uppercase tracking-widest">
            Observability Console
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-brand-card/60'
              }`
            }
          >
            <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-brand-border/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
          <span className="text-xs text-slate-500">System Online</span>
        </div>
        <p className="text-[10px] text-slate-600 mt-1">v1.0.0</p>
      </div>
    </aside>
  );
}
