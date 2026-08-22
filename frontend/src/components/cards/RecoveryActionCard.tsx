import { RotateCw, Settings, History, Cpu, Check, Play, ShieldCheck } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { RecoveryAction } from '../../types';

interface RecoveryActionCardProps {
  action: RecoveryAction;
  priority: number;
  confidence: number;
  onApprove: (id: number) => void;
  onExecute: (id: number) => void;
  isExecuting: boolean;
}

export default function RecoveryActionCard({ 
  action, 
  priority, 
  confidence, 
  onApprove, 
  onExecute, 
  isExecuting 
}: RecoveryActionCardProps) {
  
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'restart':
        return <RotateCw className="w-5 h-5 text-brand-primary" />;
      case 'config':
      case 'configure':
        return <Settings className="w-5 h-5 text-brand-warning" />;
      case 'rollback':
        return <History className="w-5 h-5 text-brand-accent" />;
      default:
        return <Cpu className="w-5 h-5 text-brand-primary" />;
    }
  };

  return (
    <div
      className={`glass-card p-5 border transition-all duration-300 ${
        action.status === 'executed'
          ? 'border-brand-success/20 bg-brand-success/5'
          : action.status === 'approved'
          ? 'border-brand-primary/20 bg-brand-primary/5'
          : 'border-brand-border/30 bg-brand-dark/50'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-brand-darkest border border-brand-border/40 text-brand-primary text-xs font-mono font-extrabold">
            P{priority}
          </span>
          <div className="p-2 rounded-lg bg-brand-darkest border border-brand-border/30">
            {getTypeIcon(action.action_type)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white capitalize leading-none">
              {action.action_type} Service
            </h4>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">ACTION ID: #{action.id}</span>
          </div>
        </div>
        <StatusBadge value={action.status} />
      </div>

      <p className="text-sm text-slate-300 mt-4 leading-relaxed">
        {action.description}
      </p>

      {/* Details Row: Confidence */}
      <div className="mt-4 flex items-center gap-1.5 text-xs text-brand-success bg-brand-success/5 border border-brand-success/10 px-3 py-1.5 rounded-lg w-fit">
        <ShieldCheck className="w-4 h-4 text-brand-success" />
        <span className="font-semibold">Plan Confidence:</span>
        <span className="font-mono font-bold text-white">{confidence}%</span>
      </div>

      {/* Card Action Buttons */}
      <div className="mt-5 pt-4 border-t border-brand-border/20 flex gap-3 justify-end">
        {action.status === 'pending' && (
          <button
            onClick={() => onApprove(action.id)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-brand-primary/30 text-brand-primary bg-brand-primary/5 text-xs font-bold hover:bg-brand-primary/10 transition-all duration-200"
          >
            <Check className="w-3.5 h-3.5" />
            Approve Action
          </button>
        )}
        {action.status === 'approved' && (
          <button
            disabled={isExecuting}
            onClick={() => onExecute(action.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-brand-darkest bg-brand-primary text-xs font-bold hover:opacity-90 transition-all duration-200 glow-primary ${
              isExecuting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Execute Recovery
          </button>
        )}
        {action.status === 'executed' && (
          <div className="flex items-center gap-1 text-xs text-brand-success font-bold py-1">
            <Check className="w-4 h-4 stroke-[3px]" />
            Execution Succeeded
          </div>
        )}
      </div>
    </div>
  );
}
