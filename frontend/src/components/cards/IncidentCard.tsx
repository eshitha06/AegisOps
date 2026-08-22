import { Server, Clock, Activity, Radio } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { Incident } from '../../types';

interface IncidentCardProps {
  incident: Incident;
  isSelected: boolean;
  onClick: () => void;
}

export default function IncidentCard({ incident, isSelected, onClick }: IncidentCardProps) {
  const isLiveActive = incident.live_condition === 'ACTIVE' && incident.status !== 'resolved';
  const critical = incident.status !== 'resolved' && (incident.severity === 'critical' || isLiveActive);

  const formatMetricPreview = () => {
    if (typeof incident.current_cpu_percent === 'number' && incident.current_cpu_percent > 10) {
      return `CPU: ${incident.current_cpu_percent.toFixed(1)}%`;
    }
    if (typeof incident.current_error_rate === 'number' && incident.current_error_rate > 0) {
      return `Err: ${incident.current_error_rate.toFixed(2)}/s`;
    }
    if (typeof incident.current_latency_ms === 'number' && incident.current_latency_ms > 200) {
      return `Lat: ${incident.current_latency_ms.toFixed(0)}ms`;
    }
    const cpu = typeof incident.current_cpu_percent === 'number' ? incident.current_cpu_percent : 0;
    return `CPU: ${cpu.toFixed(1)}%`;
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all cursor-pointer ${
        critical ? 'incident-critical' : ''
      } ${isSelected ? 'incident-selected' : ''} ${
        isSelected
          ? 'bg-brand-primary/10 border-brand-primary'
          : 'bg-brand-dark/60 border-brand-border/30 hover:border-brand-border/70 hover:bg-brand-card/40'
      }`}
    >
      {/* Top Header: Severity + Status + Live Condition */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge value={incident.severity} />
          <StatusBadge value={incident.status} />
        </div>

        {/* Live Condition Tag */}
        {isLiveActive ? (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-red-950/80 text-red-400 border border-red-500/50 live-active-indicator">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            LIVE: ACTIVE
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            LIVE: CLEARED
          </span>
        )}
      </div>

      {/* Incident Title */}
      <h4 className="text-sm font-bold text-white mt-3 leading-snug line-clamp-2">
        {incident.title}
      </h4>

      {/* Real-time Telemetry Snapshot & Health Bar */}
      <div className="mt-3 pt-2.5 border-t border-brand-border/20 grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Activity className="w-3 h-3 text-brand-primary" />
          <span>Live {formatMetricPreview()}</span>
        </div>
        <div className="flex items-center justify-end gap-1.5 text-slate-400">
          <Radio className="w-3 h-3 text-slate-500" />
          <span className={incident.current_service_state === 'HEALTHY' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
            {incident.current_service_state || 'HEALTHY'}
          </span>
        </div>
      </div>

      {/* Timestamps: Created vs Last Telemetry */}
      <div className="flex justify-between items-center mt-2.5 text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-1">
          <Server className="w-3 h-3 text-brand-primary" />
          <span className="text-slate-300">{incident.service}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>
            Created: {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
