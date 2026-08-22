import { Search } from 'lucide-react';
import { useTelemetryMode } from '../../context/TelemetryModeContext';

export default function TopBar() {
  const { mode, setMode } = useTelemetryMode();
  return (
    <header className="sticky top-0 z-30 h-16 bg-brand-dark border-b border-brand-border flex items-center justify-between px-8">
      {/* Search */}
      <div className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-md px-4 py-2 w-80 focus-within:border-brand-primary">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search services, incidents..."
          className="bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none w-full"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-5">
        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-brand-border bg-brand-card p-0.5 text-xs font-medium">
            {(['real', 'demo'] as const).map((option) => (
              <button key={option} onClick={() => setMode(option)} className={`rounded px-2.5 py-1.5 uppercase ${mode === option ? 'bg-brand-primary text-white' : 'text-slate-400'}`}>
                {option}
              </button>
            ))}
          </div>
          <div className="w-9 h-9 rounded-md bg-brand-primary flex items-center justify-center text-white text-sm font-bold">
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
