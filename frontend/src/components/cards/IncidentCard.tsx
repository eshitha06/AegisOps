import { Server, Clock } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { Incident } from '../../types';

interface IncidentCardProps {
  incident: Incident;
  isSelected: boolean;
  onClick: () => void;
}

export default function IncidentCard({ incident, isSelected, onClick }: IncidentCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'bg-brand-primary/10 border-brand-primary/40 shadow-lg glow-primary'
          : 'bg-brand-dark/50 border-brand-border/30 hover:border-brand-border/60 hover:bg-brand-card/30'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <StatusBadge value={incident.severity} />
        <StatusBadge value={incident.status} />
      </div>
      <h4 className="text-sm font-bold text-white mt-3 leading-snug line-clamp-2">
        {incident.title}
      </h4>
      <div className="flex justify-between items-center mt-4 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <Server className="w-3.5 h-3.5 text-brand-primary" />
          <span className="font-mono">{incident.service}</span>
        </div>
        <div className="flex items-center gap-1 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {new Date(incident.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
