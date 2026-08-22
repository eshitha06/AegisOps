import { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import RecoveryActionCard from '../components/cards/RecoveryActionCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { api } from '../api/client';
import { RecoveryAction } from '../types';

export default function AIRecommendations() {
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchActions = async () => {
    try {
      const data = await api.getRecoveryActions();
      setActions(data);
    } catch (err) {
      console.error('Failed to fetch recovery actions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
    // Poll for recommendations
    const interval = setInterval(fetchActions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const handleApprove = async (id: number) => {
    try {
      const updated = await api.approveRecoveryAction(id);
      setActions(prev => prev.map(act => act.id === id ? updated : act));
      
      const timestamp = new Date().toLocaleTimeString();
      setTerminalLogs(prev => [
        ...prev,
        `[${timestamp}] APPROVAL GRANTED: SRE Operator approved Action #${id} (${updated.action_type.toUpperCase()})`
      ]);
    } catch (err: any) {
      console.error('Approve failed:', err);
      setTerminalLogs(prev => [...prev, `[ERROR] Approval failed for Action #${id}: ${err.message}`]);
    }
  };

  const handleExecute = async (id: number) => {
    const action = actions.find(a => a.id === id);
    if (!action || action.status !== 'approved' || isExecuting) return;

    setIsExecuting(true);
    setExecutingId(id);
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] EXECUTION START: Triggering Action #${id}...`
    ]);

    try {
      const result = await api.executeRecoveryAction(id);
      const simulationSteps = result.log || [
        `INITIATING RECOVERY ACTION #${id} - ${action.action_type.toUpperCase()}`,
        `Connecting to orchestration API...`,
        `Executing recovery script sequence...`,
        `Verifying service health checks...`,
        `RECOVERY COMPLETED SUCCESSFULLY. Incident status marked: RESOLVED.`
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < simulationSteps.length) {
          setTerminalLogs(prev => [
            ...prev,
            simulationSteps[currentStep]
          ]);
          currentStep++;
        } else {
          clearInterval(interval);
          setIsExecuting(false);
          setExecutingId(null);
          fetchActions();
        }
      }, 500);

    } catch (err: any) {
      console.error('Execution failed:', err);
      setTerminalLogs(prev => [
        ...prev,
        `[ERROR] Execution failed for Action #${id}: ${err.message}`
      ]);
      setIsExecuting(false);
      setExecutingId(null);
    }
  };

  if (loading && actions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
            {actions.map((action, index) => (
              <RecoveryActionCard
                key={action.id}
                action={action}
                priority={index + 1}
                confidence={92 + (action.id % 8)}
                onApprove={handleApprove}
                onExecute={handleExecute}
                isExecuting={isExecuting && executingId === action.id}
              />
            ))}
            {actions.length === 0 && (
              <p className="text-slate-500 text-sm font-mono py-4">No recommended actions generated.</p>
            )}
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
                    if (log.includes('SUCCESS') || log.includes('Success') || log.includes('COMPLETED') || log.includes('completed')) logColor = 'text-brand-success';
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
