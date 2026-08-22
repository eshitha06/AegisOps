import { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Play, 
  CheckCircle2, 
  Server, 
  Sparkles, 
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
  Cpu,
  HardDrive,
  Clock,
  AlertTriangle,
  Database,
  Users,
  FileText,
  Activity
} from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import IncidentCard from '../components/cards/IncidentCard';
import useIncidents from '../hooks/useIncidents';
import { api } from '../api/client';
import { Incident, RecoveryAction } from '../types';

export default function IncidentCommand() {
  const { incidents, loading, error, refresh } = useIncidents(undefined, 3000);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Incident | null>(null);
  const [rcaRunning, setRcaRunning] = useState<boolean>(false);
  const [activeRcaResult, setActiveRcaResult] = useState<any>(null);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([]);
  const [isExecutingAction, setIsExecutingAction] = useState<boolean>(false);
  const [showRawEvidence, setShowRawEvidence] = useState<boolean>(false);

  // Authoritative failure injector control plane state
  const [failureState, setFailureState] = useState<Record<string, boolean> | null>(null);
  const [injectorOnline, setInjectorOnline] = useState<boolean>(true);
  const [injectorLastUpdated, setInjectorLastUpdated] = useState<string | null>(null);
  const [injectingKind, setInjectingKind] = useState<string | null>(null);

  const fetchFailureState = async () => {
    try {
      const state = await api.getFailureState();
      setFailureState(state);
      setInjectorOnline(true);
      setInjectorLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setInjectorOnline(false);
      setFailureState(null);
    }
  };

  useEffect(() => {
    fetchFailureState();
    const interval = setInterval(fetchFailureState, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerFailure = async (kind: 'cpu' | 'memory' | 'latency' | 'errors' | 'database' | 'worker') => {
    setInjectingKind(kind);
    try {
      await api.triggerFailure(kind);
      await fetchFailureState();
      setTimeout(refresh, 1000);
    } catch (err) {
      console.error('Trigger failure failed:', err);
    } finally {
      setInjectingKind(null);
    }
  };

  const handleRecoverAll = async () => {
    setInjectingKind('recover');
    try {
      await api.recoverFailure('all');
      await fetchFailureState();
      setTimeout(refresh, 1000);
    } catch (err) {
      console.error('Recover failed:', err);
    } finally {
      setInjectingKind(null);
    }
  };

  // Auto-select the first incident if nothing is selected yet
  useEffect(() => {
    if (incidents.length > 0 && selectedId === null) {
      setSelectedId(incidents[0].id);
    }
  }, [incidents, selectedId]);

  const selectedSummary = incidents.find(inc => inc.id === selectedId) || null;
  // Keep operational fields from the regularly refreshed summary while keeping
  // the selected incident's full evidence payload for investigation.
  const selectedIncident = selectedSummary && selectedDetail?.id === selectedId
    ? {
        ...selectedDetail,
        ...selectedSummary,
        observed_evidence: selectedDetail.observed_evidence,
        rca_result: selectedDetail.rca_result,
        resolution: selectedDetail.resolution,
      }
    : selectedSummary;

  // The list endpoint carries only current live summaries. Load the full
  // evidence/RCA payload for the selected incident without blocking the page.
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    let active = true;
    api.getIncident(selectedId)
      .then((incident) => {
        if (active) setSelectedDetail(incident);
      })
      .catch((err) => {
        console.error('Incident detail fetch failed:', err);
        if (active) setSelectedDetail(null);
      });
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const fetchRecovery = () => 
      api.getRecoveryActions(selectedId)
        .then(setRecoveryActions)
        .catch(() => setRecoveryActions([]));

    fetchRecovery();
    const interval = setInterval(fetchRecovery, 2000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const handleRunRCA = async (id: number) => {
    setRcaRunning(true);
    setActiveRcaResult(null);
    try {
      const result = await api.runRCA(id);
      setActiveRcaResult(result);
      refresh();
    } catch (err) {
      console.error('RCA running failed:', err);
    } finally {
      setRcaRunning(false);
    }
  };

  const handleApproveAndExecute = async (actionId: number) => {
    setIsExecutingAction(true);
    try {
      await api.approveRecoveryAction(actionId);
      await api.executeRecoveryAction(actionId);
      const actions = await api.getRecoveryActions(selectedIncident!.id);
      setRecoveryActions(actions);
      await fetchFailureState();
      refresh();
    } catch (err) {
      console.error('Recovery execution failed:', err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Determine RCA, Evidence, and Recovery state
  const storedRca = (() => { 
    try { 
      return selectedIncident?.rca_result ? JSON.parse(selectedIncident.rca_result) : null; 
    } catch { return null; } 
  })();

  const rca = activeRcaResult || storedRca;
  const evidence = rca?.observed_evidence || (() => { 
    try { 
      return selectedIncident?.observed_evidence ? JSON.parse(selectedIncident.observed_evidence) : null; 
    } catch { return null; } 
  })();

  const latestRecovery = recoveryActions[recoveryActions.length - 1];

  const rootCause = rca?.ai_conclusion?.root_cause || selectedIncident?.root_cause || '';
  const recommendedAction = rca?.ai_conclusion?.recommended_action || (latestRecovery?.description) || '';
  const whyRecommended = rca?.ai_conclusion?.why_recommended || rca?.ai_conclusion?.reasoning || 'NO RECORDED AI RATIONALE';
  const rawEvidenceUsed = rca?.ai_conclusion?.evidence_used;
  const evidenceUsedList = Array.isArray(rawEvidenceUsed)
    ? rawEvidenceUsed
    : (typeof rawEvidenceUsed === 'string' ? [rawEvidenceUsed] : []);
  const confidence = rca?.ai_conclusion?.confidence ?? selectedIncident?.confidence_score ?? null;

  const isLiveActive = selectedIncident?.live_condition === 'ACTIVE' && selectedIncident?.status !== 'resolved';

  // Metrics comparison helper
  const incCpu = (typeof selectedIncident?.incident_cpu_percent === 'number')
    ? `${selectedIncident.incident_cpu_percent.toFixed(1)}%` 
    : (typeof evidence?.incident_metric?.cpu === 'number' ? `${(evidence.incident_metric.cpu * (evidence.incident_metric.cpu <= 1 ? 100 : 1)).toFixed(1)}%` : 'NO DATA');
  
  const curCpu = (typeof selectedIncident?.current_cpu_percent === 'number')
    ? `${selectedIncident.current_cpu_percent.toFixed(1)}%` 
    : 'NO DATA';

  const incLatency = (typeof selectedIncident?.incident_latency_ms === 'number')
    ? `${selectedIncident.incident_latency_ms.toFixed(0)} ms`
    : (typeof evidence?.incident_metric?.latency_ms === 'number' ? `${evidence.incident_metric.latency_ms.toFixed(0)} ms` : 'NO DATA');

  const curLatency = (typeof selectedIncident?.current_latency_ms === 'number')
    ? `${selectedIncident.current_latency_ms.toFixed(1)} ms`
    : 'NO DATA';

  const incTimestamp = selectedIncident?.created_at 
    ? new Date(selectedIncident.created_at).toLocaleTimeString() 
    : 'NO DATA';

  const curTimestamp = selectedIncident?.last_telemetry_time 
    ? new Date(selectedIncident.last_telemetry_time).toLocaleTimeString() 
    : 'NO DATA';

  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && incidents.length === 0) {
    return (
      <div className="glass-card p-6 min-h-[280px] flex flex-col justify-center gap-3">
        <h2 className="font-mono text-base font-bold text-red-400">INCIDENT DATA UNAVAILABLE</h2>
        <p className="font-mono text-xs text-slate-400">WAITING FOR LIVE RESILIO TELEMETRY. The page will retry automatically.</p>
        <button onClick={refresh} className="w-fit border border-brand-primary/60 px-3 py-2 text-xs font-mono text-brand-primary hover:bg-brand-primary/10">RETRY</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white text-glow-red" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Incident Command Center
          </h2>
          <p className="text-slate-400 mt-1">
            Real-time synchronization between live demo-env telemetry, root cause analysis, and verified remediation.
          </p>
        </div>
      </div>

      {/* Authoritative Failure Injector Control Panel */}
      <div className="glass-card p-5 rounded-xl border border-brand-border/40 bg-brand-dark/80">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-brand-border/30">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-primary" />
            <span className="text-sm font-mono font-bold uppercase tracking-wider text-white">
              AUTHORITATIVE DEMO FAILURE INJECTOR CONTROL PLANE
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            {injectorOnline ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                INJECTOR STATUS: ONLINE (demo-failure-injector)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/80 text-red-400 border border-red-800/60">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                INJECTOR OFFLINE
              </span>
            )}
            <span className="text-slate-400">
              Last updated: <strong className="text-slate-200">{injectorLastUpdated || 'N/A'}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          <button
            disabled={!injectorOnline || injectingKind !== null}
            onClick={() => handleTriggerFailure('cpu')}
            className={`px-3 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all border ${
              failureState?.cpu
                ? 'bg-red-950 text-red-300 border-red-500 live-active-indicator'
                : 'bg-brand-darkest/70 text-slate-300 border-brand-border/40 hover:border-red-500/60 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            CPU Stress {failureState?.cpu ? '(ON)' : '(OFF)'}
          </button>

          <button
            disabled={!injectorOnline || injectingKind !== null}
            onClick={() => handleTriggerFailure('memory')}
            className={`px-3 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all border ${
              failureState?.memory
                ? 'bg-red-950 text-red-300 border-red-500 live-active-indicator'
                : 'bg-brand-darkest/70 text-slate-300 border-brand-border/40 hover:border-red-500/60 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Memory {failureState?.memory ? '(ON)' : '(OFF)'}
          </button>

          <button
            disabled={!injectorOnline || injectingKind !== null}
            onClick={() => handleTriggerFailure('latency')}
            className={`px-3 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all border ${
              failureState?.latency
                ? 'bg-red-950 text-red-300 border-red-500 live-active-indicator'
                : 'bg-brand-darkest/70 text-slate-300 border-brand-border/40 hover:border-red-500/60 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Latency {failureState?.latency ? '(ON)' : '(OFF)'}
          </button>

          <button
            disabled={!injectorOnline || injectingKind !== null}
            onClick={() => handleTriggerFailure('errors')}
            className={`px-3 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all border ${
              failureState?.errors
                ? 'bg-red-950 text-red-300 border-red-500 live-active-indicator'
                : 'bg-brand-darkest/70 text-slate-300 border-brand-border/40 hover:border-red-500/60 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            HTTP Errors {failureState?.errors ? '(ON)' : '(OFF)'}
          </button>

          <button
            disabled={!injectorOnline || injectingKind !== null}
            onClick={() => handleTriggerFailure('database')}
            className={`px-3 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all border ${
              failureState?.database
                ? 'bg-red-950 text-red-300 border-red-500 live-active-indicator'
                : 'bg-brand-darkest/70 text-slate-300 border-brand-border/40 hover:border-red-500/60 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Database {failureState?.database ? '(ON)' : '(OFF)'}
          </button>

          <button
            disabled={!injectorOnline || injectingKind !== null}
            onClick={() => handleTriggerFailure('worker')}
            className={`px-3 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all border ${
              failureState?.worker
                ? 'bg-red-950 text-red-300 border-red-500 live-active-indicator'
                : 'bg-brand-darkest/70 text-slate-300 border-brand-border/40 hover:border-red-500/60 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Worker {failureState?.worker ? '(ON)' : '(OFF)'}
          </button>

          <button
            disabled={!injectorOnline || injectingKind !== null}
            onClick={handleRecoverAll}
            className="px-3 py-2.5 rounded-lg text-xs font-mono font-black bg-emerald-950 text-emerald-300 border border-emerald-500/60 hover:bg-emerald-900 hover:text-white flex items-center justify-center gap-1.5 transition-all col-span-2 sm:col-span-1 shadow-sm hover:shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Recover All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Incidents List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Active Alerts ({incidents.filter(i => i.status !== 'resolved').length})
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Auto-synced</span>
          </div>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {incidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                isSelected={incident.id === selectedId}
                onClick={() => {
                  setSelectedId(incident.id);
                  setActiveRcaResult(null);
                }}
              />
            ))}
            {incidents.length === 0 && (
              <div className="glass-card p-6 text-center text-slate-500 text-sm font-mono">
                ✓ Zero incidents logged. All services healthy.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Incident Details, Dual Snapshot, Resolution & Evidence UI */}
        <div className="lg:col-span-8">
          {selectedIncident ? (
            <div className="glass-card p-6 min-h-[550px] flex flex-col space-y-6">
              {/* Incident Header & Live Condition Indicator */}
              <div className="border-b border-brand-border/40 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertOctagon className={`w-7 h-7 ${isLiveActive ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                    <div>
                      <h3 className="text-xl font-bold text-white leading-tight font-mono">
                        INCIDENT-{selectedIncident.id}: {selectedIncident.service.toUpperCase()}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Created: {new Date(selectedIncident.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Live Condition Pill */}
                    {isLiveActive ? (
                      <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-black uppercase bg-red-950/90 text-red-400 border border-red-500/60 live-active-indicator">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        LIVE CONDITION: ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-700/50">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        LIVE CONDITION: CLEARED
                      </span>
                    )}

                    <StatusBadge value={selectedIncident.severity} />
                    <StatusBadge value={selectedIncident.status} />
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-lg bg-brand-darkest/70 border border-brand-border/40">
                  <p className="text-sm font-semibold text-slate-200">
                    {selectedIncident.title}
                  </p>
                </div>
              </div>

              {/* Section 2: Side-by-Side Snapshot Distinction (INCIDENT SNAPSHOT vs CURRENT LIVE TELEMETRY) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel A: Historical Incident Snapshot */}
                <div className="p-4 rounded-xl border border-red-900/40 bg-red-950/20 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        INCIDENT SNAPSHOT
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">At Failure</span>
                    </div>
                    <div className="space-y-1.5 mt-2 font-mono text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">CPU:</span>
                        <span className="text-red-400 font-bold">{incCpu}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Latency:</span>
                        <span className="text-red-400 font-bold">{incLatency}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Timestamp:</span>
                        <span className="text-slate-300 font-semibold">{incTimestamp}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-red-900/30">
                    Authoritative snapshot recorded when anomaly threshold was crossed.
                  </p>
                </div>

                {/* Panel B: Current Live Telemetry */}
                <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/15 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        CURRENT LIVE TELEMETRY
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {selectedIncident.current_service_state || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="space-y-1.5 mt-2 font-mono text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">CPU:</span>
                        <span className="text-emerald-400 font-bold">{curCpu}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Latency:</span>
                        <span className="text-emerald-400 font-bold">{curLatency}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Timestamp:</span>
                        <span className="text-slate-300 font-semibold">{curTimestamp}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-emerald-900/30">
                    Live Prometheus metrics ingested right now by Resilio REAL.
                  </p>
                </div>
              </div>

              {/* Section 3: Visible 9-Step Lineage */}
              <div className="p-4 rounded-xl border border-brand-border/40 bg-brand-darkest/60 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    SYSTEM DATA LINEAGE & AUDIT CHAIN
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Traceable</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <div className="px-2.5 py-1 rounded bg-brand-dark border border-brand-border/40 text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>FAILURE INJECTOR</span>
                  </div>
                  <span className="text-slate-600">→</span>

                  <div className="px-2.5 py-1 rounded bg-brand-dark border border-brand-border/40 text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>DEMO-ENV ({selectedIncident.service})</span>
                  </div>
                  <span className="text-slate-600">→</span>

                  <div className="px-2.5 py-1 rounded bg-brand-dark border border-brand-border/40 text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>PROMETHEUS (9090)</span>
                  </div>
                  <span className="text-slate-600">→</span>

                  <div className="px-2.5 py-1 rounded bg-brand-dark border border-brand-border/40 text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>RESILIO REAL</span>
                  </div>
                  <span className="text-slate-600">→</span>

                  <div className="px-2.5 py-1 rounded bg-brand-dark border border-brand-border/40 text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>ANOMALY</span>
                  </div>
                  <span className="text-slate-600">→</span>

                  <div className="px-2.5 py-1 rounded bg-brand-dark border border-brand-border/40 text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>INCIDENT-{selectedIncident.id}</span>
                  </div>
                  <span className="text-slate-600">→</span>

                  <div className="px-2.5 py-1 rounded bg-brand-dark border border-brand-border/40 text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>GEMINI RCA</span>
                  </div>
                  <span className="text-slate-600">→</span>

                  <div className="px-2.5 py-1 rounded bg-brand-dark border border-brand-border/40 text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>RECOVERY</span>
                  </div>
                  <span className="text-slate-600">→</span>

                  <div className="px-2.5 py-1 rounded bg-brand-dark border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>VERIFICATION</span>
                  </div>
                </div>
              </div>

              {/* Section 4: RECOMMENDED RESOLUTION (Dedicated Prominent Box) */}
              <div className="resolution-box rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-red-500/30 pb-3">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-base">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    <span className="tracking-wide uppercase font-mono">RECOMMENDED RESOLUTION</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Confidence: {typeof confidence === 'number' ? `${(confidence * 100).toFixed(0)}%` : 'NO DATA'}</span>
                </div>

                <div className="space-y-4">
                  {/* 1. Root Cause */}
                  <div>
                    <span className="section-label text-red-400">1. ROOT CAUSE</span>
                    <p className="text-sm text-white font-medium mt-1 leading-relaxed">
                      {rootCause || 'NO RECORDED RCA'}
                    </p>
                  </div>

                  {/* 2. Evidence */}
                  <div>
                    <span className="section-label text-slate-400">2. OBSERVED EVIDENCE</span>
                    <ul className="mt-1 space-y-1 text-xs text-slate-300 font-mono">
                      {evidenceUsedList.map((evItem: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span>{evItem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. Recommended Action */}
                  <div>
                    <span className="section-label text-red-400">3. RECOMMENDED ACTION</span>
                    <p className="text-sm font-bold text-white mt-1">
                      {recommendedAction || 'NO RECORDED RECOMMENDATION'}
                    </p>
                  </div>

                  {/* 4. Why this action is recommended */}
                  <div>
                    <span className="section-label text-slate-400">4. WHY THIS ACTION IS RECOMMENDED</span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {whyRecommended}
                    </p>
                  </div>
                </div>

                {/* 5. Execute Recovery Action Button */}
                <div className="pt-4 border-t border-red-500/20 flex flex-wrap items-center justify-between gap-4">
                  {latestRecovery && latestRecovery.status !== 'executed' ? (
                    <button
                      disabled={isExecutingAction}
                      onClick={() => handleApproveAndExecute(latestRecovery.id)}
                      className={`btn-recovery-red px-6 py-2.5 rounded-xl text-white text-xs font-mono font-extrabold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all ${
                        isExecutingAction ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isExecutingAction ? <LoadingSpinner size="sm" /> : <Play className="w-4 h-4 fill-current" />}
                      [ EXECUTE RECOVERY ]
                    </button>
                  ) : selectedIncident.status !== 'resolved' ? (
                    <button
                      disabled={rcaRunning}
                      onClick={() => handleRunRCA(selectedIncident.id)}
                      className="primary-action px-6 py-2.5 rounded-xl bg-brand-primary text-brand-darkest text-xs font-mono font-extrabold tracking-wider uppercase flex items-center gap-2 cursor-pointer"
                    >
                      {rcaRunning ? <LoadingSpinner size="sm" /> : <RotateCcw className="w-4 h-4" />}
                      Run AI RCA & Generate Action
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      RECOVERY EXECUTED & VERIFIED
                    </div>
                  )}

                  {latestRecovery && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Action Status: <strong className="text-white uppercase">{latestRecovery.status}</strong>
                    </span>
                  )}
                </div>

                {/* 6. Post-Recovery Verification Status Breakdown */}
                {selectedIncident.status === 'resolved' || latestRecovery?.status === 'executed' ? (
                  <div className="mt-4 pt-4 border-t border-emerald-500/30 bg-emerald-950/20 p-4 rounded-lg">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-3">
                      RECOVERY VERIFICATION
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="flex items-center gap-2 text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>demo-env <strong className="text-emerald-400">✓ HEALTHY</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Prometheus <strong className="text-emerald-400">✓ HEALTHY</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Telemetry <strong className="text-emerald-400">✓ FRESH</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Anomaly <strong className="text-emerald-400">✓ CLEARED</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Resilio <strong className="text-emerald-400">✓ VERIFIED</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">★</span>
                        <span>FINAL: <strong className="text-emerald-400">RESOLVED</strong></span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Section 5: OBSERVED EVIDENCE, AI INVESTIGATION & DATA PROVENANCE (Stacked Full-Width Layout, Zero Overlap) */}
              <div className="space-y-4 pt-2">
                {/* 1. OBSERVED EVIDENCE */}
                <div className="rounded-xl border border-brand-border/40 bg-brand-darkest/70 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-brand-border/30 pb-2.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      OBSERVED EVIDENCE
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Source: demo-env health probes</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Target Service</span>
                      <span className="text-white font-bold text-sm">{selectedIncident.service}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Live Condition</span>
                      <span className={`text-sm font-bold ${isLiveActive ? 'text-red-400' : 'text-emerald-400'}`}>
                        {selectedIncident.live_condition || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Service Health Check</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {typeof evidence?.service_health?.[selectedIncident.service]?.status_code === 'number'
                          ? `HTTP ${evidence.service_health[selectedIncident.service].status_code}`
                          : 'NO DATA'}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">PostgreSQL Database</span>
                      <span className="text-slate-200 font-bold text-sm">
                        {evidence?.service_health?.[selectedIncident.service]?.body?.database ?? 'NO DATA'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. AI INVESTIGATION */}
                <div className="rounded-xl border border-brand-border/40 bg-brand-darkest/70 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-brand-border/30 pb-2.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      AI INVESTIGATION
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Source: Gemini RCA Engine</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">AI Model</span>
                      <span className="text-white font-bold text-sm">{rca?.gemini?.model || 'NOT RUN'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Inference Status</span>
                      <span className="text-emerald-400 font-bold text-sm uppercase">
                        {rca?.gemini?.status || 'NOT RUN'}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Confidence</span>
                      <span className="text-white font-bold text-sm">{typeof confidence === 'number' ? `${(confidence * 100).toFixed(0)}%` : 'NO DATA'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Timeline Events</span>
                      <span className="text-slate-200 font-bold text-sm">
                        {rca?.investigation_timeline?.length ?? 'NO DATA'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. DATA PROVENANCE */}
                <div className="rounded-xl border border-brand-border/40 bg-brand-darkest/70 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-brand-border/30 pb-2.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      DATA PROVENANCE
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Source: Prometheus & Failure Injector</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Prometheus Scrape</span>
                      <span className="text-slate-200 font-bold text-sm">{evidence?.prometheus?.target_health ?? 'NO DATA'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Telemetry Collector</span>
                      <span className="text-slate-200 font-bold text-sm">Resilio REAL Ingestion</span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Failure Injector Flag</span>
                      <span className={`text-sm font-bold ${failureState?.cpu ? 'text-red-400' : 'text-slate-200'}`}>
                        {failureState ? (failureState.cpu ? 'CPU: active' : 'All flags inactive') : 'NO DATA'}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark/50 border border-brand-border/20">
                      <span className="text-slate-500 block text-[10px] uppercase">Telemetry Origin</span>
                      <span className="text-slate-200 font-bold text-sm">{evidence?.dataset?.name ?? 'NO DATA'}</span>
                    </div>
                  </div>
                </div>

                {/* Expandable Raw Evidence JSON Box */}
                <div className="rounded-xl border border-brand-border/30 bg-brand-darkest/40 p-4">
                  <button
                    onClick={() => setShowRawEvidence(!showRawEvidence)}
                    className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-white transition-colors"
                  >
                    <span className="font-bold">VIEW COMPLETE JSON EVIDENCE PAYLOAD</span>
                    {showRawEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showRawEvidence && (
                    <div className="mt-3 pt-3 border-t border-brand-border/20">
                      <pre className="p-4 rounded-lg bg-black/90 border border-brand-border/30 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-80 leading-relaxed break-words whitespace-pre-wrap">
                        {JSON.stringify(evidence, null, 2) || 'No evidence payload stored.'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 min-h-[550px] flex flex-col justify-between space-y-6">
              <div className="border-b border-brand-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <Server className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white font-mono">CLUSTER OPERATIONAL STATUS</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Continuous automated telemetry surveillance active.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl border border-brand-border/30 bg-brand-darkest/60">
                  <span className="text-slate-500 block text-[10px] uppercase">Telemetry Stream</span>
                  <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE (Prometheus)
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-brand-border/30 bg-brand-darkest/60">
                  <span className="text-slate-500 block text-[10px] uppercase">Active Alerts</span>
                  <span className="text-white font-bold text-sm mt-1 block">
                    {incidents.filter(i => i.status !== 'resolved').length} Open
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-brand-border/30 bg-brand-darkest/60">
                  <span className="text-slate-500 block text-[10px] uppercase">Failure Injector</span>
                  <span className="text-emerald-400 font-bold text-sm mt-1 block">
                    {injectorOnline ? 'READY / ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-brand-border/30 bg-brand-darkest/40 text-center space-y-2">
                <p className="text-slate-300 font-mono text-xs">
                  All services are operating within normal SLO baseline thresholds.
                </p>
                <p className="text-slate-500 font-mono text-[11px]">
                  Use the Authoritative Failure Injector above to simulate a fault and observe live incident triage.
                </p>
              </div>

              <div className="text-[10px] font-mono text-slate-500 text-center">
                System synchronized with demo-env (:8000, :8001), PostgreSQL (:5432), and Prometheus (:9090).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
