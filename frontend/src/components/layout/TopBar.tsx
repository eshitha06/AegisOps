import { Bell, Search } from 'lucide-react';
import { useTelemetryMode } from '../../context/TelemetryModeContext';

export default function TopBar() {
  const { mode, setMode } = useTelemetryMode();
  return (
    <header className="sticky top-0 z-30 h-16 bg-brand-dark/60 border-b border-brand-border/30 backdrop-blur-xl flex items-center justify-between px-8">
      {/* Search */}
      <div className="flex items-center gap-3 bg-brand-card/60 border border-brand-border/30 rounded-xl px-4 py-2 w-80 transition-all duration-200 focus-within:border-brand-primary/40 focus-within:glow-primary">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search services, incidents..."
          className="bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none w-full"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-5">
        {/* Notification Bell */}
        <button className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-brand-card/60 transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-danger rounded-full border-2 border-brand-dark animate-pulse" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-brand-border bg-brand-card p-0.5 text-xs font-medium">
            {(['real', 'demo'] as const).map((option) => (
              <button key={option} onClick={() => setMode(option)} className={`rounded px-2.5 py-1.5 uppercase ${mode === option ? 'bg-brand-primary text-white' : 'text-slate-400'}`}>
                {option}
              </button>
            ))}
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white text-sm font-bold">
            SRE
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-slate-200">SRE Operator</p>
            <p className="text-[11px] text-slate-500">On-Call</p>
          </div>
        </div>
      </div>
    </header>
  );
}
