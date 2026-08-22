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
  const [error, setError] = useState<string | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchActions = async () => {
    try {
      const data = await api.getRecoveryActions();
      setActions(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch recovery actions:', err);
      setError('WAITING FOR LIVE RECOVERY DATA');
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
      const simulationSteps = result.log || [];

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
          Operator-controlled actions for active REAL incidents. Evidence, historical matches, Gemini analysis, and verification are shown only when recorded.
        </p>
      </div>

      {error && (
        <div className="border border-brand-danger/40 bg-brand-danger/10 p-3 font-mono text-xs text-brand-danger">
          {error}. This page retries automatically.
        </div>
      )}

      {/* Grid: Actions List & Terminal Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left column: Recovery Action Cards */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Recommended Actions
          </h3>

          <div className="space-y-4">
            {actions.map((action, index) => (
              <div key={action.id} className="space-y-0 border border-brand-border bg-brand-dark">
                <RecoveryActionCard action={action} priority={index + 1} onApprove={handleApprove} onExecute={handleExecute} isExecuting={isExecuting && executingId === action.id} />
                {(() => {
                  let evidence: any = null; let rca: any = null; let verification: any = null;
                  try { evidence = action.observed_evidence ? JSON.parse(action.observed_evidence) : null; } catch {}
                  try { rca = action.rca_result ? JSON.parse(action.rca_result) : null; } catch {}
                  try { verification = action.verification_result ? JSON.parse(action.verification_result) : null; } catch {}
                  return <div className="border-t border-brand-border bg-brand-darkest p-4 text-xs"><p className="section-label">Incident evidence</p><p className="mt-1 font-mono text-slate-300">#{action.incident_id} · {action.incident_service || 'NO DATA'} · {action.incident_title || 'NO DATA'}</p><p className="mt-2 text-slate-400">Gemini: {rca?.gemini?.status || 'NOT RUN'} · Historical matches: {evidence?.similar_resolved_incidents?.length ?? 0}</p><p className="mt-1 text-slate-400">Recommended: {rca?.ai_conclusion?.recommended_action || action.description}</p><p className="mt-1 text-slate-400">Execution: {action.status.toUpperCase()} · Verification: {verification ? (verification.healthy ? 'VERIFIED' : 'FAILED') : 'PENDING'}</p></div>;
                })()}
              </div>
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
