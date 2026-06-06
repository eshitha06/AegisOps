import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Check, 
  Terminal, 
  RotateCw, 
  Settings, 
  History, 
  Cpu
} from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';

interface RecoveryAction {
  id: number;
  priority: number;
  type: 'restart' | 'scale' | 'rollback' | 'config';
  description: string;
  confidence: number;
  status: 'pending' | 'approved' | 'executed' | 'failed';
}

const initialActions: RecoveryAction[] = [
  {
    id: 1,
    priority: 1,
    type: 'restart',
    description: 'Restart payment-service containers to release hung connections and reset client backoff.',
    confidence: 94,
    status: 'pending'
  },
  {
    id: 2,
    priority: 2,
    type: 'config',
    description: 'Increase payment-service PostgreSQL connection pool size limit from 10 to 50.',
    confidence: 88,
    status: 'pending'
  },
  {
    id: 3,
    priority: 3,
    type: 'rollback',
    description: 'Rollback payment-service deployment v2.3 to stable release v2.2.',
    confidence: 85,
    status: 'pending'
  }
];

export default function AIRecommendations() {
  const [actions, setActions] = useState<RecoveryAction[]>(initialActions);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executingId, setExecutingId] = useState<number | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const handleApprove = (id: number) => {
    setActions(prev => prev.map(act => 
      act.id === id ? { ...act, status: 'approved' } : act
    ));
    
    // Add to terminal logs
    const action = actions.find(a => a.id === id);
    if (action) {
      const timestamp = new Date().toLocaleTimeString();
      setTerminalLogs(prev => [
        ...prev,
        `[${timestamp}] APPROVAL GRANTED: SRE Operator approved Action #${id} (${action.type.toUpperCase()})`
      ]);
    }
  };

  const handleExecute = (id: number) => {
    const action = actions.find(a => a.id === id);
    if (!action || action.status !== 'approved' || isExecuting) return;

    setIsExecuting(true);
    setExecutingId(id);

    const simulationSteps = [
      `INITIATING RECOVERY ACTION #${id} - ${action.type.toUpperCase()}`,
      `Connecting to Kubernetes orchestration API at cluster-prod-01...`,
      `Validating deployment state for service: payment-service...`,
      `Locating pods matching label app=payment-service...`,
      `Terminating pod payment-service-7dcf56d98c-x8j2l (Graceful shutdown)...`,
      `Provisioning new pod payment-service-7dcf56d98c-m4np9...`,
      `Streaming health checks to new container instances...`,
      `Probe status: HTTP GET http://payment-service/health [Attempt 1]: Failed (ECONNREFUSED)`,
      `Probe status: HTTP GET http://payment-service/health [Attempt 2]: Success (200 OK)`,
      `Rerouting active gateway traffic to refreshed instances...`,
      `Metric snapshot verification: db_connection_count = 8/50 (Normal limits)`,
      `RECOVERY COMPLETED SUCCESSFULLY. Incident status marked: RESOLVED.`
    ];

    let currentStep = 0;
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] EXECUTION START: Triggering Action #${id}...`
    ]);

    const interval = setInterval(() => {
      if (currentStep < simulationSteps.length) {
        const timestamp = new Date().toLocaleTimeString();
        setTerminalLogs(prev => [
          ...prev,
          `[${timestamp}] ${simulationSteps[currentStep]}`
        ]);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsExecuting(false);
        setExecutingId(null);
        setActions(prev => prev.map(act => 
          act.id === id ? { ...act, status: 'executed' } : act
        ));
      }
    }, 800);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'restart': return <RotateCw className="w-5 h-5 text-brand-primary" />;
      case 'config': return <Settings className="w-5 h-5 text-brand-warning" />;
      case 'rollback': return <History className="w-5 h-5 text-brand-accent" />;
      default: return <Cpu className="w-5 h-5 text-brand-primary" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
          AI Recovery Recommendations
        </h2>
        <p className="text-slate-400 mt-1">
          Approve and execute AI-generated recovery plans. Review step-by-step action details and real-time execution logs.
        </p>
      </div>

      {/* Grid: Actions List & Terminal Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left column: Recovery Action Cards */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Recommended Actions
          </h3>

          <div className="space-y-4">
            {actions.map((action) => (
              <div 
                key={action.id}
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
                    <span className="w-8 h-8 rounded-lg bg-brand-darkest border border-brand-border/40 text-brand-primary text-sm font-extrabold flex items-center justify-center font-mono">
                      {action.priority}
                    </span>
                    <div className="p-2 rounded-lg bg-brand-darkest border border-brand-border/30">
                      {getTypeIcon(action.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white capitalize">
                        {action.type} Service
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">CONFIDENCE: {action.confidence}%</p>
                    </div>
                  </div>
                  <StatusBadge value={action.status} />
                </div>

                <p className="text-sm text-slate-300 mt-4 leading-relaxed">
                  {action.description}
                </p>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-4 border-t border-brand-border/20 flex gap-3 justify-end">
                  {action.status === 'pending' && (
                    <button
                      onClick={() => handleApprove(action.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-brand-primary/30 text-brand-primary bg-brand-primary/5 text-xs font-bold hover:bg-brand-primary/10 transition-all duration-200"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Action
                    </button>
                  )}
                  {action.status === 'approved' && (
                    <button
                      disabled={isExecuting}
                      onClick={() => handleExecute(action.id)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-brand-darkest bg-brand-primary text-xs font-bold hover:opacity-90 transition-all duration-200 glow-primary ${
                        isExecuting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {executingId === action.id ? 'Executing...' : 'Execute Recovery'}
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
            ))}
          </div>
        </div>

        {/* Right column: Execution Terminal */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Execution Console Logs
          </h3>
          <div className="bg-brand-darkest border border-brand-border/60 rounded-xl overflow-hidden shadow-2xl glow-primary">
            {/* Terminal Header */}
            <div className="bg-brand-dark border-b border-brand-border/40 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-brand-primary" />
                <span className="text-xs font-bold text-slate-300 font-mono">recovery-agent@aegisops:~</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-danger/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-brand-warning/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-brand-success/40" />
              </div>
            </div>
            {/* Terminal Content */}
            <div className="p-4 h-[350px] overflow-y-auto font-mono text-xs text-brand-primary space-y-2.5 bg-black/90 selection:bg-brand-primary/20 selection:text-white">
              {terminalLogs.length === 0 ? (
                <div className="text-slate-600 flex flex-col justify-center items-center h-full text-center">
                  <Terminal className="w-10 h-10 mb-2 stroke-[1.5]" />
                  <span>Waiting for operator approval and command execution...</span>
                </div>
              ) : (
                <>
                  {terminalLogs.map((log, index) => {
                    let logColor = 'text-brand-primary';
                    if (log.includes('ERROR') || log.includes('Failed')) logColor = 'text-brand-danger';
                    if (log.includes('SUCCESS') || log.includes('Success') || log.includes('COMPLETED')) logColor = 'text-brand-success';
                    if (log.includes('APPROVAL') || log.includes('INITIATING')) logColor = 'text-brand-warning';
                    
                    return (
                      <div key={index} className={`${logColor} leading-relaxed break-all`}>
                        {log}
                      </div>
                    );
                  })}
                  {isExecuting && (
                    <div className="flex items-center gap-2 text-brand-primary animate-pulse mt-2">
                      <span className="w-1.5 h-3 bg-brand-primary animate-ping" />
                      <span>Processing command line execution sequence...</span>
                    </div>
                  )}
                  <div ref={terminalEndRef} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
